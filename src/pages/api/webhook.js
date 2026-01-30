import { applyRateLimit } from '../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog } from '../../services/api/config.mjs';
import { updateOrderStatus, getOrder } from '../../services/database/sqlite.mjs';
import crypto from 'crypto';

export const POST = async ({ request, clientAddress }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });

    try {
        const rateLimitResult = applyRateLimit('webhook-handler')({
            headers: Object.fromEntries(request.headers),
            context: { clientIP: clientAddress }
        });

        if (rateLimitResult && rateLimitResult.statusCode === 429) {
            return new Response(rateLimitResult.body, { status: 429, headers });
        }

        const rawBody = await request.text();
        const signature = request.headers.get('x-woovi-signature');
        const WEBHOOK_SECRET = process.env.WOOVI_WEBHOOK_SECRET;

        if (!signature || !WEBHOOK_SECRET) {
            secureLog('warn', 'Astro Webhook: Missing signature or secret');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
        }

        // 1. HMAC Validation
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = hmac.update(rawBody).digest('base64');

        if (signature !== digest) {
            secureLog('error', 'Astro Webhook: Invalid Signature');
            return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers });
        }

        // 2. Process Webhook
        const { data, event: eventType } = JSON.parse(rawBody);
        const charge = data.charge;
        const correlationID = charge.correlationID;

        secureLog('info', `Astro Webhook recebido: ${eventType}`, { correlationID });

        if (eventType === 'charge.paid' || eventType === 'charge.confirmed') {
            const order = getOrder(correlationID);

            if (order) {
                updateOrderStatus(correlationID, 'PIX_PAID', {
                    paid_at: new Date(charge.paidAt || Date.now()).toISOString()
                });

                // Auto-advance to Pending Review for Sovereign Manual Settlement
                updateOrderStatus(correlationID, 'PENDING_REVIEW');

                secureLog('info', 'Astro Webhook: Pedido atualizado ✅', { correlationID });
            } else {
                secureLog('warn', 'Astro Webhook: Pedido não encontrado no SQLite', { correlationID });
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        secureLog('error', 'Astro Webhook: critical error', { error: error.message });
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 200, headers }); // Respond 200 to Woovi to avoid retries on logic errors
    }
};

export const OPTIONS = async ({ request }) => {
    const headers = getCorsHeaders({ headers: Object.fromEntries(request.headers) });
    return new Response(null, { status: 204, headers });
};
