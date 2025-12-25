// FLOWPay - Adicionar Variáveis QuickNode
// Script auxiliar para adicionar QUICKNODE_BASE_RPC e QUICKNODE_POLYGON_RPC

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

const envPath = path.join(process.cwd(), '.env');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log(colorize('🔗 FLOWPay - Adicionar Variáveis QuickNode', 'blue'));
  console.log('='.repeat(50));
  console.log('');

  if (!fs.existsSync(envPath)) {
    console.error(colorize('❌ Arquivo .env não encontrado', 'red'));
    process.exit(1);
  }

  // Ler arquivo atual
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Verificar se já existem
  const hasBaseRPC = envContent.includes('QUICKNODE_BASE_RPC=');
  const hasPolygonRPC = envContent.includes('QUICKNODE_POLYGON_RPC=');

  if (hasBaseRPC && hasPolygonRPC) {
    console.log(colorize('✅ Variáveis QuickNode já estão configuradas', 'green'));
    rl.close();
    return;
  }

  console.log(colorize('📝 Configure os endpoints QuickNode:', 'blue'));
  console.log('');

  let baseRPC = '';
  let polygonRPC = '';

  // Solicitar QUICKNODE_BASE_RPC
  if (!hasBaseRPC) {
    baseRPC = await question(colorize('QUICKNODE_BASE_RPC (Base - Proof Layer): ', 'yellow'));
    if (!baseRPC.trim()) {
      console.log(colorize('⚠️  QUICKNODE_BASE_RPC não informada, pulando...', 'yellow'));
    }
  } else {
    const match = envContent.match(/^QUICKNODE_BASE_RPC=(.+)$/m);
    if (match) {
      baseRPC = match[1];
      console.log(colorize(`✅ QUICKNODE_BASE_RPC já configurada: ${baseRPC.substring(0, 30)}...`, 'green'));
    }
  }

  console.log('');

  // Solicitar QUICKNODE_POLYGON_RPC
  if (!hasPolygonRPC) {
    polygonRPC = await question(colorize('QUICKNODE_POLYGON_RPC (Polygon - USDT Settlement): ', 'yellow'));
    if (!polygonRPC.trim()) {
      console.log(colorize('⚠️  QUICKNODE_POLYGON_RPC não informada, pulando...', 'yellow'));
    }
  } else {
    const match = envContent.match(/^QUICKNODE_POLYGON_RPC=(.+)$/m);
    if (match) {
      polygonRPC = match[1];
      console.log(colorize(`✅ QUICKNODE_POLYGON_RPC já configurada: ${polygonRPC.substring(0, 30)}...`, 'green'));
    }
  }

  console.log('');

  // Adicionar variáveis ao arquivo
  let newContent = envContent;
  let added = false;

  // Encontrar seção QuickNode ou criar
  const quicknodeSection = /# ============================================\s*# 🔗 QUICKNODE/i;
  const quicknodeMatch = newContent.match(quicknodeSection);

  if (quicknodeMatch) {
    // Adicionar após a seção QuickNode existente
    const insertIndex = newContent.indexOf(quicknodeMatch[0]) + quicknodeMatch[0].length;
    const lines = newContent.split('\n');
    let insertLine = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('QUICKNODE') && lines[i].match(/^# ============================================/)) {
        // Encontrar fim da seção QuickNode
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^# ============================================/)) {
            insertLine = j;
            break;
          }
        }
        break;
      }
    }

    if (insertLine === -1) {
      // Adicionar no final
      insertLine = lines.length;
    }

    const varsToAdd = [];
    if (baseRPC && !hasBaseRPC) {
      varsToAdd.push(`QUICKNODE_BASE_RPC=${baseRPC.trim()}`);
      added = true;
    }
    if (polygonRPC && !hasPolygonRPC) {
      varsToAdd.push(`QUICKNODE_POLYGON_RPC=${polygonRPC.trim()}`);
      added = true;
    }

    if (varsToAdd.length > 0) {
      lines.splice(insertLine, 0, '', ...varsToAdd);
      newContent = lines.join('\n');
    }
  } else {
    // Criar nova seção QuickNode
    const quicknodeSection = `
# ============================================
# 🔗 QUICKNODE / BLOCKCHAIN
# URLs QuickNode para conexão RPC com blockchains
# Obtenha em: https://www.quicknode.com
# Recomendado para produção (melhor performance e confiabilidade)
`;
    const varsToAdd = [];
    if (baseRPC && !hasBaseRPC) {
      varsToAdd.push(`QUICKNODE_BASE_RPC=${baseRPC.trim()}`);
      added = true;
    }
    if (polygonRPC && !hasPolygonRPC) {
      varsToAdd.push(`QUICKNODE_POLYGON_RPC=${polygonRPC.trim()}`);
      added = true;
    }

    if (varsToAdd.length > 0) {
      // Adicionar antes da última linha vazia ou no final
      const lines = newContent.split('\n');
      lines.push(quicknodeSection.trim(), ...varsToAdd);
      newContent = lines.join('\n');
    }
  }

  if (added) {
    // Fazer backup
    const backupPath = path.join(process.cwd(), '.env.backup');
    fs.writeFileSync(backupPath, envContent, 'utf8');
    console.log(colorize('✅ Backup criado: .env.backup', 'green'));

    // Escrever arquivo atualizado
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log(colorize('✅ Variáveis QuickNode adicionadas com sucesso!', 'green'));
    console.log('');
    console.log(colorize('📋 Variáveis adicionadas:', 'blue'));
    if (baseRPC && !hasBaseRPC) {
      console.log(`   ✅ QUICKNODE_BASE_RPC`);
    }
    if (polygonRPC && !hasPolygonRPC) {
      console.log(`   ✅ QUICKNODE_POLYGON_RPC`);
    }
  } else {
    console.log(colorize('ℹ️  Nenhuma variável nova foi adicionada', 'blue'));
  }

  rl.close();
}

main().catch((error) => {
  console.error(colorize('❌ Erro:', 'red'), error.message);
  rl.close();
  process.exit(1);
});

