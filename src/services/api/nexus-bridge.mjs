import crypto from 'crypto';
import { secureLog } from './config.mjs';

/**
 * Notify Nexus about payment events
 * @param {string} eventName - Event name (e.g., 'PAYMENT_RECEIVED')
 * @param {object} payload - Transaction data
 */
export async function notifyNexus(eventName, payload) {
    const NEXUS_BASE_URL = process.env.NEXUS_API_URL || 'https://nexus.neoprotocol.space/api';
    const NEXUS_SECRET = process.env.NEXUS_SECRET;
    const bridgeEnabled = process.env.NEXUS_BRIDGE_ENABLED !== 'false';

    if (!bridgeEnabled) {
        secureLog('info', 'Nexus Bridge: disabled by NEXUS_BRIDGE_ENABLED=false. Notification skipped.', {
            eventName
        });
        return { success: false, skipped: true, reason: 'bridge_disabled' };
    }

    if (!NEXUS_SECRET) {
        secureLog('warn', 'Nexus Bridge: NEXUS_SECRET not found in environment. Notification skipped.');
        return { success: false, error: 'Missing NEXUS_SECRET' };
    }

    // Canonical ingress endpoint for { event, payload } envelope.
    let endpoint = process.env.NEXUS_WEBHOOK_URL || `${NEXUS_BASE_URL.replace(/\/$/, '')}/events`;
    // Backward compatibility: if env is still set to legacy flowpay webhook path,
    // rewrite to /events so payload schema matches Nexus contract.
    if (endpoint.includes('/api/webhooks/flowpay')) {
        const rewritten = endpoint.replace('/api/webhooks/flowpay', '/api/events');
        secureLog('warn', 'Nexus Bridge: legacy endpoint detected, rewriting to /api/events', {
            from: endpoint,
            to: rewritten
        });
        endpoint = rewritten;
    }
    const body = JSON.stringify({
        event: eventName,
        payload: payload
    });

    // HMAC-SHA256 signature
    const signature = crypto
        .createHmac('sha256', NEXUS_SECRET)
        .update(body)
        .digest('hex');

    secureLog('info', `Nexus Bridge: Sending ${eventName} to Nexus`, { endpoint });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Nexus-Signature': signature
            },
            body: body,
            signal: AbortSignal.timeout(15000) // 15s timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            secureLog('error', 'Nexus Bridge: Failed to notify Nexus', { status: response.status, error: errorText });
            return { success: false, status: response.status, error: errorText };
        }

        secureLog('info', '✅ Nexus Bridge: Nexus notified successfully');
        return { success: true };
    } catch (error) {
        secureLog('error', 'Nexus Bridge: Error during notification', { error: error.message });
        return { success: false, error: error.message };
    }
}
