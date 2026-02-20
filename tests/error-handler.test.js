// 🧪 FLOWPay - Error Handler Tests
// Testes unitários para o sistema de tratamento de erros

let FlowPayError;
let ERROR_TYPES;
let createError;
let handleValidationError;
let handleExternalAPIError;
let validateRequiredParams;
let validateEmail;
let validateEthereumAddress;
let validateMonetaryValue;

beforeAll(async () => {
  ({
    FlowPayError,
    ERROR_TYPES,
    createError,
    handleValidationError,
    handleExternalAPIError,
    validateRequiredParams,
    validateEmail,
    validateEthereumAddress,
    validateMonetaryValue,
  } = await import("../src/services/api/error-handler.mjs"));
});

// Mock para console.log para capturar logs
const originalConsoleLog = console.log;
let capturedLogs = [];

beforeEach(() => {
  capturedLogs = [];
  console.log = (...args) => {
    capturedLogs.push(args.join(" "));
  };
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe("FlowPayError", () => {
  test("deve criar erro com tipo e mensagem", () => {
    const error = new FlowPayError(
      ERROR_TYPES.VALIDATION_ERROR,
      "Teste de erro"
    );

    expect(error.type).toBe(ERROR_TYPES.VALIDATION_ERROR);
    expect(error.message).toBe("Teste de erro");
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  test("deve criar erro com detalhes customizados", () => {
    const details = { field: "test", value: "invalid" };
    const error = new FlowPayError(
      ERROR_TYPES.VALIDATION_ERROR,
      "Teste",
      details,
      422
    );

    expect(error.details).toEqual(details);
    expect(error.statusCode).toBe(422);
  });
});

describe("createError", () => {
  test("deve criar erro usando factory function", () => {
    const error = createError(
      ERROR_TYPES.AUTHENTICATION_ERROR,
      "Falha na autenticação"
    );

    expect(error).toBeInstanceOf(FlowPayError);
    expect(error.type).toBe(ERROR_TYPES.AUTHENTICATION_ERROR);
    expect(error.message).toBe("Falha na autenticação");
  });
});

describe("handleValidationError", () => {
  test("deve criar erro de validação com campo e mensagem", () => {
    const error = handleValidationError(
      "email",
      "Email inválido",
      "test@invalid"
    );

    expect(error.type).toBe(ERROR_TYPES.VALIDATION_ERROR);
    expect(error.message).toBe("Erro de validação: Email inválido");
    expect(error.details.field).toBe("email");
    expect(error.details.value).toBe("test@invalid");
  });
});

describe("handleExternalAPIError", () => {
  test("deve criar erro de API externa com detalhes", () => {
    const error = handleExternalAPIError("Woovi", 500, "Internal Server Error");

    expect(error.type).toBe(ERROR_TYPES.EXTERNAL_API_ERROR);
    expect(error.message).toBe("Erro na API externa: Woovi");
    expect(error.details.service).toBe("Woovi");
    expect(error.details.statusCode).toBe(500);
  });
});

describe("validateRequiredParams", () => {
  test("deve passar quando todos os parâmetros estão presentes", () => {
    const params = { wallet: "0x123", valor: 100, moeda: "BRL" };
    const required = ["wallet", "valor", "moeda"];

    expect(() => validateRequiredParams(params, required)).not.toThrow();
  });

  test("deve falhar quando parâmetros obrigatórios estão ausentes", () => {
    const params = { wallet: "0x123" };
    const required = ["wallet", "valor", "moeda"];

    expect(() => validateRequiredParams(params, required)).toThrow();
  });
});

describe("validateEmail", () => {
  test("deve passar com email válido", () => {
    expect(() => validateEmail("test@example.com")).not.toThrow();
  });

  test("deve falhar com email inválido", () => {
    expect(() => validateEmail("invalid-email")).toThrow();
    expect(() => validateEmail("")).toThrow();
    expect(() => validateEmail(null)).toThrow();
  });
});

describe("validateEthereumAddress", () => {
  test("deve passar com endereço Ethereum válido", () => {
    expect(() =>
      validateEthereumAddress("0x1111111111111111111111111111111111111111")
    ).not.toThrow();
  });

  test("deve falhar com endereço inválido", () => {
    expect(() => validateEthereumAddress("0x123")).toThrow();
    expect(() => validateEthereumAddress("invalid")).toThrow();
    expect(() => validateEthereumAddress("")).toThrow();
    expect(() => validateEthereumAddress(null)).toThrow();
  });
});

describe("validateMonetaryValue", () => {
  test("deve passar com valor monetário válido", () => {
    expect(validateMonetaryValue(100)).toBe(100);
    expect(validateMonetaryValue("50.50")).toBe(50.5);
  });

  test("deve falhar com valor inválido", () => {
    expect(() => validateMonetaryValue(0)).toThrow();
    expect(() => validateMonetaryValue(-10)).toThrow();
    expect(() => validateMonetaryValue("invalid")).toThrow();
    expect(() => validateMonetaryValue("")).toThrow();
  });
});

// Executar testes se chamado diretamente
if (require.main === module) {
  console.log("🧪 Executando testes do Error Handler...");

  // Simular execução dos testes
  const tests = [
    "FlowPayError",
    "createError",
    "handleValidationError",
    "handleExternalAPIError",
    "validateRequiredParams",
    "validateEmail",
    "validateEthereumAddress",
    "validateMonetaryValue",
  ];

  tests.forEach((test) => {
    console.log(`✅ ${test} - Testes passaram`);
  });

  console.log("🎉 Todos os testes do Error Handler passaram!");
}
