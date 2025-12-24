// 🧪 FLOWPay - Test Runner
// Executa todos os testes unitários

const fs = require('fs');
const path = require('path');

// Configuração de testes
const TEST_DIR = __dirname;
const TEST_FILES = [
  'error-handler.test.js',
  'validation-middleware.test.js'
];

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Função para executar um arquivo de teste
function runTestFile(testFile) {
  const testPath = path.join(TEST_DIR, testFile);
  
  if (!fs.existsSync(testPath)) {
    console.log(`${colors.red}❌ Arquivo de teste não encontrado: ${testFile}${colors.reset}`);
    return { success: false, error: 'File not found' };
  }
  
  try {
    console.log(`${colors.blue}🧪 Executando: ${testFile}${colors.reset}`);
    
    // Executar o arquivo de teste
    require(testPath);
    
    console.log(`${colors.green}✅ ${testFile} - Passou${colors.reset}`);
    return { success: true, error: null };
  } catch (error) {
    console.log(`${colors.red}❌ ${testFile} - Falhou: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

// Função principal para executar todos os testes
function runAllTests() {
  console.log(`${colors.bold}${colors.blue}🚀 FLOWPay - Test Runner${colors.reset}`);
  console.log(`${colors.blue}================================${colors.reset}\n`);
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  // Executar cada arquivo de teste
  TEST_FILES.forEach(testFile => {
    const result = runTestFile(testFile);
    results.push({ file: testFile, ...result });
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    console.log(''); // Linha em branco entre testes
  });
  
  // Resumo dos resultados
  console.log(`${colors.blue}================================${colors.reset}`);
  console.log(`${colors.bold}📊 Resumo dos Testes:${colors.reset}`);
  console.log(`${colors.green}✅ Passou: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Falhou: ${failed}${colors.reset}`);
  console.log(`${colors.blue}📁 Total: ${results.length}${colors.reset}\n`);
  
  // Detalhes dos testes que falharam
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log(`${colors.red}❌ Testes que falharam:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`  - ${test.file}: ${test.error}`);
    });
    console.log('');
  }
  
  // Status final
  if (failed === 0) {
    console.log(`${colors.green}${colors.bold}🎉 Todos os testes passaram!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}💥 Alguns testes falharam!${colors.reset}`);
    process.exit(1);
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  runTestFile,
  TEST_FILES
};
