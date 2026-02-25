import { getCorsHeaders, secureLog } from "../../../../services/api/config.mjs";
import { getOrder, updateOrderStatus } from "../../../../services/database/sqlite.mjs";
import { redis } from "../../../../services/api/redis-client.mjs";
import { Redis } from 'ioredis';
import * as Sentry from "@sentry/astro";

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

            const sendEvent = (data) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            const sendHeartbeat = () => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
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
                // Wait a bit to ensure client receives it before closing
                setTimeout(() => {
                    try { controller.close(); } catch (e) { }
                }, 1000);
                return;
            }

            // 5. Setup Redis Subscriber
            let subClient = null;
            const isRailway = process.env.RAILWAY_STATIC_URL !== undefined || process.env.RAILWAY_ENVIRONMENT !== undefined;
            const redisUrl = process.env.REDIS_URL || (isRailway ? 'redis://redis.railway.internal:6379' : null);

            if (redisUrl) {
                try {
                    subClient = new Redis(redisUrl, {
                        lazyConnect: true // Don't connect until needed
                    });

                    await subClient.connect();
                    await subClient.subscribe(`charge_update:${id}`);

                    subClient.on('message', (channel, message) => {
                        try {
                            const data = JSON.parse(message);
                            sendEvent({ status: data.status, tx_hash: data.tx_hash || null });

                            if (terminalStates.includes(data.status)) {
                                cleanup();
                                controller.close();
                            }
                        } catch (e) {
                            secureLog('error', 'SSE Redis message parse error', { error: e.message });
                        }
                    });
                } catch (redisErr) {
                    secureLog('warn', 'SSE Redis subscription failed, client will rely on SSE heartbeats + potential re-connect', { error: redisErr.message });
                }
            }

            // 6. Heartbeat and Cleanup
            const heartbeatInterval = setInterval(sendHeartbeat, 30000);

            const cleanup = () => {
                clearInterval(heartbeatInterval);
                if (subClient) {
                    subClient.unsubscribe().catch(() => { });
                    subClient.quit().catch(() => { });
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
