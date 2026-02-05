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
        const clientIP = clientAddress;

        // Validação de IP da Woovi
        // Em dev localhost é permitido, em prod apenas IPs da Woovi
        if (process.env.NODE_ENV === 'production') {
            // Normaliza IP (remove prefixo ::ffff: se existir)
            const normalizedIP = clientIP.replace('::ffff:', '');

            // Importa config aqui para garantir acesso
            const { config } = await import('../../services/api/config.mjs');

            if (!config.woovi.allowedIPs.includes(normalizedIP)) {
                secureLog('warn', `Astro Webhook bloqueado: IP não autorizado (${normalizedIP})`);
                return new Response(JSON.stringify({ error: 'Unauthorized IP' }), { status: 403, headers });
            }
        }

        const rawBody = await request.text();

        const signature = request.headers.get('x-woovi-signature');
        const WEBHOOK_SECRET = process.env.WOOVI_WEBHOOK_SECRET;

        if (!signature || !WEBHOOK_SECRET) {
            secureLog('info', 'Astro Webhook: Ping ou falta de secret - retornando 200 para validação');
            return new Response(JSON.stringify({ status: 'ready' }), {
                status: 200,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
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
                // Idempotency Check: Avoid double processing
                if (order.status === 'COMPLETED' || order.bridge_status === 'SENT') {
                    secureLog('info', 'Astro Webhook: Idempotency check - Order already processed or Bridge SENT', { correlationID, status: order.status });
                    return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
                        status: 200,
                        headers: { ...headers, 'Content-Type': 'application/json' }
                    });
                }

                updateOrderStatus(correlationID, 'PIX_PAID', {
                    paid_at: new Date(charge.paidAt || Date.now()).toISOString()
                });

                // Auto-advance to Pending Review for Sovereign Manual Settlement
                updateOrderStatus(correlationID, 'PENDING_REVIEW');

                secureLog('info', 'Astro Webhook: Preparando disparo da Bridge 🌉', { correlationID });

                //  Bridge call integration
                const customerEmail = charge.customer?.email;

                // 🛡️ POE: Add order to batch for proof layer
                try {
                    const { getPOEService } = await import('../../../services/blockchain/poe-service.js');
                    const poe = getPOEService();
                    await poe.addOrderToBatch(correlationID);
                } catch (poeErr) {
                    secureLog('error', 'Astro Webhook: Erro ao adicionar na camada de PoE', { error: poeErr.message });
                }

                // 🌉 NEXUS BRIDGE: Notify about payment
                const { notifyNexus } = await import('../../services/api/nexus-bridge.mjs');
                notifyNexus('PAYMENT_RECEIVED', {
                    transactionId: correlationID,
                    amount: charge.value / 100, // Woovi values are in cents
                    currency: 'BRL',
                    payer: order.customer_wallet || order.customer_ref || 'unknown'
                }).catch(err => {
                    secureLog('error', 'Astro Webhook: Erro ao notificar Nexus', { error: err.message });
                });

                // 🌉 BRIDGE: Trigger Neobot Unlock Skill (Model B - Access Unlock Primary)
                const { triggerNeobotUnlock } = await import('../../services/api/neobot-bridge.mjs');
                triggerNeobotUnlock(correlationID, customerEmail).catch(err => {
                    secureLog('error', 'Astro Webhook: Erro ao disparar Bridge Neobot', { error: err.message });
                });
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
