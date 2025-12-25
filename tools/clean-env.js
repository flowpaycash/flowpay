// FLOWPay - Limpador de Variáveis de Ambiente
// Remove duplicações e corrige nomes de variáveis no .env

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

const envPath = path.join(process.cwd(), '.env');
const backupPath = path.join(process.cwd(), '.env.backup');

// Ler arquivo .env
if (!fs.existsSync(envPath)) {
  console.error(colorize('❌ Arquivo .env não encontrado', 'red'));
  process.exit(1);
}

console.log(colorize('🔍 FLOWPay - Limpeza de Variáveis de Ambiente', 'blue'));
console.log('='.repeat(50));
console.log('');

// Fazer backup
const originalContent = fs.readFileSync(envPath, 'utf8');
fs.writeFileSync(backupPath, originalContent, 'utf8');
console.log(colorize(`✅ Backup criado: .env.backup`, 'green'));

// Processar linhas
const lines = originalContent.split('\n');
const processed = {
  vars: new Map(), // Map<varName, {value, lineIndex, comment}>
  comments: [],
  emptyLines: []
};

// Estratégias para variáveis duplicadas
const keepStrategy = {
  'INFURA_KEY': 'first', // Manter primeira (chave), remover URL
  'URL': 'first', // Manter primeira
  'CONVERSION_FEE_PERCENT': 'first', // Manter primeira
  'LIQUIDITY_PROVIDER_NAME': 'last' // Manter última (manual)
};

// Renomeações necessárias
const renames = {
  'QUICKNODE_POLYGON_URL': 'QUICKNODE_POLYGON_RPC',
  'QUICKNODE_BSC_URL': 'QUICKNODE_BSC_RPC',
  'QUICKNODE_ETHEREUM_URL': 'QUICKNODE_ETHEREUM_RPC',
  'QUICKNODE_ARBITRUM_URL': 'QUICKNODE_ARBITRUM_RPC',
  'QUICKNODE_OPTIMISM_URL': 'QUICKNODE_OPTIMISM_RPC'
};

let lineIndex = 0;
let currentComment = [];

for (const line of lines) {
  const trimmed = line.trim();
  
  // Comentários
  if (trimmed.startsWith('#')) {
    currentComment.push(line);
    continue;
  }
  
  // Linha vazia
  if (trimmed === '') {
    processed.emptyLines.push({ line, index: lineIndex });
    lineIndex++;
    continue;
  }
  
  // Variável de ambiente
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    let varName = match[1];
    const value = match[2];
    
    // Verificar se precisa renomear
    if (renames[varName]) {
      console.log(colorize(`🔄 Renomeando: ${varName} → ${renames[varName]}`, 'yellow'));
      varName = renames[varName];
    }
    
    // Verificar duplicação
    if (processed.vars.has(varName)) {
      const existing = processed.vars.get(varName);
      const strategy = keepStrategy[varName] || 'last';
      
      if (strategy === 'first') {
        console.log(colorize(`⚠️  Removendo duplicação: ${varName} (linha ${lineIndex + 1})`, 'yellow'));
        // Manter a primeira, ignorar esta
        lineIndex++;
        continue;
      } else if (strategy === 'last') {
        console.log(colorize(`⚠️  Substituindo: ${varName} (mantendo última ocorrência)`, 'yellow'));
        // Substituir pela última
        processed.vars.set(varName, {
          value,
          lineIndex,
          comment: currentComment.length > 0 ? [...currentComment] : existing.comment
        });
      }
    } else {
      // Primeira ocorrência
      processed.vars.set(varName, {
        value,
        lineIndex,
        comment: currentComment.length > 0 ? [...currentComment] : []
      });
    }
    
    currentComment = [];
  }
  
  lineIndex++;
}

// Reconstruir arquivo
const newLines = [];
const varEntries = Array.from(processed.vars.entries())
  .sort((a, b) => a[1].lineIndex - b[1].lineIndex);

// Agrupar por seções (baseado em comentários)
let currentSection = [];
let output = [];

// Ler novamente para manter estrutura
let inSection = false;
let sectionVars = new Set();

