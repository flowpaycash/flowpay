import fs from 'fs';
import path from 'path';
import { getWriteProof } from '../services/blockchain/write-proof.js';

// Simple .env loader
try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0 && !key.startsWith('#')) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) {
    console.warn('⚠️ Arquivo .env não encontrado ou não pôde ser lido.');
}

async function testRealOnChainProof() {
    console.log('🔗 Iniciando Prova de Integridade On-Chain...');
    console.log('📝 Branding: NSFACTORY Proof transaction to FLOWPAY');

    // Normalize RPC var name
    process.env.QUICKNODE_BASE_RPC = process.env.QUICKNODE_BASE_RPC_URL || process.env.QUICKNODE_BASE_RPC;

    if (!process.env.QUICKNODE_BASE_RPC) {
        console.error('❌ QUICKNODE_BASE_RPC não configurada no ambiente.');
        return;
    }

    const poe = getWriteProof();

    const testData = {
        pixChargeId: 'ARCH-VALIDATION-' + Date.now(),
        txHash: '0x' + 'a'.repeat(64), // Mock USDT tx hash
        recipientWallet: process.env.BLOCKCHAIN_WRITER_ADDRESS || '0x0000000000000000000000000000000000000000',
        amountBRL: 100.00,
        amountUSDT: 18.50,
        network: 'base',
        metadata: {
            batchId: '999',
            merkleRoot: '0x' + 'b'.repeat(64),
            reason: 'Manual Architect Validation for Marketing'
        }
    };

    try {
        const result = await poe.writeProof(testData);

        if (result.success) {
            console.log('\n✅ PROVA GRAVADA COM SUCESSO NA BASE!');
            console.log('--------------------------------------------------');
            console.log(`🆔 Proof ID: ${result.proof.id}`);
            console.log(`🔗 Transaction Hash: ${result.proof.txHash}`);
            console.log(`🧱 Block Number: ${result.proof.blockNumber}`);
            console.log(`🌐 Ver no Explorer: https://basescan.org/tx/${result.proof.txHash}`);
            console.log('--------------------------------------------------');
            console.log('💡 Dica: No Basescan, clique em "Original" na aba "Input Data" para ver o JSON com o branding da NSFactory!');
        } else {
            console.error('❌ Falha ao gravar prova.');
        }
    } catch (err) {
        console.error('❌ Erro durante a execução:', err.message);
        if (err.message.includes('insufficient funds')) {
            console.error('⚠️ ALERTA: A wallet BLOCKCHAIN_WRITER não tem saldo suficiente para pagar o gás na Base.');
        }
    }
}

testRealOnChainProof();
