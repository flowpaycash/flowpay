import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { getUserByEmail, getUserMetrics } from '../../../services/database/sqlite.mjs';
import { verifySessionToken } from '../../../services/auth/session.mjs';

function validateUserSession(request) {
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('flowpay_session='));

    let token = null;
    if (sessionCookie) {
        token = sessionCookie.split('=')[1];
    } else {
        token = request.headers.get('x-user-token');
    }

    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) return null;

    return { email: payload.email.toLowerCase().trim(), token };
}

export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const session = validateUserSession(request);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401, headers });
    }

    try {
        const user = getUserByEmail(session.email);
        if (!user || user.status !== 'APPROVED') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers });
        }

        const metrics = getUserMetrics(user.id);

        return new Response(JSON.stringify({
            success: true,
            metrics
        }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        secureLog('error', 'Get metrics error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
