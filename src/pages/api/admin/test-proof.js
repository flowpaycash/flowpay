import { getWriteProof } from '../../../../services/blockchain/write-proof.js';
import { requireAdminSession, withAdminNoStoreHeaders } from '../../../services/api/admin-auth.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';

export const POST = async ({ request, cookies }) => {
    const headers = withAdminNoStoreHeaders({
        ...getCorsHeaders({ headers: Object.fromEntries(request.headers) }),
        'Content-Type': 'application/json'
    });

    if (!requireAdminSession(cookies)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    secureLog('info', 'Admin triggered manual on-chain proof');

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
            headers
        });
    } catch (err) {
        secureLog('error', 'API Manual Proof failed', { error: err.message });
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            tip: 'Verifique se a wallet BLOCKCHAIN_WRITER tem ETH na Base'
        }), {
            status: 500,
            headers
        });
    }
};
