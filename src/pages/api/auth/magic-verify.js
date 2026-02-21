import { signSessionToken } from '../../../services/auth/session.mjs';
import { verifyAuthToken } from '../../../services/database/sqlite.mjs';
import { secureLog, getCorsHeaders } from '../../../services/api/config.mjs';

export const POST = async ({ request, cookies }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const { token } = await request.json();

        if (!token || typeof token !== 'string' || token.length > 200) {
            return new Response(JSON.stringify({ error: 'Token ausente ou inválido' }), { status: 400, headers });
        }

        const authToken = verifyAuthToken(token);

        if (!authToken) {
            return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), { status: 401, headers });
        }

        secureLog('info', 'Magic link verified successfully', { email: authToken.email });

        const sessionData = {
            email: authToken.email,
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
            email: authToken.email
        }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });

    } catch (error) {
        secureLog('error', 'Magic verify error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
