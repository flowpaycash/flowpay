import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 🦁 FLOWPay Master Test Runner
 * Orchestrates the full security and integration suite.
 */

const tests = [
    'auth-db-check.mjs',
    'security-audit.mjs',
    'webhook-security.mjs'
];

console.log('========================================');
console.log('🦁 FLOWPay - SOVEREIGN TEST SUITE 🦁');
console.log('========================================\n');

let failed = 0;

tests.forEach(testFile => {
    const testPath = path.join(__dirname, testFile);
    console.log(`\n▶️  RUNNING: ${testFile}`);
    try {
        execSync(`node ${testPath}`, { stdio: 'inherit', env: { ...process.env, NODE_NO_WARNINGS: '1' } });
        console.log(`✅ COMPLETED: ${testFile}`);
    } catch (err) {
        console.error(`❌ FAILED: ${testFile}`);
        failed++;
    }
});

console.log('\n========================================');
if (failed === 0) {
    console.log('✨ ALL SYSTEMS GO - 100% PASS ✨');
} else {
    console.log(`⚠️  TEST SUITE FINISHED WITH ${failed} FAILURES`);
}
console.log('========================================\n');

if (failed > 0) process.exit(1);
