import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

async function testQuickNode() {
    const rpcUrl = "https://responsive-damp-sky.base-mainnet.quiknode.pro/8441a50047cb3ebae59f1efea0ffcf2ae48c4d09/";

    console.log('🔗 Conectando ao QuickNode (Base Mainnet)...');

    const client = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    try {
        const blockNumber = await client.getBlockNumber();
        console.log(`✅ Conexão estabelecida!`);
        console.log(`📦 Bloco atual na Base: ${blockNumber}`);

        const gasPrice = await client.getGasPrice();
        console.log(`⛽ Preço do Gas: ${Number(gasPrice) / 1e9} gwei`);

        console.log('\n🚀 QuickNode está operacional para o Protocolo NΞØ.');
    } catch (err) {
        console.error('❌ Erro ao conectar ao QuickNode:', err.message);
    }
}

testQuickNode();
