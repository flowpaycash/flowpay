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
 *With Retry Policy (3 attempts) + Dead Letter Queue (File)
 * @param {string} chargeId - The Woovi Correlation ID / Charge ID
 */
export async function triggerNeobotUnlock(chargeId, customerRef) {
    const NEOBOT_URL = process.env.NEOBOT_URL || 'http://localhost:3001';
    const NEOBOT_API_KEY = process.env.NEOBOT_API_KEY || process.env.FLOWPAY_API_KEY;

    secureLog('info', '🌉 Bridge: Avisando Neobot para desbloquear acesso', { chargeId, customerRef });

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            // Update attempts count in DB
            updateOrderStatus(chargeId, 'PENDING_REVIEW', { bridge_attempts: attempt });

            const response = await fetch(`${NEOBOT_URL}/tools/invoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${NEOBOT_API_KEY}`
                },
                body: JSON.stringify({
                    tool: 'flowpay:unlock',
                    args: { charge_id: chargeId, customer_ref: customerRef }
                })
            });

            const result = await response.json();

            if (response.ok && result.ok) {
                secureLog('info', '✅ Bridge: Neobot confirmou o desbloqueio', { chargeId, receiptId: result.result?.receipt?.receipt_id });

                // 🏆 FINAL SUCCESS STATE
                updateOrderStatus(chargeId, 'COMPLETED', {
                    bridge_status: 'SENT',
                    bridge_attempts: attempt
                });

                return { success: true, data: result.result };
            }

            // If logic error (4xx/5xx from bot), throw to trigger retry unless 400 (bad request)
            if (response.status >= 500) throw new Error(`Server Error: ${response.status}`);
            if (response.status === 429) throw new Error('Rate Limited');

            const errorMsg = result.error?.message || result.error || response.statusText;
            secureLog('error', `❌ Bridge: Falha tentativa ${attempt}/${MAX_RETRIES}`, { error: errorMsg });

            if (attempt === MAX_RETRIES) {
                updateOrderStatus(chargeId, 'PENDING_REVIEW', {
                    bridge_status: 'FAILED',
                    bridge_last_error: errorMsg
                });
                return { success: false, error: errorMsg };
            }

        } catch (error) {
            secureLog('warn', `⚠️ Bridge: Erro de rede/conexão (Tentativa ${attempt}/${MAX_RETRIES})`, { error: error.message });

            if (attempt === MAX_RETRIES) {
                // DLQ Fallback
                logFailedProvision(chargeId, customerRef, error.message);

                updateOrderStatus(chargeId, 'PENDING_REVIEW', {
                    bridge_status: 'FAILED',
                    bridge_last_error: error.message
                });

                return { success: false, error: error.message };
            }

            // Wait before retry (1s, 2s, ...)
            await new Promise(res => setTimeout(res, 1000 * attempt));
        }
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
