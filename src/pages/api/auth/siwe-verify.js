import crypto from 'crypto';
import { SiweMessage } from 'siwe';
import { consumeSiweNonce, upsertWalletSession } from '../../../services/database/sqlite.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';

function signSessionToken(payload) {
    const secret = process.env.TOKEN_SECRET || process.env.FLOWPAY_JWT_SECRET;
    if (!secret) throw new Error('TOKEN_SECRET not configured');
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
}

export const POST = async ({ request, cookies, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        // Rate limit
        const rateLimitResult = applyRateLimit('auth-magic-start')({
            headers: Object.fromEntries(request.headers),
            context: { clientIP: clientAddress }
        });

        if (rateLimitResult && rateLimitResult.statusCode === 429) {
            return new Response(rateLimitResult.body, { status: 429, headers });
        }

        const body = await request.json();
        const { message, signature } = body;

        if (!message || !signature || typeof message !== 'string' || typeof signature !== 'string') {
            return new Response(JSON.stringify({ error: 'Mensagem ou assinatura ausente' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // Parse and verify the SIWE message
        const siweMessage = new SiweMessage(message);

        // Verify domain matches our app
        const expectedDomain = (process.env.URL || 'https://flowpay.cash').replace(/^https?:\/\//, '');
        if (siweMessage.domain !== expectedDomain) {
            secureLog('warn', 'SIWE domain mismatch', { expected: expectedDomain, got: siweMessage.domain });
            return new Response(JSON.stringify({ error: 'Domínio inválido' }), {
                status: 401,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // Verify the nonce exists and hasn't been used (prevents replay attacks)
        const nonceRecord = consumeSiweNonce(siweMessage.nonce);
        if (!nonceRecord) {
            secureLog('warn', 'SIWE nonce invalid or expired', { nonce: siweMessage.nonce });
            return new Response(JSON.stringify({ error: 'Nonce inválido ou expirado. Tente novamente.' }), {
                status: 401,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // Verify the cryptographic signature
        const verification = await siweMessage.verify({ signature });

        if (!verification.success) {
            secureLog('warn', 'SIWE signature verification failed', {
                address: siweMessage.address?.slice(0, 8),
                error: verification.error?.type
            });
            return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
                status: 401,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        const walletAddress = verification.data.address;
        const chainId = verification.data.chainId || 1;

        // Record wallet session
        upsertWalletSession(walletAddress, chainId);

        secureLog('info', 'SIWE login successful', {
            address: walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4),
            chainId
        });

        // Create signed session token (same format as magic-verify)
        const sessionData = {
            wallet: walletAddress.toLowerCase(),
            chainId,
            verified_at: new Date().toISOString(),
            exp: Date.now() + (24 * 60 * 60 * 1000)
        };

        const sessionToken = signSessionToken(sessionData);

        cookies.set('flowpay_session', sessionToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 // 24h
        });

        return new Response(JSON.stringify({
            success: true,
            address: walletAddress,
            chainId
        }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'SIWE verify error', { error: error.message });

        // Distinguish SIWE parse errors from internal errors
        if (error.message?.includes('Invalid')) {
            return new Response(JSON.stringify({ error: 'Mensagem SIWE malformada' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

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
