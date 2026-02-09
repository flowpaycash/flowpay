import { applyRateLimit } from '../../services/api/rate-limiter.mjs';
import { getCorsHeaders, secureLog } from '../../services/api/config.mjs';
import { updateOrderStatus, getOrder, getDatabase } from '../../services/database/sqlite.mjs';
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

        // Validação de IP da Woovi - apenas IPs autorizados
        const normalizedIP = clientIP.replace('::ffff:', '');
        const { config } = await import('../../services/api/config.mjs');

        if (!config.woovi.allowedIPs.includes(normalizedIP)) {
            secureLog('warn', `Webhook bloqueado: IP não autorizado (${normalizedIP})`);
            return new Response(JSON.stringify({ error: 'Unauthorized IP' }), { status: 403, headers });
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

        // 1. HMAC Validation (timing-safe comparison to prevent timing attacks)
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = hmac.update(rawBody).digest('base64');

        const sigBuffer = Buffer.from(signature);
        const digestBuffer = Buffer.from(digest);
        if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
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
                // Check multiple terminal/in-progress states to prevent race conditions
                const terminalStates = ['COMPLETED', 'PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED'];
                if (terminalStates.includes(order.status) || order.bridge_status === 'SENT') {
                    secureLog('info', 'Astro Webhook: Idempotency check - Order already processed', { correlationID, status: order.status, bridge: order.bridge_status });
                    return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
                        status: 200,
                        headers: { ...headers, 'Content-Type': 'application/json' }
                    });
                }

                updateOrderStatus(correlationID, 'PIX_PAID', {
                    paid_at: new Date(charge.paidAt || Date.now()).toISOString()
                });

                // Auto-advance to Pending Review for Autonomous Manual Settlement
                updateOrderStatus(correlationID, 'PENDING_REVIEW');

                secureLog('info', 'Astro Webhook: Preparando disparo da Bridge 🌉', { correlationID });

                //  Bridge call integration
                const customerEmail = charge.customer?.email;
                const customerName = charge.customer?.name;
                const customerTaxID = charge.customer?.taxID?.taxID;

                // 📋 Enriquecer dados do comprador no pedido (se vieram do webhook da Woovi)
                try {
                    const db = getDatabase();
                    const updates = [];
                    const values = [];
                    if (customerEmail && !order.customer_email) {
                        updates.push('customer_email = ?');
                        values.push(customerEmail);
                    }
                    if (customerName && !order.customer_name) {
                        updates.push('customer_name = ?');
                        values.push(customerName);
                    }
                    if (customerTaxID && !order.customer_cpf) {
                        updates.push('customer_cpf = ?');
                        values.push(customerTaxID);
                    }
                    if (updates.length > 0) {
                        values.push(correlationID);
                        db.prepare(`UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE charge_id = ?`).run(...values);
                        secureLog('info', 'Webhook: Dados do comprador atualizados', { correlationID });
                    }
                } catch (enrichErr) {
                    secureLog('warn', 'Webhook: Falha ao enriquecer dados do comprador', { error: enrichErr.message });
                }

                // 🛡️ POE: Add order to batch for proof layer
                try {
                    const { getPOEService } = await import('../../../services/blockchain/poe-service.js');
                    const poe = getPOEService();
                    await poe.addOrderToBatch(correlationID);
                } catch (poeErr) {
                    secureLog('error', 'Astro Webhook: Erro ao adicionar na camada de PoE', { error: poeErr.message });
                }

                // 🌉 NEXUS BRIDGE: Notify about payment (FASE 2 - Single Point of Contact)
                // Nexus is now responsible for routing to Smart Factory (mint) and Neobot (notifications)
                // Direct calls to Neobot have been removed per ECOSYSTEM_COMPLIANCE_CHECKLIST v3.0
                const { notifyNexus } = await import('../../services/api/nexus-bridge.mjs');
                notifyNexus('PAYMENT_RECEIVED', {
                    transactionId: correlationID,
                    orderId: correlationID,
                    amount: charge.value / 100, // Woovi values are in cents
                    currency: 'BRL',
                    payer: order.customer_wallet || order.customer_ref || 'unknown',
                    customerEmail: customerEmail,
                    // Metadata for downstream processing
                    metadata: {
                        source: 'flowpay',
                        chargeId: charge.identifier,
                        paidAt: charge.paidAt
                    }
                }).catch(err => {
                    secureLog('error', 'Astro Webhook: Erro ao notificar Nexus', { error: err.message });
                });

                // ⚠️ DEPRECATED (FASE 2): Direct Neobot call removed
                // The Nexus will route PAYMENT_RECEIVED to Neobot automatically
                // See: neo-nexus/src/reactors/payment-to-unlock.ts
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
