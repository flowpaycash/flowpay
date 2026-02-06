// 🔧 FLOWPay - Setup QuickNode Webhooks
// Script para configurar webhooks do QuickNode usando templates

const { getQuickNodeREST } = require('../services/blockchain/quicknode-rest');
const { getWalletRegistry } = require('../services/crypto/wallet-registry');

async function setupWebhooks() {
  try {
    console.log('🔧 Configurando webhooks QuickNode...\n');

    const rest = getQuickNodeREST();

    // 1. Verificar API Key
    console.log('1️⃣ Verificando API Key...');
    try {
      const response = await fetch('https://api.quicknode.com/v0/billing/invoices', {
        headers: {
          'x-api-key': process.env.QUICKNODE_API_KEY,
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`);
      }

      console.log('✅ API Key válida!\n');
    } catch (error) {
      console.error('❌ Erro ao verificar API Key:', error.message);
      process.exit(1);
    }

    // 2. Listar webhooks existentes
    console.log('2️⃣ Listando webhooks existentes...');
    const existingWebhooks = await rest.listWebhooks();
    console.log(`   Encontrados: ${existingWebhooks.webhooks.length} webhook(s)\n`);

    // 3. Configurar monitoramento USDT (Ethereum)
    console.log('3️⃣ Configurando monitoramento USDT (Ethereum)...');
    try {
      const usdtWebhook = await rest.monitorUSDTTransfers(
        null, // Usa endereço padrão
        'ethereum',
        process.env.URL ? `${process.env.URL}/api/webhooks/quicknode` : null
      );
      console.log(`   ✅ Webhook criado: ${usdtWebhook.webhook.id || usdtWebhook.webhook.webhook_id}\n`);
    } catch (error) {
      console.error(`   ⚠️ Erro: ${error.message}\n`);
    }

    // 4. Configurar monitoramento USDT (Polygon)
    console.log('4️⃣ Configurando monitoramento USDT (Polygon)...');
    try {
      const polygonWebhook = await rest.monitorUSDTTransfers(
        null,
        'polygon',
        process.env.URL ? `${process.env.URL}/api/webhooks/quicknode` : null
      );
      console.log(`   ✅ Webhook criado: ${polygonWebhook.webhook.id || polygonWebhook.webhook.webhook_id}\n`);
    } catch (error) {
      console.error(`   ⚠️ Erro: ${error.message}\n`);
    }

    // 5. Listar webhooks finais
    console.log('5️⃣ Webhooks configurados:');
    const finalWebhooks = await rest.listWebhooks();
    finalWebhooks.webhooks.forEach((webhook, index) => {
      console.log(`   ${index + 1}. ${webhook.name || webhook.id} (${webhook.network || 'N/A'})`);
    });

    console.log('\n✅ Setup concluído!');

  } catch (error) {
    console.error('❌ Erro no setup:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupWebhooks();
}

module.exports = { setupWebhooks };

