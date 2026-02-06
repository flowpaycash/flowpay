import { secureLog } from './config.mjs';
import { updateOrderStatus } from '../database/sqlite.mjs';

/**
 * Trigger Neobot Access Unlock Skill
 * @param {string} chargeId - The Woovi Correlation ID / Charge ID
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Trigger Neobot Access Unlock Skill
 * With Retry Policy (3 attempts) + Dead Letter Queue (File)
 * @param {string} chargeId - The Woovi Correlation ID / Charge ID
 */
export async function triggerNeobotUnlock(chargeId, customerRef) {
    const { withRetry } = await import('./utils.mjs');
    const NEOBOT_URL = process.env.NEOBOT_URL || 'http://localhost:3001';
    const NEOBOT_API_KEY = process.env.NEOBOT_API_KEY || process.env.FLOWPAY_API_KEY;

    secureLog('info', 'Bridge: Iniciando processo de desbloqueio Neobot', { chargeId });

    try {
        const result = await withRetry(async () => {
            const response = await fetch(`${NEOBOT_URL}/tools/invoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${NEOBOT_API_KEY}`
                },
                body: JSON.stringify({
                    tool: 'flowpay:unlock',
                    args: { charge_id: chargeId, customer_ref: customerRef }
                }),
                signal: AbortSignal.timeout(30000) // 30s timeout
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error?.message || errorBody.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.ok) throw new Error(data.error || 'Neobot logic error');

            return data.result;
        }, {
            retries: 3,
            onRetry: (error, attempt) => {
                secureLog('warn', `Bridge: Falha na tentativa ${attempt}. Retentando...`, { error: error.message });
                updateOrderStatus(chargeId, 'PENDING_REVIEW', { bridge_attempts: attempt });
            }
        });

        secureLog('info', '✅ Bridge: Neobot confirmou o desbloqueio', { chargeId });

        // 🏆 FINAL SUCCESS STATE
        updateOrderStatus(chargeId, 'COMPLETED', {
            bridge_status: 'SENT'
        });

        return { success: true, data: result };

    } catch (error) {
        secureLog('error', `❌ Bridge: Falha definitiva após retentativas`, { error: error.message });

        // DLQ Fallback
        logFailedProvision(chargeId, customerRef, error.message);

        updateOrderStatus(chargeId, 'PENDING_REVIEW', {
            bridge_status: 'FAILED',
            bridge_last_error: error.message
        });

        return { success: false, error: error.message };
    }
}

function logFailedProvision(chargeId, customerRef, error) {
    try {
        const dir = path.join(process.cwd(), 'data', 'flowpay');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = path.join(dir, 'failed_provisions.jsonl');
        const entry = JSON.stringify({
            timestamp: new Date().toISOString(),
            chargeId,
            customerRef,
            error,
            status: 'PENDING_RETRY'
        }) + '\n';

        fs.appendFileSync(file, entry);
        secureLog('error', '🚨 BRIDGE CRITICAL: Falha gravada em DLQ local', { file });
    } catch (e) {
        console.error('CRITICAL: FAILED TO WRITE TO DLQ', e);
    }
}
