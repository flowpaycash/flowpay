/**
 * ⚠️ DEPRECATED — FASE 2 COMPLIANCE
 * 
 * This module has been deprecated as part of the NEØ Protocol FASE 2 migration.
 * 
 * REASON:
 * FlowPay no longer calls Neobot directly. All inter-service communication
 * now flows through Neo-Nexus (the central event bus).
 * 
 * Flow Before (FASE 1):
 *   FlowPay → Nexus (PAYMENT_RECEIVED)
 *   FlowPay → Neobot (direct call) ← REDUNDANT
 * 
 * Flow After (FASE 2):
 *   FlowPay → Nexus (PAYMENT_RECEIVED)
 *   Nexus → Smart Factory (MINT_REQUESTED)
 *   Nexus → Neobot (ACCESS_UNLOCK)
 * 
 * MIGRATION:
 * - Remove NEOBOT_URL and NEOBOT_API_KEY from .env
 * - The Nexus now handles routing to Neobot via payment-to-unlock reactor
 * 
 * DOCUMENT: neo-nexus/docs/ECOSYSTEM_COMPLIANCE_CHECKLIST.md (v3.0)
 * DATE: 2026-02-06
 */

import { secureLog } from './config.mjs';

/**
 * @deprecated Use Nexus routing instead (see nexus-bridge.mjs)
 */
export async function triggerNeobotUnlock(chargeId, customerRef) {
    secureLog('warn', '⚠️ DEPRECATED: triggerNeobotUnlock called. This function is no longer active.');
    secureLog('warn', '⚠️ MIGRATION: Use Nexus routing via PAYMENT_RECEIVED event instead.');

    return {
        success: false,
        deprecated: true,
        error: 'This function has been deprecated. Payment unlock is now handled by Nexus routing.',
        migration: 'See neo-nexus/docs/ECOSYSTEM_COMPLIANCE_CHECKLIST.md'
    };
}
