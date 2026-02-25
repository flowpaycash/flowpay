import { getWriteProof } from '../../../../services/blockchain/write-proof.js';
import { secureLog } from '../../../../src/services/api/config.mjs';

export const POST = async ({ request }) => {
    // Para facilitar o teste do arquiteto, vamos permitir este trigger via POST
    // Mas em prod isso seria protegido por requireAdminSession

    console.log('🚀 Triggering manual on-chain proof from API');

    const poe = getWriteProof();

    const testData = {
        pixChargeId: 'MKT-PROOF-' + Date.now(),
        txHash: '0x' + 'c'.repeat(64),
        recipientWallet: process.env.BLOCKCHAIN_WRITER_ADDRESS || '0x0000000000000000000000000000000000000000',
        amountBRL: 50.00,
        amountUSDT: 9.25,
        network: 'base',
        metadata: {
            reason: 'Branding Proof for NSFACTORY',
            campaign: 'Launch 2026'
        }
    };

    try {
        const result = await poe.writeProof(testData);

        return new Response(JSON.stringify({
            success: true,
            message: 'NSFACTORY Proof recorded on Base!',
            txHash: result.proof.txHash,
            explorer: `https://basescan.org/tx/${result.proof.txHash}`,
            branding: 'NSFACTORY Proof: FLOWPAY Integrity Check'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        secureLog('error', 'API Manual Proof failed', { error: err.message });
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            tip: 'Verifique se a wallet BLOCKCHAIN_WRITER tem ETH na Base'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
