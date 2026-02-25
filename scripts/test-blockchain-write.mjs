import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

async function testGasSelfTransfer() {
    const rpcUrl = "https://responsive-damp-sky.base-mainnet.quiknode.pro/8441a50047cb3ebae59f1efea0ffcf2ae48c4d09/";
    const privKey = "0xfc0c8d51b563597a20eacc7565e233e55f06e2c8a71b9a341c00f836d9853780";

    const account = privateKeyToAccount(privKey);
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
    const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl) });

    console.log(`🚀 Iniciando Teste de Escrita (Self-Transfer) na rede Base...`);
    console.log(`👛 Origin: ${account.address}`);

    try {
        // Obter preço do gas atual
        const gasPrice = await client.getGasPrice();
        const gasLimit = 21000n; // Transferência simples
        const cost = gasPrice * gasLimit;

        console.log(`⛽ Custo estimado da transação: ${Number(cost) / 1e18} ETH`);

        const balance = await client.getBalance({ address: account.address });
        console.log(`💰 Saldo disponível: ${Number(balance) / 1e18} ETH`);

        if (balance < cost) {
            console.error('❌ Saldo insuficiente até para a transação mais simples.');
            return;
        }

        console.log('📝 Enviando transação de auto-envio (Proof of Write)...');

        // Enviamos 0 ETH para nós mesmos apenas para validar a assinatura e o broadcast pela QuickNode
        const hash = await wallet.sendTransaction({
            to: account.address,
            value: 0n,
            gas: gasLimit,
            maxFeePerGas: gasPrice * 12n / 10n, // 20% buffer
            maxPriorityFeePerGas: gasPrice / 2n
        });

        console.log(`✅ Transação enviada com Sucesso!`);
        console.log(`🔗 Hash: https://basescan.org/tx/${hash}`);
        console.log('⏳ Aguardando confirmação (1 bloco)...');

        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log(`🎊 Transação confirmada no bloco: ${receipt.blockNumber}`);
        console.log('Status: SUCCESS');

    } catch (err) {
        console.error('❌ Falha no teste de escrita:', err.message);
    }
}

testGasSelfTransfer();
