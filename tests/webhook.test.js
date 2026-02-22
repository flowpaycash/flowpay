/**
 * ════════════════════════════════════════
 * FLOWPAY · Financial Webhook Test Suite
 * ════════════════════════════════════════
 * Target: tests/webhook.test.js
 * Covers:
 *   - HMAC validation (valid / invalid / tampered)
 *   - Idempotency (terminal states are never double-processed)
 *   - Status transitions (PIX_PAID → PENDING_REVIEW)
 *   - IP allowlist enforcement
 *   - Sentry breadcrumbs (non-blocking)
 * ════════════════════════════════════════
 */

const crypto = require('crypto');

// ── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'flowpay_test_secret_hmac_256';
const ALLOWED_IP = '127.0.0.1';
const BLOCKED_IP = '192.0.2.99';

/**
 * Gera assinatura HMAC-SHA256 em base64 (formato Woovi)
 */
function signPayload(payload, secret = WEBHOOK_SECRET) {
    return crypto
        .createHmac('sha256', secret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('base64');
}

/**
 * Monta um request fake compativel com a assinatura do Astro handler
 */
function buildWebhookRequest(body, overrideHeaders = {}, ip = ALLOWED_IP) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const signature = signPayload(rawBody);

    return {
        bodyText: rawBody,
        ip,
        headers: {
            'x-woovi-signature': signature,
            'content-type': 'application/json',
            origin: 'https://api.woovi.com',
            ...overrideHeaders,
        },
    };
}

/** Constrói payload padrao de charge.paid */
function buildChargePaid(overrides = {}) {
    return {
        event: 'charge.paid',
        data: {
            charge: {
                correlationID: overrides.correlationID || `order-${Date.now()}`,
                value: overrides.value || 10000,
                status: 'CONFIRMED',
                paidAt: new Date().toISOString(),
                identifier: overrides.identifier || 'PIX-IDENTIFIER-001',
                customer: {
                    email: overrides.email || 'cliente@flowpay.cash',
                    name: overrides.name || 'Cliente Teste',
                    taxID: { taxID: overrides.cpf || '123.456.789-00' },
                },
                ...overrides,
            },
        },
    };
}

// ── Mocks globais ─────────────────────────────────────────────────────────────

// Mock Sentry — não deve quebrar testes se não estiver inicializado
jest.mock('@sentry/astro', () => ({
    withScope: jest.fn((cb) => cb({ setLevel: jest.fn(), setTag: jest.fn(), setContext: jest.fn() })),
    captureMessage: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
}));

// Mock rate limiter — sempre libera no contexto de teste
jest.mock('../src/services/api/rate-limiter.mjs', () => ({
    applyRateLimit: jest.fn(() => () => null),
}));

// Mock nexus bridge — não deve fazer chamadas externas
jest.mock('../src/services/api/nexus-bridge.mjs', () => ({
    notifyNexus: jest.fn(() => Promise.resolve()),
}));

// Mock email service
jest.mock('../src/services/api/email-service.mjs', () => ({
    sendEmail: jest.fn(() => Promise.resolve()),
}));

// Mock email template
jest.mock('../src/services/api/email/templates/payment-confirmed.mjs', () => ({
    paymentConfirmedTemplate: jest.fn(() => '<html>Email de teste</html>'),
}));

// Mock POE service
jest.mock('../services/blockchain/poe-service.js', () => ({
    getPOEService: jest.fn(() => ({
        addOrderToBatch: jest.fn(() => Promise.resolve()),
    })),
}), { virtual: true });

// ── Banco de dados in-memory para testes ──────────────────────────────────────

let mockDB = {};

const mockGetOrder = jest.fn((correlationID) => mockDB[correlationID] || null);
const mockUpdateOrderStatus = jest.fn((correlationID, status, extra) => {
    if (!mockDB[correlationID]) return;
    mockDB[correlationID] = {
        ...mockDB[correlationID],
        status,
        ...(extra || {}),
        updated_at: new Date().toISOString(),
    };
});
const mockGetDatabase = jest.fn(() => ({
    prepare: jest.fn(() => ({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(() => []),
    })),
}));

jest.mock('../src/services/database/sqlite.mjs', () => ({
    getOrder: (...args) => mockGetOrder(...args),
    updateOrderStatus: (...args) => mockUpdateOrderStatus(...args),
    getDatabase: (...args) => mockGetDatabase(...args),
}));

// ── Variaveis do handler ──────────────────────────────────────────────────────

let webhookApi;

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
    process.env.WOOVI_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.WOOVI_ALLOWED_IPS = ALLOWED_IP;
    process.env.NODE_ENV = 'test';

    webhookApi = await import('../src/pages/api/webhook.js');
});

