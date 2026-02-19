import { getCorsHeaders, secureLog } from '../../../services/api/config.mjs';
import { listAllOrders, completeOrder, getOrder } from '../../../services/database/sqlite.mjs';

function checkAdminAuth(request) {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;
    return authHeader && authHeader === `Bearer ${adminPassword}`;
}

// GET /api/admin/orders - list all orders
export const GET = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    if (!checkAdminAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const orders = listAllOrders(100);
        return new Response(JSON.stringify({ success: true, orders }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        secureLog('error', 'Admin orders list error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

// POST /api/admin/orders - complete an order
export const POST = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    if (!checkAdminAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    try {
        const body = await request.json();
        const { action, chargeId } = body;

        if (!chargeId || action !== 'complete') {
            return new Response(JSON.stringify({ error: 'chargeId e action=complete são obrigatórios.' }), { status: 400, headers });
        }

        const order = getOrder(chargeId);
        if (!order) {
            return new Response(JSON.stringify({ error: 'Pedido não encontrado.' }), { status: 404, headers });
        }

        if (order.status === 'COMPLETED') {
            return new Response(JSON.stringify({ error: 'Pedido já concluído.' }), { status: 409, headers });
        }

        if (!['PIX_PAID', 'PENDING_REVIEW', 'APPROVED'].includes(order.status)) {
            return new Response(JSON.stringify({
                error: `Não é possível concluir pedido com status ${order.status}.`
            }), { status: 400, headers });
        }

        completeOrder(chargeId, 'admin');
        secureLog('info', 'Pedido concluído pelo admin', { chargeId });

        return new Response(JSON.stringify({ success: true, message: 'Pedido concluído com sucesso.' }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Admin order complete error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
