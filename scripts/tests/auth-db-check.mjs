import { getDatabase } from '../../src/services/database/sqlite.mjs';
import crypto from 'crypto';

/**
 * 🎫 Auth Flow Integration Test
 * Validates the database operations for Magic Links.
 */

async function testAuthDB() {
    console.log('\n🎫 Testing Magic Link DB Integration...\n');

    try {
        const db = getDatabase();
        const testEmail = `test-${crypto.randomBytes(4).toString('hex')}@neoprotocol.space`;
        const testToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // 1. Test Saving
        console.log(`Step 1: Saving token for ${testEmail}...`);
        const insertStmt = db.prepare('INSERT INTO auth_tokens (email, token, expires_at) VALUES (?, ?, ?)');
        const info = insertStmt.run(testEmail, testToken, expiresAt.toISOString());

        if (info.changes > 0) {
            console.log('✅ Token saved to DB');
        } else {
            throw new Error('Failed to save token');
        }

        // 2. Test Verification (Success case)
        console.log('Step 2: Verifying token (valid)...');
        const verifyStmt = db.prepare('SELECT * FROM auth_tokens WHERE token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP');
        const found = verifyStmt.get(testToken);

        if (found && found.email === testEmail) {
            console.log('✅ Token found and email matches');
        } else {
            throw new Error('Token not found or expired in DB');
        }

        // 3. Test Usage Marking
        console.log('Step 3: Marking token as used...');
        db.prepare('UPDATE auth_tokens SET used = 1 WHERE id = ?').run(found.id);
        const expired = verifyStmt.get(testToken);

        if (!expired) {
            console.log('✅ Token successfully invalidated after use');
        } else {
            throw new Error('Token still valid after usage marking');
        }

        console.log('\n✨ Auth Database Flow: ALL PASS\n');

    } catch (err) {
        console.error(`❌ Auth DB test failed: ${err.message}`);
        process.exit(1);
    }
}

testAuthDB();