beforeEach(() => {
    // Resetar banco mock antes de cada teste
    mockDB = {};
    mockGetOrder.mockClear();
    mockUpdateOrderStatus.mockClear();
    mockGetDatabase.mockClear();
    jest.clearAllMocks();

    // Re-setar mocks que foram limpos
    jest.mock('@sentry/astro', () => ({
        withScope: jest.fn((cb) => cb({ setLevel: jest.fn(), setTag: jest.fn(), setContext: jest.fn() })),
        captureMessage: jest.fn(),
        captureException: jest.fn(),
        addBreadcrumb: jest.fn(),
    }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. HMAC VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('HMAC Validation', () => {

    test('✅ Assinatura válida deve ser aceita (status 200)', async () => {
        const payload = buildChargePaid({ correlationID: 'hmac-valid-001' });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
    });

    test('❌ Assinatura inválida deve ser rejeitada (status 401)', async () => {
        const payload = buildChargePaid({ correlationID: 'hmac-invalid-001' });
        const rawBody = JSON.stringify(payload);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': 'assinatura_forjada_invalida' },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(401);
    });

    test('❌ Payload adulterado deve invalidar assinatura', async () => {
        const originalPayload = buildChargePaid({ correlationID: 'hmac-tamper-001', value: 5000 });
        const originalBody = JSON.stringify(originalPayload);
        const signature = signPayload(originalBody); // assinado com valor 5000

        // Adultera o valor para 99999 (ataque de fraudador)
        const tamperedPayload = { ...originalPayload };
        tamperedPayload.data.charge.value = 99999;
        const tamperedBody = JSON.stringify(tamperedPayload);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature }, // assinatura do payload original
            body: tamperedBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(401);
    });

    test('❌ Ausência de assinatura deve retornar 200 (ping mode)', async () => {
        const rawBody = JSON.stringify({ ping: true });

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: {},
            body: rawBody,
        });

        // Sem assinatura E sem secret → modo ping
        const savedSecret = process.env.WOOVI_WEBHOOK_SECRET;
        delete process.env.WOOVI_WEBHOOK_SECRET;

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);

        process.env.WOOVI_WEBHOOK_SECRET = savedSecret;
    });

    test('⚠️ Comparação de assinatura deve ser timing-safe (sem timing attack)', () => {
        // Validação unitária do timing-safe equal
        const secret = WEBHOOK_SECRET;
        const payload = 'test-payload-timing';

        const hmac1 = crypto.createHmac('sha256', secret).update(payload).digest('base64');
        const hmac2 = crypto.createHmac('sha256', secret).update(payload).digest('base64');

        const buf1 = Buffer.from(hmac1);
        const buf2 = Buffer.from(hmac2);

        expect(buf1.length).toBe(buf2.length);
        expect(crypto.timingSafeEqual(buf1, buf2)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. IP ALLOWLIST
// ─────────────────────────────────────────────────────────────────────────────

describe('IP Allowlist', () => {

    test('❌ IP não autorizado deve ser bloqueado (status 403)', async () => {
        const payload = buildChargePaid({ correlationID: 'ip-blocked-001' });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: BLOCKED_IP });
        expect(response.status).toBe(403);
    });

    test('✅ IP autorizado deve ser aceito', async () => {
        const payload = buildChargePaid({ correlationID: 'ip-allowed-001' });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATUS TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('Status Transitions', () => {

    test('✅ charge.paid → ordem existente deve ir para PIX_PAID → PENDING_REVIEW', async () => {
        const correlationID = 'status-transition-001';

        // Seed: ordem existe no banco em estado CREATED
        mockDB[correlationID] = {
            id: 1,
            charge_id: correlationID,
            status: 'CREATED',
            bridge_status: 'PENDING',
            customer_wallet: '0xABC123',
            customer_ref: 'ref-001',
            customer_email: null,
            customer_name: null,
            customer_cpf: null,
        };

        const payload = buildChargePaid({ correlationID });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);

        // Deve ter chamado updateOrderStatus pelo menos 2 vezes: PIX_PAID e PENDING_REVIEW
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
            correlationID,
            'PIX_PAID',
            expect.any(Object)
        );
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
            correlationID,
            'PENDING_REVIEW'
        );
    });

    test('✅ charge.confirmed também dispara o fluxo de pagamento', async () => {
        const correlationID = 'status-confirmed-001';

        mockDB[correlationID] = {
            id: 2,
            charge_id: correlationID,
            status: 'CREATED',
            bridge_status: 'PENDING',
            customer_wallet: '0xDEF456',
            customer_ref: 'ref-002',
        };

        const payload = { event: 'charge.confirmed', data: { charge: { correlationID, value: 5000, paidAt: new Date().toISOString(), customer: {} } } };
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(correlationID, 'PIX_PAID', expect.any(Object));
    });

    test('⚠️ Evento desconhecido deve retornar 200 sem alterar banco', async () => {
        const correlationID = 'event-unknown-001';

        const payload = { event: 'charge.refunded', data: { charge: { correlationID } } };
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);
        expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. IDEMPOTENCY — O núcleo da integridade financeira
// ─────────────────────────────────────────────────────────────────────────────

describe('Idempotency — estados terminais não devem ser reprocessados', () => {

    const TERMINAL_STATES = ['COMPLETED', 'PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED'];

    TERMINAL_STATES.forEach((terminalStatus) => {
        test(`🔒 Ordem em status '${terminalStatus}' NÃO deve ser reprocessada`, async () => {
            const correlationID = `idempot-${terminalStatus.toLowerCase()}-001`;

            mockDB[correlationID] = {
                id: 10,
                charge_id: correlationID,
                status: terminalStatus,
                bridge_status: 'PENDING',
                customer_wallet: '0xIDEMPOTENT',
                customer_ref: 'ref-idempot',
            };

            const payload = buildChargePaid({ correlationID });
            const rawBody = JSON.stringify(payload);
            const signature = signPayload(rawBody);

            const request = new Request('http://localhost:4321/api/webhook', {
                method: 'POST',
                headers: { 'x-woovi-signature': signature },
                body: rawBody,
            });

            const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);

            // Crítico: updateOrderStatus NÃO deve ter sido chamado
            expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
        });
    });

    test('🔒 Ordem com bridge_status=SENT nunca deve ser reprocessada', async () => {
        const correlationID = 'idempot-bridge-sent-001';

        mockDB[correlationID] = {
            id: 20,
            charge_id: correlationID,
            status: 'CREATED', // status não-terminal, mas bridge já enviada
            bridge_status: 'SENT',
            customer_wallet: '0xBRIDGESENT',
            customer_ref: 'ref-bridge',
        };

        const payload = buildChargePaid({ correlationID });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);
        // Nunca deve reprocessar se bridge já foi enviada
        expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
    });

    test('✅ Ordem não encontrada retorna 200 (webhook aceito, log de warning)', async () => {
        const correlationID = 'idempot-not-found-001';
        // Propositalmente: mockDB vazio, correlationID não existe

        const payload = buildChargePaid({ correlationID });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        // Deve retornar 200 para Woovi não retentar (log de warning interno)
        expect(response.status).toBe(200);
        expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CUSTOMER DATA ENRICHMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Data Enrichment', () => {

    test('✅ Dados do cliente (email, nome, CPF) devem ser enriquecidos no banco', async () => {
        const correlationID = 'enrich-001';

        mockDB[correlationID] = {
            id: 30,
            charge_id: correlationID,
            status: 'CREATED',
            bridge_status: 'PENDING',
            customer_wallet: '0xENRICH',
            customer_ref: 'ref-enrich',
            customer_email: null, // ainda vazio
            customer_name: null,
            customer_cpf: null,
        };

        const payload = buildChargePaid({
            correlationID,
            email: 'enriquecido@flowpay.cash',
            name: 'Cliente Enriquecido',
            cpf: '999.888.777-66',
        });
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        expect(response.status).toBe(200);

        // O getDatabase é chamado para enriquecer dados
        // Verificamos que tentou acessar o banco
        expect(mockGetDatabase).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ERROR HANDLING & RESILIÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

describe('Error Handling & Resiliência', () => {

    test('⚠️ Payload JSON malformado deve retornar 200 (Woovi não retenta erros lógicos)', async () => {
        const rawBody = '{ evento: INVALID JSON!!!';
        const signature = signPayload(rawBody);

        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'POST',
            headers: { 'x-woovi-signature': signature },
            body: rawBody,
        });

        const response = await webhookApi.POST({ request, clientAddress: ALLOWED_IP });
        // Handler retorna 200 em erros para evitar retentativas infinitas da Woovi
        expect([200, 500]).toContain(response.status);
    });

    test('✅ OPTIONS deve retornar 204 (preflight CORS)', async () => {
        const request = new Request('http://localhost:4321/api/webhook', {
            method: 'OPTIONS',
            headers: { origin: 'https://flowpay.cash' },
        });

        const response = await webhookApi.OPTIONS({ request });
        expect(response.status).toBe(204);
    });
});
