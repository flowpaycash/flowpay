import { verifyAuthToken } from '../../../services/database/sqlite.mjs';
import { secureLog, getCorsHeaders } from '../../../services/api/config.mjs';

export const POST = async ({ request, cookies }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const { token } = await request.json();

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token ausente' }), { status: 400, headers });
        }

        const authToken = verifyAuthToken(token);

        if (!authToken) {
            return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), { status: 401, headers });
        }

        // Successfully verified
        secureLog('info', 'Magic link verified successfully', { email: authToken.email });

        // Set session cookie
        // In a real app, you'd use a crypto-signed session token (JWT or similar)
        // For now, we'll set a simple identity cookie for the PWA to consume
        const sessionData = {
            email: authToken.email,
            verified_at: new Date().toISOString()
        };

        const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

        cookies.set('flowpay_session', sessionToken, {
            path: '/',
            httpOnly: false, // Permitir que o JS do cliente veja em alguns casos, mas idealmente true
            secure: process.env.NODE_ENV === 'production',
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
