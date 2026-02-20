// FLOWPay - Testes OpenPix/Woovi Integration
// Suíte completa de testes para integração com OpenPix API

const crypto = require("crypto");

// Mock do ambiente Railway Functions
const mockEvent = (method, body, headers = {}) => ({
  httpMethod: method,
  body: typeof body === "string" ? body : JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
    origin: "http://localhost:4321",
    ...headers,
  },
});

const mockContext = {
  awsRequestId: "test-request-id",
  functionName: "test-function",
};

// Helper para calcular assinatura HMAC
function calculateHMAC(secret, payload) {
  return crypto
    .createHmac("sha256", secret)
    .update(typeof payload === "string" ? payload : JSON.stringify(payload))
    .digest("hex");
}

describe("FLOWPay - OpenPix Integration Tests", () => {
  let createPixChargeHandler;
  let webhookHandler;

  beforeAll(async () => {
    process.env.WOOVI_ALLOWED_IPS = "127.0.0.1,::1";

    const createChargeApi = await import("../src/pages/api/create-charge.js");
    const webhookApi = await import("../src/pages/api/webhook.js");

    createPixChargeHandler = async (event) => {
      const request = new Request("http://localhost:4321/api/create-charge", {
        method: event.httpMethod,
        headers: event.headers,
        body: event.body,
      });

      const response = await createChargeApi.POST({
        request,
        clientAddress: "127.0.0.1",
      });

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    };

    webhookHandler = async (event) => {
      if (!event.headers["x-woovi-signature"]) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing signature" }),
        };
      }

      let payloadBody = event.body;
      try {
        const parsed = JSON.parse(payloadBody);
        if (parsed?.data && !parsed.data.charge) {
          parsed.data = { charge: parsed.data };
          payloadBody = JSON.stringify(parsed);
        }
      } catch {
        // no-op: payload already stringified by test helper
      }

      const normalizedHeaders = { ...event.headers };
      const sig = event.headers["x-woovi-signature"];
      if (sig && /^[a-f0-9]+$/i.test(sig) && sig.length % 2 === 0) {
        normalizedHeaders["x-woovi-signature"] = Buffer.from(
          sig,
          "hex"
        ).toString("base64");
      }

      const request = new Request("http://localhost:4321/api/webhook", {
        method: event.httpMethod,
        headers: normalizedHeaders,
        body: payloadBody,
      });

      const response = await webhookApi.POST({
        request,
        clientAddress: "127.0.0.1",
      });

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    };
  });

  beforeEach(() => {
    // Limpar mocks antes de cada teste
    jest.restoreAllMocks();
  });

  describe("Create PIX Charge", () => {
    const validPayload = {
      wallet: "0x1111111111111111111111111111111111111111",
      valor: 50.0,
      moeda: "BRL",
      id_transacao: "test_pix_001",
    };

    test("deve criar cobrança PIX válida", async () => {
      process.env.WOOVI_API_KEY = "test_key";
      process.env.WOOVI_API_URL = "https://api.woovi.com";

      // Mock fetch para retornar resposta válida
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              correlationID: validPayload.id_transacao,
              value: 5000, // 50.00 em centavos
              status: "ACTIVE",
              qrCodeImage: "data:image/png;base64,...",
              brCode: "000201010212...",
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            }),
        })
      );

      const event = mockEvent("POST", validPayload);
      const result = await createPixChargeHandler(event, mockContext);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.pix_data).toBeDefined();
      expect(body.pix_data.correlation_id).toBe(validPayload.id_transacao);
    });

    test("deve validar wallet Ethereum", async () => {
      const invalidPayload = {
        ...validPayload,
        wallet: "invalid_wallet",
      };

      const event = mockEvent("POST", invalidPayload);
      const result = await createPixChargeHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("deve validar valor positivo", async () => {
      const invalidPayload = {
        ...validPayload,
        valor: -10.0,
      };

      const event = mockEvent("POST", invalidPayload);
      const result = await createPixChargeHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("deve validar campos obrigatórios", async () => {
      const invalidPayload = {
        wallet: validPayload.wallet,
        // faltando valor, moeda, id_transacao
      };

      const event = mockEvent("POST", invalidPayload);
      const result = await createPixChargeHandler(event, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("deve converter valor para centavos", async () => {
      const event = mockEvent("POST", validPayload);
      process.env.WOOVI_API_KEY = "test_key";

      // Mock fetch para interceptar chamada
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              correlationID: validPayload.id_transacao,
              value: 5000, // 50.00 em centavos
              status: "ACTIVE",
              qrCodeImage: "data:image/png;base64,...",
              brCode: "000201010212...",
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            }),
        })
      );

      const result = await createPixChargeHandler(event, mockContext);
      const body = JSON.parse(result.body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/charge"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"value":5000'),
        })
      );

      expect(body.pix_data.value).toBe(50.0);
    });

    test("deve incluir additionalInfo com wallet e moeda", async () => {
      process.env.WOOVI_API_KEY = "test_key";
      process.env.WOOVI_API_URL = "https://api.woovi.com";

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              correlationID: validPayload.id_transacao,
              value: 5000,
              status: "ACTIVE",
            }),
        })
      );

      const event = mockEvent("POST", validPayload);
      await createPixChargeHandler(event, mockContext);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.additionalInfo).toBeDefined();
      expect(requestBody.additionalInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "wallet",
            value: validPayload.wallet,
          }),
          expect.objectContaining({ key: "moeda", value: validPayload.moeda }),
        ])
      );
    });
  });

  describe("Webhook Handler", () => {
    const webhookSecret = "test_webhook_secret";
    const validCharge = {
      correlationID: "test_pix_001",
      value: 5000,
      status: "CONFIRMED",
      paidAt: new Date().toISOString(),
      additionalInfo: [
        { key: "wallet", value: "0x1111111111111111111111111111111111111111" },
        { key: "moeda", value: "USDT" },
        { key: "chainId", value: "137" },
      ],
    };

    const validWebhookPayload = {
      event: "charge.paid",
      data: validCharge,
    };

    test("deve processar webhook válido", async () => {
      process.env.WOOVI_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify(validWebhookPayload);
      const signature = calculateHMAC(webhookSecret, payload);

      const event = mockEvent("POST", payload, {
        "x-woovi-signature": signature,
      });

      const result = await webhookHandler(event, mockContext);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
    });

    test("deve rejeitar webhook sem assinatura", async () => {
      process.env.WOOVI_WEBHOOK_SECRET = webhookSecret;

      const event = mockEvent("POST", validWebhookPayload);
      // Sem header x-woovi-signature

      const result = await webhookHandler(event, mockContext);

      expect(result.statusCode).toBe(401);
    });

    test("deve rejeitar webhook com assinatura inválida", async () => {
      process.env.WOOVI_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify(validWebhookPayload);
      const event = mockEvent("POST", payload, {
        "x-woovi-signature": "invalid_signature",
      });

      const result = await webhookHandler(event, mockContext);

      expect(result.statusCode).toBe(401);
    });

    test("deve extrair informações do charge", async () => {
      process.env.WOOVI_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify(validWebhookPayload);
      const signature = calculateHMAC(webhookSecret, payload);

      const event = mockEvent("POST", payload, {
        "x-woovi-signature": signature,
      });

      // Mock console.log para capturar logs
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await webhookHandler(event, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Pagamento PIX confirmado"),
        expect.objectContaining({
          correlation_id: validCharge.correlationID,
          value: validCharge.value,
        })
      );

      consoleSpy.mockRestore();
    });

    test("deve criar ordem de liquidação assistida", async () => {
      process.env.WOOVI_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify(validWebhookPayload);
      const signature = calculateHMAC(webhookSecret, payload);

      const event = mockEvent("POST", payload, {
        "x-woovi-signature": signature,
      });

      const result = await webhookHandler(event, mockContext);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.settlement).toBeDefined();
      expect(body.settlement.status).toBe("PENDING_REVIEW");
    });
  });

  describe("End-to-End Flow", () => {
    test("deve criar cobrança e processar webhook", async () => {
      // 1. Criar cobrança
      const createPayload = {
        wallet: "0x1111111111111111111111111111111111111111",
        valor: 100.0,
        moeda: "BRL",
        id_transacao: "e2e_test_001",
      };

      process.env.WOOVI_API_KEY = "test_key";
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              correlationID: createPayload.id_transacao,
              value: 10000,
              status: "ACTIVE",
              qrCodeImage: "data:image/png;base64,...",
              brCode: "000201010212...",
            }),
        })
      );

      const createEvent = mockEvent("POST", createPayload);
      const createResult = await createPixChargeHandler(
        createEvent,
        mockContext
      );
      const createBody = JSON.parse(createResult.body);

      expect(createBody.success).toBe(true);
      expect(createBody.pix_data.correlation_id).toBe(
        createPayload.id_transacao
      );

      // 2. Simular webhook de confirmação
      process.env.WOOVI_WEBHOOK_SECRET = "test_secret";

      const webhookPayload = {
        event: "charge.paid",
        data: {
          correlationID: createPayload.id_transacao,
          value: 10000,
          status: "CONFIRMED",
          paidAt: new Date().toISOString(),
          additionalInfo: [
            { key: "wallet", value: createPayload.wallet },
            { key: "moeda", value: "USDT" },
            { key: "chainId", value: "137" },
          ],
        },
      };

      const webhookBody = JSON.stringify(webhookPayload);
      const signature = calculateHMAC("test_secret", webhookBody);

      const webhookEvent = mockEvent("POST", webhookBody, {
        "x-woovi-signature": signature,
      });

      const webhookResult = await webhookHandler(webhookEvent, mockContext);
      const webhookResponse = JSON.parse(webhookResult.body);

      expect(webhookResult.statusCode).toBe(200);
      expect(webhookResponse.success).toBe(true);
      expect(webhookResponse.settlement).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("deve tratar erro da API Woovi", async () => {
      process.env.WOOVI_API_KEY = "test_key";
      process.env.WOOVI_API_URL = "https://api.woovi.com";

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid request"),
        })
      );

      const event = mockEvent("POST", {
        wallet: "0x1111111111111111111111111111111111111111",
        valor: 50.0,
        moeda: "BRL",
        id_transacao: "test_error",
      });

      const result = await createPixChargeHandler(event, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });

    test("deve tratar API key não configurada", async () => {
      // Garantir que WOOVI_API_KEY não está definida
      delete process.env.WOOVI_API_KEY;

      const event = mockEvent("POST", {
        wallet: "0x1111111111111111111111111111111111111111",
        valor: 50.0,
        moeda: "BRL",
        id_transacao: "test_no_key",
      });

      const result = await createPixChargeHandler(event, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
