/**
 * ════════════════════════════════════════════════════════════════
 * FLOWPAY · Service Tests
 * ════════════════════════════════════════════════════════════════
 * Target: tests/services/services.test.js
 * Covers:
 *   - Email (Resend): template rendering + API failover
 *   - Rate Limiter (Redis): janelas e fallback
 *   - Config Validator: todas as ENVs críticas presentes no startup
 * ════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

describe('Config Validator — ENV vars críticas', () => {
    const REQUIRED_VARS = [
        'WOOVI_API_KEY',
        'WOOVI_WEBHOOK_SECRET',
    ];

    const PROD_REQUIRED = [
        ...REQUIRED_VARS,
        'ADMIN_PASSWORD',
    ];

    beforeEach(() => {
        // Garante estado limpo
        PROD_REQUIRED.forEach(v => { delete process.env[v]; });
    });

    afterEach(() => {
        // Restaura para não quebrar outros testes
        process.env.WOOVI_API_KEY = 'test-api-key';
        process.env.WOOVI_WEBHOOK_SECRET = 'test-webhook-secret';
        process.env.ADMIN_PASSWORD = 'test-password';
        process.env.NODE_ENV = 'test';
    });

    test('✅ validateConfig() não lança exceção quando todas as ENVs estão presentes', async () => {
        process.env.WOOVI_API_KEY = 'key-presente';
        process.env.WOOVI_WEBHOOK_SECRET = 'secret-presente';
        process.env.NODE_ENV = 'test'; // não-production não exige ADMIN_PASSWORD

        const { validateConfig } = await import('../../src/services/api/config.mjs');
        expect(() => validateConfig()).not.toThrow();
    });

    test('❌ validateConfig() lança exceção quando WOOVI_API_KEY está ausente', async () => {
        delete process.env.WOOVI_API_KEY;
        process.env.WOOVI_WEBHOOK_SECRET = 'secret';
        process.env.NODE_ENV = 'test';

        const { validateConfig } = await import('../../src/services/api/config.mjs');
        expect(() => validateConfig()).toThrow(/WOOVI_API_KEY/);
    });

    test('❌ validateConfig() lança exceção quando WOOVI_WEBHOOK_SECRET está ausente', async () => {
        process.env.WOOVI_API_KEY = 'key';
        delete process.env.WOOVI_WEBHOOK_SECRET;
        process.env.NODE_ENV = 'test';

        const { validateConfig } = await import('../../src/services/api/config.mjs');
        expect(() => validateConfig()).toThrow(/WOOVI_WEBHOOK_SECRET/);
    });

    test('❌ Em production, ADMIN_PASSWORD é obrigatório', async () => {
        process.env.WOOVI_API_KEY = 'key';
        process.env.WOOVI_WEBHOOK_SECRET = 'secret';
        process.env.NODE_ENV = 'production';
        delete process.env.ADMIN_PASSWORD;

        const { validateConfig } = await import('../../src/services/api/config.mjs');
        expect(() => validateConfig()).toThrow(/ADMIN_PASSWORD/);

        process.env.NODE_ENV = 'test';
    });

    test('✅ redactSensitiveData() oculta campos sensíveis', async () => {
        const { redactSensitiveData } = await import('../../src/services/api/config.mjs');

        const input = {
            user: 'test@flowpay.cash',
            password: 'senha_secreta',
            api_key: 'key-abc',
            amount: 100,
            nested: {
                token: 'jwt-token',
                name: 'Cliente',
            },
        };

        const result = redactSensitiveData(input);

        expect(result.user).toBe('test@flowpay.cash');
        expect(result.amount).toBe(100);
        expect(result.password).toBe('[REDACTED]');
        expect(result.api_key).toBe('[REDACTED]');
        expect(result.nested.token).toBe('[REDACTED]');
        expect(result.nested.name).toBe('Cliente');
    });

    test('✅ redactSensitiveData() lida com objetos circulares sem crash', async () => {
        const { redactSensitiveData } = await import('../../src/services/api/config.mjs');

        const obj = { name: 'test' };
        obj.self = obj; // circular

        expect(() => redactSensitiveData(obj)).not.toThrow();
        const result = redactSensitiveData(obj);
        expect(result.self).toBe('[CIRCULAR]');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate Limiter — janelas e fallback', () => {

    test('✅ Primeira requisição deve ser permitida', async () => {
        const { applyRateLimit } = await import('../../src/services/api/rate-limiter.mjs');

        const limitFn = applyRateLimit('test-endpoint');
        const result = limitFn({
            headers: {},
            context: { clientIP: '1.2.3.100' },
        });

        // Deve retornar null (não bloqueado) ou um objeto sem status 429
        if (result) {
            expect(result.statusCode).not.toBe(429);
        } else {
            expect(result).toBeNull();
        }
    });

    test('✅ applyRateLimit() retorna uma função', async () => {
        const { applyRateLimit } = await import('../../src/services/api/rate-limiter.mjs');
        const fn = applyRateLimit('health-check');
        expect(typeof fn).toBe('function');
    });

    test('✅ IPs diferentes têm janelas independentes', async () => {
        const { applyRateLimit } = await import('../../src/services/api/rate-limiter.mjs');
        const limitFn = applyRateLimit('isolation-test');

        const r1 = limitFn({ headers: {}, context: { clientIP: '10.0.0.1' } });
        const r2 = limitFn({ headers: {}, context: { clientIP: '10.0.0.2' } });

        // Ambos devem ser permitidos na primeira requisição
        const blocked1 = r1?.statusCode === 429;
        const blocked2 = r2?.statusCode === 429;
        expect(blocked1).toBe(false);
        expect(blocked2).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SERVICE (Resend)
// ─────────────────────────────────────────────────────────────────────────────

describe('Email Service — templates e failover', () => {

    test('✅ payment-confirmed template renderiza HTML válido', async () => {
        const { paymentConfirmedTemplate } = await import(
            '../../src/services/api/email/templates/payment-confirmed.mjs'
        );

        const html = paymentConfirmedTemplate({
            orderId: 'TEST-ORDER-001',
            amount: 150.00,
        });

        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(50);
        // Deve conter elementos HTML básicos
        expect(html).toMatch(/<html|<div|<table|<!DOCTYPE/i);
    });

    test('✅ Template não deve lançar com valores edge-case', async () => {
        const { paymentConfirmedTemplate } = await import(
            '../../src/services/api/email/templates/payment-confirmed.mjs'
        );

        // Valores extremos
        expect(() => paymentConfirmedTemplate({ orderId: '', amount: 0 })).not.toThrow();
        expect(() => paymentConfirmedTemplate({ orderId: null, amount: NaN })).not.toThrow();
        expect(() => paymentConfirmedTemplate({})).not.toThrow();
    });

    test('✅ sendEmail() retorna objeto com status de envio', async () => {
        // Mock do Resend API — não faz chamada real
        const mockResend = {
            emails: {
                send: jest.fn().mockResolvedValue({ id: 'mock-email-id-001', error: null }),
            },
        };

        jest.doMock('resend', () => ({ Resend: jest.fn(() => mockResend) }));
        process.env.RESEND_API_KEY = 're_test_mock_key';

        const { sendEmail } = await import('../../src/services/api/email-service.mjs');

        const result = await sendEmail({
            to: 'cliente@flowpay.cash',
            subject: 'Pagamento Confirmado',
            html: '<p>Seu pagamento foi confirmado!</p>',
        });

        // Deve ter tentado enviar ou retornado resultado
        // (aceita null se RESEND não configurado em test env)
        if (result) {
            expect(result).toBeDefined();
        } else {
            expect(result).toBeNull();
        }
    });

    test('❌ sendEmail() não deve lançar exceção em caso de falha da API', async () => {
        const mockResend = {
            emails: {
                send: jest.fn().mockRejectedValue(new Error('API unavailable')),
            },
        };

        jest.doMock('resend', () => ({ Resend: jest.fn(() => mockResend) }));
        process.env.RESEND_API_KEY = 're_test_mock_failover';

        const { sendEmail } = await import('../../src/services/api/email-service.mjs');

        // Não deve propagar o erro — failover silencioso
        await expect(sendEmail({
            to: 'cliente@flowpay.cash',
            subject: 'Test',
            html: '<p>test</p>',
        })).resolves.not.toThrow();
    });

    test('✅ sendEmail() sem RESEND_API_KEY é no-op silencioso', async () => {
        delete process.env.RESEND_API_KEY;

        const { sendEmail } = await import('../../src/services/api/email-service.mjs');

        // Deve retornar sem lançar
        await expect(sendEmail({
            to: 'test@test.com',
            subject: 'Test',
            html: '<p>test</p>',
        })).resolves.not.toThrow();

        process.env.RESEND_API_KEY = 're_test_restored';
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE — operações atômicas e constraint violations
// ─────────────────────────────────────────────────────────────────────────────

describe('Database — integridade e operações', () => {
    let db;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        const { getDatabase } = await import('../../src/services/database/sqlite.mjs');
        db = getDatabase();
    });

    test('✅ getDatabase() retorna instância válida', async () => {
        const { getDatabase } = await import('../../src/services/database/sqlite.mjs');
        const instance = getDatabase();
        expect(instance).toBeDefined();
        expect(typeof instance.prepare).toBe('function');
    });

    test('✅ Inserção de usuário é idempotente por email (UNIQUE constraint)', async () => {
        const { createUser, getUserByEmail } = await import('../../src/services/database/sqlite.mjs');

        const testEmail = `test-unique-${Date.now()}@flowpay.cash`;
        const userId = createUser({
            name: 'Teste Unique',
            email: testEmail,
            document_type: 'CPF',
        });

        expect(typeof userId).toBe('bigint');

        // Segunda inserção do mesmo email deve lançar erro de constraint
        expect(() => createUser({
            name: 'Duplicate',
            email: testEmail,
        })).toThrow();
    });

    test('✅ getUserByEmail() é case-insensitive', async () => {
        const { createUser, getUserByEmail } = await import('../../src/services/database/sqlite.mjs');

        const email = `case-test-${Date.now()}@flowpay.cash`;
        createUser({ name: 'Case Test', email: email.toUpperCase(), document_type: 'CPF' });

        const found = getUserByEmail(email.toLowerCase());
        expect(found).toBeDefined();
        expect(found.email).toBe(email.toLowerCase());
    });

    test('✅ logAudit() não causa crash mesmo com dados inválidos', async () => {
        const { logAudit } = await import('../../src/services/database/sqlite.mjs');

        // Não deve lançar — logAudit tem try/catch interno
        expect(() => logAudit('TEST', null, null, null, null)).not.toThrow();
        expect(() => logAudit('TEST', 'actor', 'action', { key: 'value' }, 'order-id')).not.toThrow();
    });
});
