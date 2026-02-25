import { createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

async function auditBlockchainWriter() {
    const rpcUrl = "https://responsive-damp-sky.base-mainnet.quiknode.pro/8441a50047cb3ebae59f1efea0ffcf2ae48c4d09/";
    const privKey = "0xfc0c8d51b563597a20eacc7565e233e55f06e2c8a71b9a341c00f836d9853780";
    const expectedAddress = "0x470a8c640fFC2C16aEB6bE803a948420e2aE8456";

    console.log('⟁ Iniciando Auditoria NSFactory - Blockchain Writer...');

    try {
        const account = privateKeyToAccount(privKey);
        console.log(`🔑 Carteira derivada: ${account.address}`);

        if (account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
            console.error('❌ ERRO CRÍTICO: O endereço derivado da chave privada não coincide com o BLOCKCHAIN_WRITER_ADDRESS no .env!');
        } else {
            console.log('✅ Endereço e Chave Privada conferem.');
        }

        const client = createPublicClient({
            chain: base,
            transport: http(rpcUrl),
        });

        console.log('⏳ Verificando saldo na Base Mainnet...');
        const balance = await client.getBalance({ address: account.address });
        const balanceEth = formatEther(balance);

        console.log(`💰 Saldo Atual: ${balanceEth} ETH`);

        if (parseFloat(balanceEth) === 0) {
            console.warn('⚠️ ALERTA: Saldo zerado. O Writer não conseguirá registrar Proof of Integrity on-chain.');
            console.log('📌 Nota: O sistema cairá para o modo "Soberano Local" (Log/DB) conforme configurado.');
        } else if (parseFloat(balanceEth) < 0.001) {
            console.warn('🟡 SALDO BAIXO: Recomenda-se recarga para sustentar o volume de lançamento.');
        } else {
            console.log('🚀 Saldo suficiente para operações iniciais.');
        }

    } catch (err) {
        console.error('❌ Falha na auditoria técnica:', err.message);
    }
}

auditBlockchainWriter();
