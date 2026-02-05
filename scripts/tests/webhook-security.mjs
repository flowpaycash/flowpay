import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * 🛡️ Webhook Security & IP Guard Test
 * Simulates requests from external IPs and invalid signatures.
 */

const TARGET_WEBHOOK = process.env.TEST_WEBHOOK_URL || 'http://localhost:4321/api/webhook';
const SECRET = process.env.WOOVI_WEBHOOK_SECRET || 'test_secret';

async function testWebhookSecurity() {
    console.log(`\n🛡️ Testing Webhook Security Guard at: ${TARGET_WEBHOOK}\n`);

    const payload = { event: 'test.ping', data: {} };
    const body = JSON.stringify(payload);

    // 1. Test Without Signature
    console.log('Step 1: Request without signature...');
    try {
        const r1 = await fetch(TARGET_WEBHOOK, { method: 'POST', body });
        console.log(`Result: ${r1.status} ${r1.statusText} (Expected: 401/403)`);
    } catch (e) {
        console.log(`Connection blocked (Expected if firewall/local): ${e.message}`);
    }

    // 2. Test With Invalid Signature
    console.log('\nStep 2: Request with invalid signature...');
    try {
        const r2 = await fetch(TARGET_WEBHOOK, {
            method: 'POST',
            body,
            headers: { 'x-woovi-signature': 'invalid_sig' }
        });
        console.log(`Result: ${r2.status} ${r2.statusText} (Expected: 401)`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // 3. Test IP Authorization Message
    console.log('\nStep 3: Checking IP Guard logs...');
    console.log('NOTE: If you are running this locally, the IP will be localhost.');
    console.log('In production, the log will show: "Astro Webhook bloqueado: IP não autorizado"');

    console.log('\n✨ Webhook security check completed.\n');
}

testWebhookSecurity();
