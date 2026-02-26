import { getCorsHeaders, secureLog } from "../../../../services/api/config.mjs";
import { getOrder, updateOrderStatus } from "../../../../services/database/sqlite.mjs";
import { subscribeChannel } from "../../../../services/api/redis-client.mjs";
import * as Sentry from "@sentry/astro";

// Maximum SSE connection lifetime (10 minutes).
// PIX charges typically expire in 30-60 minutes; clients can reconnect.
const MAX_CONNECTION_MS = 10 * 60 * 1000;

// Constants for polling fallback if Redis fails or for initial sync
const WOOVI_PAID_STATUSES = new Set([
    "COMPLETED",
    "PAID",
    "CONFIRMED",
    "RECEIVED",
]);

async function syncCreatedOrderFromWoovi(chargeId) {
    const apiKey = process.env.WOOVI_API_KEY?.trim();
    const apiUrl = (process.env.WOOVI_API_URL || "https://api.woovi.com").replace(/\/$/, "");

    if (!apiKey) return { synced: false };

    try {
        const response = await fetch(
            `${apiUrl}/api/v1/charge/${encodeURIComponent(chargeId)}`,
            {
                method: "GET",
                headers: { Authorization: apiKey },
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!response.ok) return { synced: false };

        const payload = await response.json();
        const charge = payload?.charge || null;
        const providerStatus = String(charge?.status || "").toUpperCase();

        if (!WOOVI_PAID_STATUSES.has(providerStatus)) {
            return { synced: false, providerStatus };
        }

        updateOrderStatus(chargeId, "PIX_PAID", {
            paid_at: new Date(charge?.paidAt || Date.now()).toISOString(),
        });
        updateOrderStatus(chargeId, "PENDING_REVIEW");

        return { synced: true, providerStatus };
    } catch (error) {
        return { synced: false, error: error.message };
    }
}

export const GET = async ({ params, request }) => {
    const { id } = params;
    const headers = getCorsHeaders({
        headers: Object.fromEntries(request.headers),
    });

    // SSE Headers
    const sseHeaders = {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
    };

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let cleaned = false;

            const sendEvent = (data) => {
                if (cleaned) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch (e) {
                    // Stream already closed
                    cleanup();
                }
            };

            const sendHeartbeat = () => {
                if (cleaned) return;
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch (e) {
                    cleanup();
                }
            };

            // 1. Initial lookup
            let order = getOrder(id);
            if (!order) {
                sendEvent({ error: 'Not found' });
                controller.close();
                return;
            }

            // 2. Initial sync if CREATED
            if (order.status === 'CREATED') {
                await syncCreatedOrderFromWoovi(id);
                order = getOrder(id) || order;
            }

            // 3. Send current status
            sendEvent({ status: order.status, tx_hash: order.tx_hash });

            // 4. If terminal, close
            const terminalStates = ['PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED', 'COMPLETED', 'SETTLEMENT_FAILED'];
            if (terminalStates.includes(order.status)) {
                setTimeout(() => {
                    try { controller.close(); } catch (e) { }
                }, 1000);
                return;
            }

            // 5. Setup Redis subscription via shared singleton
            let unsubscribe = null;
            try {
                unsubscribe = await subscribeChannel(`charge_update:${id}`, (message) => {
                    try {
                        const data = JSON.parse(message);
                        sendEvent({ status: data.status, tx_hash: data.tx_hash || null });

                        if (terminalStates.includes(data.status)) {
                            cleanup();
                            try { controller.close(); } catch (e) { }
                        }
                    } catch (e) {
                        secureLog('error', 'SSE Redis message parse error', { error: e.message });
                    }
                });
            } catch (redisErr) {
                secureLog('warn', 'SSE Redis subscription failed, relying on heartbeats', { error: redisErr.message });
            }

            // 6. Heartbeat, timeout, and cleanup
            const heartbeatInterval = setInterval(sendHeartbeat, 30000);

            // Server-side max lifetime to prevent leaked connections
            const maxLifetimeTimeout = setTimeout(() => {
                sendEvent({ status: 'timeout', message: 'Connection timeout, please reconnect' });
                cleanup();
                try { controller.close(); } catch (e) { }
            }, MAX_CONNECTION_MS);

            const cleanup = () => {
                if (cleaned) return;
                cleaned = true;
                clearInterval(heartbeatInterval);
                clearTimeout(maxLifetimeTimeout);
                if (unsubscribe) {
                    unsubscribe().catch(() => {});
                    unsubscribe = null;
                }
            };

            // Handle stream cancellation (client disconnect)
            request.signal.addEventListener('abort', () => {
                cleanup();
                try { controller.close(); } catch (e) { }
            });
        }
    });

    return new Response(stream, { headers: sseHeaders });
};
