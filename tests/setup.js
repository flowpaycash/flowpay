// Jest Setup for FLOWPay
// Configuração global para testes

// Mock para console.log para evitar spam nos testes
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Reduzir verbosidade dos logs durante os testes
  console.log = (...args) => {
    if (process.env.NODE_ENV !== 'test' || args[0]?.includes('TEST')) {
      originalConsoleLog(...args);
    }
  };
  
  console.error = (...args) => {
    if (process.env.NODE_ENV !== 'test' || args[0]?.includes('ERROR')) {
      originalConsoleError(...args);
    }
  };
});

afterAll(() => {
  // Restaurar console original
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.WOOVI_API_KEY = 'test-api-key';
process.env.WOOVI_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.ADMIN_PASSWORD = 'test-password';
