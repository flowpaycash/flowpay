import { createPublicClient, http, webSocket } from 'viem';
import { mainnet, polygon, base } from 'viem/chains';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis do .env
config({ path: join(__dirname, '../.env') });

async function testInfura() {
    console.log('🔍 Iniciando Testes de Conexão com INFURA...');
    console.log('--------------------------------------------------');

    const apiKey = process.env.INFURA_API_KEY;
    const apiSecret = process.env.INFURA_API_SECRET;
    const polygonWss = process.env.INFURA_POLYGON_WSS;
    const baseRpc = process.env.INFURA_BASE_RPC;

    if (!apiKey) {
        console.error('❌ ERRO: INFURA_API_KEY não encontrada no arquivo .env');
        return;
    }

    // Criando um header fake "Origin" para simular o navegador
    // Use um domínio que você tenha cadastrado lá na Infura ("localhost", "flowpay.cash", etc)
    const MOCK_ORIGIN = "https://flowpay.cash";
    const fetchOptions = { headers: { Origin: MOCK_ORIGIN } };

    console.log(`✅ INFURA_API_KEY detectada: ${apiKey.substring(0, 6)}...`);
    console.log(`🛡️ Simulando requisição de Browser vindo de: ${MOCK_ORIGIN}`);
    if (apiSecret) console.log(`✅ INFURA_API_SECRET detectada: ${apiSecret.substring(0, 6)}... (Não enviada em chamadas públicas RPC, usada apenas para backend calls)`);

    try {
        // 1. Teste - Polygon (Onde o FLOWPay de fato roda o Account Abstraction)
        console.log('\n📡 Testando -> Polygon Mainnet (HTTP c/ Origin Headers)...');
        const polyClientHttp = createPublicClient({
            chain: polygon,
            transport: http(`https://polygon-mainnet.infura.io/v3/${apiKey}`, { fetchOptions })
        });
        const polyBlockHttp = await polyClientHttp.getBlockNumber();
        console.log(`✅ Sucesso! Bloco atual na Polygon: ${polyBlockHttp}`);

        // 2. Teste - Ethereum Mainnet (Apenas para checar se a chave é multi-chain)
        console.log('\n📡 Testando -> Ethereum Mainnet (HTTP)...');
        const ethClient = createPublicClient({
            chain: mainnet,
            transport: http(`https://mainnet.infura.io/v3/${apiKey}`, { fetchOptions })
        });
        const ethBlock = await ethClient.getBlockNumber();
        console.log(`✅ Sucesso! Bloco atual na Ethereum: ${ethBlock}`);

    } catch (error) {
        console.error('\n❌ FALHA NA CONEXÃO COM A INFURA:');

        if (error.message.includes('401') || error.message.includes('Forbidden') || error.message.includes('Unauthorized')) {
            console.error('👉 ERRO DE AUTORIZAÇÃO (401/403).');
            console.error(`O script tentou falsificar a origem '${MOCK_ORIGIN}', mas a Infura bloqueou.`);
            console.error('💡 Solução: Adicione "https://flowpay.cash" e "localhost" à lista "Allowlists -> Origins" no painel da Infura (abaixo das chaves JWT). Ou certifique-se de que a nova API_KEY colada no .env é válida.');
        } else {
            console.error(`MOTIVO: ${error.message}`);
        }
    }
}

testInfura();
