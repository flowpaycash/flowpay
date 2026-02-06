import crypto from 'crypto';
import { saveSiweNonce } from '../../../services/database/sqlite.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        // Rate limit: same bucket as magic-start (5 req/15min)
        const rateLimitResult = applyRateLimit('auth-magic-start')({
            headers: Object.fromEntries(request.headers),
            context: { clientIP: clientAddress }
        });

        if (rateLimitResult && rateLimitResult.statusCode === 429) {
            return new Response(rateLimitResult.body, { status: 429, headers });
        }

        const body = await request.json();
        const { address } = body;

        // Validate Ethereum address
        if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return new Response(JSON.stringify({ error: 'Endereço Ethereum inválido' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // Generate cryptographic nonce (32 bytes hex)
        const nonce = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

        // Store nonce in DB
        saveSiweNonce(nonce, expiresAt);

        // Build SIWE domain from URL env or request host
        const domain = (process.env.URL || `http://localhost:4321`).replace(/^https?:\/\//, '');
        const origin = process.env.URL || `http://localhost:4321`;

        secureLog('info', 'SIWE challenge generated', { address: address.slice(0, 8) + '...' });

        return new Response(JSON.stringify({
            success: true,
            nonce,
            domain,
            origin,
            chainId: 1,
            expiresAt: expiresAt.toISOString()
        }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'SIWE challenge error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno' }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
