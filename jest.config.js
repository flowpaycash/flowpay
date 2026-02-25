// Jest Configuration for FLOWPay
export default {
  testMatch: ["**/tests/**/*.test.js"],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/.railway/",
    "/public/",
    "/build/",
    "/dist/",
  ],

  // Configuração de cobertura
  collectCoverageFrom: ["src/pages/api/**/*.js", "src/services/api/**/*.mjs"],

  // Limite de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Configuração de ambiente
  testEnvironment: "node",

  // Timeout para testes
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Configuração de módulos
  moduleFileExtensions: ["js", "json"],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
