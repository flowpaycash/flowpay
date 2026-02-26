// 🧪 FLOWPay - Validation Middleware Tests
// Testes unitários para o middleware de validação

let validateData;
let validateType;
let validateLength;
let validateNumericRange;
let validateAllowedValues;
let sanitizeData;
let VALIDATION_SCHEMAS;

beforeAll(async () => {
  ({
    validateData,
    validateType,
    validateLength,
    validateNumericRange,
    validateAllowedValues,
    sanitizeData,
    VALIDATION_SCHEMAS,
  } = await import("../src/services/api/validation-middleware.mjs"));
});

describe("validateData", () => {
  test("deve validar dados corretos para createPixCharge", () => {
    const data = {
      wallet: "0x1111111111111111111111111111111111111111",
      valor: 100.5,
      moeda: "BRL",
      id_transacao: "test-123",
    };

    expect(() => validateData(data, "createPixCharge")).not.toThrow();
  });

  test("deve falhar com campos obrigatórios ausentes", () => {
    const data = {
      wallet: "0x1111111111111111111111111111111111111111",
    };

    expect(() => validateData(data, "createPixCharge")).toThrow();
  });

  test("deve falhar com esquema inexistente", () => {
    const data = { test: "value" };

    expect(() => validateData(data, "inexistentSchema")).toThrow();
  });
});

describe("validateType", () => {
  test("deve validar string corretamente", () => {
    expect(() => validateType("test", "string", "field")).not.toThrow();
    expect(() => validateType(123, "string", "field")).toThrow();
  });

  test("deve validar email corretamente", () => {
    expect(() =>
      validateType("test@example.com", "email", "field")
    ).not.toThrow();
    expect(() => validateType("invalid-email", "email", "field")).toThrow();
  });

  test("deve validar endereço Ethereum corretamente", () => {
    expect(() =>
      validateType(
        "0x1111111111111111111111111111111111111111",
        "ethereum_address",
        "field"
      )
    ).not.toThrow();
    expect(() => validateType("0x123", "ethereum_address", "field")).toThrow();
  });

  test("deve validar valor monetário corretamente", () => {
    expect(() => validateType(100, "monetary_value", "field")).not.toThrow();
    expect(() =>
      validateType("50.50", "monetary_value", "field")
    ).not.toThrow();
    expect(() => validateType(0, "monetary_value", "field")).toThrow();
    expect(() => validateType(-10, "monetary_value", "field")).toThrow();
  });
});

describe("validateLength", () => {
  test("deve validar comprimento mínimo", () => {
    expect(() => validateLength("test", 3, undefined, "field")).not.toThrow();
    expect(() => validateLength("ab", 3, undefined, "field")).toThrow();
  });

  test("deve validar comprimento máximo", () => {
    expect(() => validateLength("test", undefined, 10, "field")).not.toThrow();
    expect(() =>
      validateLength("very long string", undefined, 10, "field")
    ).toThrow();
  });

  test("deve validar range de comprimento", () => {
    expect(() => validateLength("test", 3, 10, "field")).not.toThrow();
    expect(() => validateLength("ab", 3, 10, "field")).toThrow();
    expect(() => validateLength("very long string", 3, 10, "field")).toThrow();
  });
});

describe("validateNumericRange", () => {
  test("deve validar valor mínimo", () => {
    expect(() =>
      validateNumericRange(100, 50, undefined, "field")
    ).not.toThrow();
    expect(() => validateNumericRange(25, 50, undefined, "field")).toThrow();
  });

  test("deve validar valor máximo", () => {
    expect(() =>
      validateNumericRange(100, undefined, 200, "field")
    ).not.toThrow();
    expect(() => validateNumericRange(250, undefined, 200, "field")).toThrow();
  });

  test("deve validar range numérico", () => {
    expect(() => validateNumericRange(100, 50, 200, "field")).not.toThrow();
    expect(() => validateNumericRange(25, 50, 200, "field")).toThrow();
    expect(() => validateNumericRange(250, 50, 200, "field")).toThrow();
  });
});

describe("validateAllowedValues", () => {
  test("deve validar valores permitidos", () => {
    const allowed = ["BRL", "USD", "EUR"];
    expect(() => validateAllowedValues("BRL", allowed, "field")).not.toThrow();
    expect(() => validateAllowedValues("INVALID", allowed, "field")).toThrow();
  });
});

describe("sanitizeData", () => {
  test("deve sanitizar strings removendo caracteres perigosos", () => {
    const data = {
      name: '  <script>alert("xss")</script>  ',
      value: "normal string",
    };

    const sanitized = sanitizeData(data);
    expect(sanitized.name).not.toContain("<script>");
    expect(sanitized.name).not.toContain("</script>");
    expect(sanitized.name.trim()).toBe("");
    expect(sanitized.value).toBe("normal string");
  });

  test("deve limitar tamanho de strings", () => {
    const data = {
      longString: "a".repeat(2000),
    };

    const sanitized = sanitizeData(data);
    expect(sanitized.longString.length).toBe(2000);
  });

  test("deve validar números", () => {
    const data = {
      validNumber: 100,
      invalidNumber: "not-a-number",
    };

    const sanitized = sanitizeData(data);
    expect(sanitized.validNumber).toBe(100);
    expect(sanitized.invalidNumber).toBe("not-a-number"); // Mantém string original
  });

  test("deve sanitizar objetos aninhados", () => {
    const data = {
      user: {
        name: '  <script>alert("xss")</script>  ',
        email: "test@example.com",
      },
    };

    const sanitized = sanitizeData(data);
    expect(sanitized.user.name).not.toContain("<script>");
    expect(sanitized.user.name).not.toContain("</script>");
    expect(sanitized.user.name.trim()).toBe("");
    expect(sanitized.user.email).toBe("test@example.com");
  });
});

describe("VALIDATION_SCHEMAS", () => {
  test("deve ter esquemas definidos", () => {
    expect(VALIDATION_SCHEMAS.createPixCharge).toBeDefined();
    expect(VALIDATION_SCHEMAS.webhook).toBeDefined();
    expect(VALIDATION_SCHEMAS.auth).toBeDefined();
  });

  test("esquema createPixCharge deve ter campos obrigatórios corretos", () => {
    const schema = VALIDATION_SCHEMAS.createPixCharge;
    expect(schema.required).toEqual([
      "wallet",
      "valor",
      "moeda",
      "id_transacao",
    ]);
  });
});
