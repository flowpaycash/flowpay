import { getOrder } from '../../../services/database/sqlite.mjs';

export const GET = async ({ params, request }) => {
    const { id } = params;

    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
    }

    try {
        const order = getOrder(id);
        if (!order) {
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({
            success: true,
            status: order.status,
            tx_hash: order.tx_hash
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
    }
};
