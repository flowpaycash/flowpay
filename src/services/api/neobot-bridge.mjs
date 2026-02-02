/**
 * Neobot Integration Service
 * NEØ Protocol - Sovereign Command Bridge
 */

import { secureLog } from './config.mjs';

/**
 * Trigger Neobot Access Unlock Skill
 * @param {string} chargeId - The Woovi Correlation ID / Charge ID
 */
export async function triggerNeobotUnlock(chargeId, customerRef) {
    const NEOBOT_URL = process.env.NEOBOT_URL || 'http://localhost:3001';
    const NEOBOT_API_KEY = process.env.NEOBOT_API_KEY || process.env.FLOWPAY_API_KEY;

    secureLog('info', '🌉 Bridge: Avisando Neobot para desbloquear acesso', { chargeId, customerRef });

    try {
        const response = await fetch(`${NEOBOT_URL}/tools/invoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NEOBOT_API_KEY}`
            },
            body: JSON.stringify({
                tool: 'flowpay:unlock',
                args: {
                    charge_id: chargeId,
                    customer_ref: customerRef
                }
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            secureLog('info', '✅ Bridge: Neobot confirmou o desbloqueio', { chargeId, receiptId: result.result?.receipt?.receipt_id });
            return { success: true, data: result.result };
        } else {
            const errorMsg = result.error?.message || result.error || response.statusText;
            secureLog('error', '❌ Bridge: Falha no desbloqueio via Neobot', {
                chargeId,
                error: errorMsg
            });
            return { success: false, error: errorMsg };
        }
    } catch (error) {
        secureLog('error', '⚠️ Bridge: Erro crítico ao conectar com Neobot', {
            chargeId,
            error: error.message
        });
        return { success: false, error: error.message };
    }
}
