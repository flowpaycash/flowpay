#!/usr/bin/env node

/**
 * 🚀 FLOWPay - Teste Avançado da API PIX
 * Script Node.js para testar a criação de cobranças PIX via Woovi
 */

const https = require('https');
const http = require('http');

// Configurações
const CONFIG = {
  baseUrl: 'http://localhost:8888',
  endpoint: '/.netlify/functions/create-pix-charge',
  timeout: 10000,
  retries: 3
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Função para fazer requisição HTTP
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.setTimeout(CONFIG.timeout);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Função para testar uma cobrança
async function testPixCharge(testName, payload, expectedStatus = 200) {
  console.log(`\n${colors.blue}🧪 ${testName}${colors.reset}`);
  console.log(`${colors.cyan}Payload:${colors.reset}`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await makeRequest(
      `${CONFIG.baseUrl}${CONFIG.endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FLOWPay-PIX-Test/1.0'
        }
      },
      JSON.stringify(payload)
    );

    console.log(`${colors.cyan}Status:${colors.reset} ${colors.yellow}${response.statusCode}${colors.reset}`);
    
    let responseData;
    try {
      responseData = JSON.parse(response.body);
      console.log(`${colors.cyan}Resposta:${colors.reset}`);
      console.log(JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log(`${colors.cyan}Resposta (raw):${colors.reset}`, response.body);
    }

    // Validar resposta
    if (response.statusCode === expectedStatus) {
      console.log(`${colors.green}✅ Teste passou!${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ Teste falhou! Esperado: ${expectedStatus}, Recebido: ${response.statusCode}${colors.reset}`);
      return false;
    }

  } catch (error) {
    console.log(`${colors.red}❌ Erro na requisição:${colors.reset}`, error.message);
    return false;
  }
}

// Função principal de teste
async function runTests() {
  console.log(`${colors.magenta}🚀 FLOWPay - Teste Avançado da API PIX${colors.reset}`);
  console.log(`${colors.magenta}==========================================${colors.reset}`);
  console.log(`URL Base: ${CONFIG.baseUrl}`);
  console.log(`Endpoint: ${CONFIG.endpoint}`);
  console.log(`Timeout: ${CONFIG.timeout}ms`);
  console.log(`Retries: ${CONFIG.retries}`);
  
  // Verificar se o servidor está rodando
  try {
    const healthCheck = await makeRequest(
      `${CONFIG.baseUrl}${CONFIG.endpoint}`,
      { method: 'OPTIONS' }
    );
    console.log(`\n${colors.green}✅ Servidor acessível${colors.reset}`);
  } catch (error) {
    console.log(`\n${colors.red}❌ Servidor não acessível:${colors.reset}`, error.message);
    console.log(`${colors.yellow}💡 Certifique-se de que 'netlify dev' está rodando${colors.reset}`);
    return;
  }

  const tests = [
    {
      name: "Cobrança PIX válida",
      payload: {
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: 50.00,
        moeda: "BRL",
        id_transacao: "test_pix_001"
      },
      expectedStatus: 200
    },
    {
      name: "Valor baixo (validação)",
      payload: {
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: 0.50,
        moeda: "BRL",
        id_transacao: "test_pix_002"
      },
      expectedStatus: 200
    },
    {
      name: "Wallet inválido",
      payload: {
        wallet: "invalid_wallet",
        valor: 25.00,
        moeda: "BRL",
        id_transacao: "test_pix_003"
      },
      expectedStatus: 400
    },
    {
      name: "Campos obrigatórios faltando",
      payload: {
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: 100.00
      },
      expectedStatus: 400
    },
    {
      name: "Valor zero",
      payload: {
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: 0,
        moeda: "BRL",
        id_transacao: "test_pix_005"
      },
      expectedStatus: 400
    },
    {
      name: "Valor negativo",
      payload: {
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: -10.00,
        moeda: "BRL",
        id_transacao: "test_pix_006"
      },
      expectedStatus: 400
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  console.log(`\n${colors.blue}📋 Executando ${totalTests} testes...${colors.reset}`);

  for (const test of tests) {
    const passed = await testPixCharge(test.name, test.payload, test.expectedStatus);
    if (passed) passedTests++;
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumo final
  console.log(`\n${colors.magenta}📊 Resumo dos Testes${colors.reset}`);
  console.log(`${colors.magenta}==================${colors.reset}`);
  console.log(`${colors.green}✅ Testes passaram: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Testes falharam: ${totalTests - passedTests}${colors.reset}`);
  console.log(`${colors.blue}📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%${colors.reset}`);

  if (passedTests === totalTests) {
    console.log(`\n${colors.green}🎉 Todos os testes passaram!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Alguns testes falharam. Verifique os logs acima.${colors.reset}`);
  }

  console.log(`\n${colors.cyan}💡 Dicas:${colors.reset}`);
  console.log("- Verifique se WOOVI_API_KEY está configurada");
  console.log("- Monitore os logs do servidor para detalhes");
  console.log("- Use 'netlify dev' para desenvolvimento local");
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testPixCharge, makeRequest };
