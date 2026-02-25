import { signSessionToken } from '../../../services/auth/session.mjs';
import { verifyAuthToken } from '../../../services/database/sqlite.mjs';
import { secureLog, getCorsHeaders } from '../../../services/api/config.mjs';
import { redis } from '../../../services/api/redis-client.mjs';

export const POST = async ({ request, cookies }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const { token } = await request.json();

        if (!token || typeof token !== 'string' || token.length > 200) {
            return new Response(JSON.stringify({ error: 'Token ausente ou inválido' }), { status: 400, headers });
        }

        let authToken = null;

        // 1. Tentar Redis primeiro (E4)
        if (redis) {
            try {
                const redisEmail = await redis.get(`auth_token:${token}`);
                if (redisEmail) {
                    authToken = { email: redisEmail };
                    // Opcional: deletar após uso
                    void redis.del(`auth_token:${token}`).catch(() => { });
                }
            } catch (err) {
                secureLog('warn', 'Redis miss no magic-verify, fallback para SQLite', { error: err.message });
            }
        }

        // 2. Fallback SQLite se não achou no Redis
        if (!authToken) {
            authToken = verifyAuthToken(token);
        }

        if (!authToken) {
            // E3: Retornar mensagem clara
            // Nota: No SQLite, verifyAuthToken retorna null se expirado OU inexistente.
            // Para ser 100% preciso, precisaríamos de uma query extra, mas por ora "inválido ou expirado" já é uma melhoria.
            return new Response(JSON.stringify({
                error: 'Este link de acesso é inválido ou já expirou. Por favor, solicite um novo acesso.'
            }), { status: 401, headers });
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
