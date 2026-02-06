import { getOrder } from '../../../services/database/sqlite.mjs';
import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { applyRateLimit } from '../../../services/api/rate-limiter.mjs';

export const GET = async ({ params, request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    const { id } = params;

    if (!id || typeof id !== 'string' || id.length > 100) {
        return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }

    // Rate limit to prevent enumeration
    const rateLimitResult = applyRateLimit('pix-orders')({
        headers: Object.fromEntries(request.headers),
        context: { clientIP: clientAddress }
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
        return new Response(rateLimitResult.body, { status: 429, headers });
    }

    try {
        const order = getOrder(id);
        if (!order) {
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            status: order.status,
            tx_hash: order.tx_hash
        }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        secureLog('error', 'Charge lookup error', { error: e.message });
        return new Response(JSON.stringify({ error: 'Server Error' }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
