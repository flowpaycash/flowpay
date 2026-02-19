// Jest Configuration for FLOWPay
module.exports = {
  // Diretório de testes
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Ignorar arquivos desnecessários
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.netlify/',
    '/public/',
    '/build/',
    '/dist/'
  ],
  
  // Configuração de cobertura
  collectCoverageFrom: [
    'netlify/functions/**/*.js',
    '!netlify/functions/test.mjs',
    '!netlify/functions/neo-config.mjs'
  ],
  
  // Limite de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Configuração de ambiente
  testEnvironment: 'node',
  
  // Timeout para testes
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Configuração de módulos
  moduleFileExtensions: ['js', 'json'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
