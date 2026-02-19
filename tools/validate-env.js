// FLOWPay - Validador de Variáveis de Ambiente
// Verifica se todas as variáveis necessárias estão configuradas

const fs = require('fs');
const path = require('path');

// Cores para terminal
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Variáveis obrigatórias
const REQUIRED = {
  WOOVI_API_KEY: 'Chave da API Woovi/OpenPix (obrigatória)'
};

// Variáveis opcionais mas importantes
const OPTIONAL = {
  WOOVI_WEBHOOK_SECRET: 'Secret para validação de webhooks Woovi',
  WOOVI_API_URL: 'URL da API Woovi (padrão: https://api.woovi.com)',
  QUICKNODE_BASE_RPC: 'RPC URL do QuickNode para Base (proof layer)',
  QUICKNODE_POLYGON_RPC: 'RPC URL do QuickNode para Polygon (USDT settlement)',
  QUICKNODE_BSC_RPC: 'RPC URL do QuickNode para BSC (USDT settlement)',
  QUICKNODE_ETHEREUM_RPC: 'RPC URL do QuickNode para Ethereum (read-only)',
  SERVICE_WALLET_ADDRESS: 'Endereço da wallet do serviço (para envio de USDT)',
  SERVICE_WALLET_PRIVATE_KEY: 'Chave privada da wallet do serviço',
  BLOCKCHAIN_WRITER_ADDRESS: 'Endereço da wallet para escrita on-chain (provas)',
  BLOCKCHAIN_WRITER_PRIVATE_KEY: 'Chave privada da wallet de escrita',
  USDT_SETTLEMENT_NETWORK: 'Rede para liquidação USDT (polygon ou bsc)',
  WEB3AUTH_CLIENT_ID: 'Client ID do Web3Auth',
  ADMIN_PASSWORD: 'Senha do painel admin',
  TELEGRAM_BOT_TOKEN: 'Token do bot Telegram',
  TELEGRAM_CHAT_ID: 'Chat ID do Telegram'
};

// Carregar .env se existir
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

console.log(colorize('🔍 FLOWPay - Validação de Variáveis de Ambiente', 'blue'));
console.log('='.repeat(50));
console.log('');

// Verificar obrigatórias
console.log(colorize('📋 Variáveis Obrigatórias:', 'blue'));
console.log('');

let missingRequired = 0;
for (const [varName, description] of Object.entries(REQUIRED)) {
  const value = process.env[varName];
  if (!value) {
    console.log(colorize(`❌ ${varName}`, 'red'), '- NÃO CONFIGURADA');
    console.log(`   ${description}`);
    missingRequired++;
  } else {
    const masked = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PRIVATE')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    console.log(colorize(`✅ ${varName}`, 'green'), `- ${masked}`);
  }
}

console.log('');
console.log(colorize('📋 Variáveis Opcionais (Importantes):', 'blue'));
console.log('');

let missingOptional = 0;
for (const [varName, description] of Object.entries(OPTIONAL)) {
  const value = process.env[varName];
  if (!value) {
    console.log(colorize(`⚠️  ${varName}`, 'yellow'), '- Não configurada');
    console.log(`   ${description}`);
    missingOptional++;
  } else {
    const masked = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PRIVATE')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    console.log(colorize(`✅ ${varName}`, 'green'), `- ${masked}`);
  }
}

console.log('');

// Verificações específicas
console.log(colorize('🔍 Verificações Específicas:', 'blue'));
console.log('');

// Verificar duplicação de INFURA_KEY
if (process.env.INFURA_KEY && process.env.INFURA_KEY.startsWith('http')) {
  console.log(colorize('⚠️  INFURA_KEY', 'yellow'), '- Parece ser uma URL, deveria ser apenas a chave');
}

// Verificar USDT_SETTLEMENT_NETWORK
if (process.env.USDT_SETTLEMENT_NETWORK) {
  const network = process.env.USDT_SETTLEMENT_NETWORK.toLowerCase();
  if (network !== 'polygon' && network !== 'bsc') {
    console.log(colorize('⚠️  USDT_SETTLEMENT_NETWORK', 'yellow'), `- Valor inválido: ${network} (deve ser 'polygon' ou 'bsc')`);
  } else {
    const rpcVar = `QUICKNODE_${network.toUpperCase()}_RPC`;
    if (!process.env[rpcVar]) {
      console.log(colorize('⚠️  ' + rpcVar, 'yellow'), `- Não configurada (necessária para ${network})`);
    }
  }
}

// Verificar QuickNode
if (!process.env.QUICKNODE_BASE_RPC) {
  console.log(colorize('⚠️  QUICKNODE_BASE_RPC', 'yellow'), '- Não configurada (necessária para provas on-chain)');
}

// Resumo
console.log('');
console.log('='.repeat(50));

if (missingRequired > 0) {
  console.log(colorize(`❌ ${missingRequired} variável(is) obrigatória(s) não configurada(s)`, 'red'));
  console.log('');
  console.log('Configure as variáveis faltantes no arquivo .env');
  process.exit(1);
} else {
  console.log(colorize('✅ Todas as variáveis obrigatórias estão configuradas', 'green'));
  if (missingOptional > 0) {
    console.log(colorize(`⚠️  ${missingOptional} variável(is) opcional(is) não configurada(s)`, 'yellow'));
    console.log('Algumas funcionalidades podem não estar disponíveis');
  }
}

console.log('');
