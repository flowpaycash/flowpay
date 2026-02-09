import { getDatabase, logAudit } from '../../../services/database/sqlite.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const body = await request.json();
        const { type } = body;

        logAudit('ACCESS', 'GUEST', `Guest login from ${clientAddress}`, {
            type: type || 'checkout_direct',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent')
        });

        secureLog('info', 'Guest access logged', { ip: clientAddress });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