for (const line of lines) {
  const trimmed = line.trim();
  
  // Se for comentário de seção, começar nova seção
  if (trimmed.match(/^#\s*={3,}/) || trimmed.match(/^#\s*[🔑🔐💬🔗🌐🛡️📧🌍📊💱💸]/)) {
    // Finalizar seção anterior
    if (inSection && sectionVars.size > 0) {
      // Adicionar variáveis da seção em ordem
      const sectionVarNames = Array.from(sectionVars);
      const varsToAdd = varEntries.filter(([name]) => sectionVarNames.includes(name));
      varsToAdd.forEach(([name, data]) => {
        if (data.comment.length > 0) {
          output.push(...data.comment);
        }
        output.push(`${name}=${data.value}`);
      });
      sectionVars.clear();
    }
    
    output.push(line);
    inSection = true;
    continue;
  }
  
  // Se for variável, adicionar ao conjunto da seção
  const varMatch = line.match(/^([A-Z_]+)=/);
  if (varMatch) {
    let varName = varMatch[1];
    // Verificar se foi renomeada
    for (const [oldName, newName] of Object.entries(renames)) {
      if (varName === oldName) {
        varName = newName;
        break;
      }
    }
    
    // Verificar se já processamos esta variável
    if (processed.vars.has(varName)) {
      const data = processed.vars.get(varName);
      // Verificar se é a ocorrência que queremos manter
      const keepThis = keepStrategy[varName] === 'last' || !processed.vars.has(varName) || 
                       processed.vars.get(varName).lineIndex === lines.indexOf(line);
      
      if (keepThis && !sectionVars.has(varName)) {
        sectionVars.add(varName);
      } else {
        // Pular esta linha (duplicada)
        continue;
      }
    } else {
      sectionVars.add(varName);
    }
    continue;
  }
  
  // Outras linhas (comentários, vazias)
  if (trimmed.startsWith('#') || trimmed === '') {
    output.push(line);
  }
}

// Adicionar variáveis restantes que não estavam em seções
const remainingVars = varEntries.filter(([name]) => !sectionVars.has(name));
if (remainingVars.length > 0) {
  output.push('');
  output.push('# ============================================');
  output.push('# 📝 Variáveis Adicionais');
  output.push('# ============================================');
  remainingVars.forEach(([name, data]) => {
    if (data.comment.length > 0) {
      output.push(...data.comment);
    }
    output.push(`${name}=${data.value}`);
  });
}

// Método mais simples: reconstruir mantendo estrutura
const simpleOutput = [];
const seenVars = new Set();
const varMap = new Map();

// Primeiro, mapear todas as variáveis processadas
for (const [name, data] of processed.vars.entries()) {
  varMap.set(name, data);
}

// Reconstruir linha por linha
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Comentários e linhas vazias sempre incluir
  if (trimmed.startsWith('#') || trimmed === '') {
    simpleOutput.push(line);
    continue;
  }
  
  // Variável
  const varMatch = line.match(/^([A-Z_]+)=(.*)$/);
  if (varMatch) {
    let varName = varMatch[1];
    const originalValue = varMatch[2];
    
    // Verificar renomeação
    if (renames[varName]) {
      varName = renames[varName];
    }
    
    // Verificar se já vimos esta variável
    if (seenVars.has(varName)) {
      // Duplicada - verificar estratégia
      const strategy = keepStrategy[varName] || 'last';
      if (strategy === 'first') {
        // Pular esta (já temos a primeira)
        continue;
      } else {
        // Substituir valor anterior
        const prevIndex = simpleOutput.findIndex(l => l.match(new RegExp(`^${varName}=`)));
        if (prevIndex >= 0) {
          simpleOutput[prevIndex] = `${varName}=${originalValue}`;
        }
        continue;
      }
    }
    
    // Primeira ocorrência ou última (dependendo da estratégia)
    seenVars.add(varName);
    simpleOutput.push(`${varName}=${originalValue}`);
  } else {
    // Linha que não é variável nem comentário (manter)
    simpleOutput.push(line);
  }
}

// Escrever arquivo limpo
const cleanedContent = simpleOutput.join('\n') + '\n';
fs.writeFileSync(envPath, cleanedContent, 'utf8');

console.log('');
console.log(colorize('✅ Arquivo .env limpo com sucesso!', 'green'));
console.log('');
console.log(colorize('📊 Resumo:', 'blue'));
console.log(`   - Variáveis processadas: ${processed.vars.size}`);
console.log(`   - Duplicações removidas: ${lines.length - simpleOutput.length}`);
console.log(`   - Backup salvo em: .env.backup`);
console.log('');

// Verificar se há variáveis que precisam ser adicionadas
const missingVars = [];
if (!seenVars.has('QUICKNODE_BASE_RPC')) {
  missingVars.push('QUICKNODE_BASE_RPC');
}
if (!seenVars.has('QUICKNODE_POLYGON_RPC') && !seenVars.has('QUICKNODE_POLYGON_URL')) {
  missingVars.push('QUICKNODE_POLYGON_RPC');
}

if (missingVars.length > 0) {
  console.log(colorize('⚠️  Variáveis que ainda precisam ser configuradas:', 'yellow'));
  missingVars.forEach(v => {
    console.log(`   - ${v}`);
  });
  console.log('');
  console.log('Após criar endpoints no QuickNode, adicione:');
  console.log('   QUICKNODE_BASE_RPC=https://xxx.base.quiknode.pro/xxx/');
  console.log('   QUICKNODE_POLYGON_RPC=https://xxx.polygon.quiknode.pro/xxx/');
  console.log('');
}

console.log(colorize('💡 Dica: Revise o arquivo .env antes de usar em produção', 'blue'));

