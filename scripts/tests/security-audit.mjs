import fetch from 'node-fetch'; // or use global fetch in Node 20+

/**
 * 🔐 Security Audit Test
 * Checks if the required security headers and CSP are present.
 */

const POTENTIAL_URLS = [
    process.env.TEST_URL,
    'https://flowpay.cash',
    'http://localhost:4321',
    'http://localhost:3000',
    'http://localhost:8888'
].filter(Boolean);

async function runAudit() {
    let response;
    let finalUrl;

    console.log(`\n🚀 Starting Security Audit...\n`);

    for (const url of POTENTIAL_URLS) {
        try {
            console.log(`Checking: ${url}...`);
            response = await fetch(url, { timeout: 3000 });
            if (response.ok || response.status < 500) {
                finalUrl = url;
                break;
            }
        } catch (e) {
            // Silently try next
        }
    }

    if (!finalUrl) {
        console.error('❌ Could not connect to any target URL (localhost or production).');
        console.log('TIP: Start the server with "npm run dev" before running this test.');
        process.exit(1);
    }

    try {
        console.log(`\n✅ Connected to: ${finalUrl}\n`);
        const headers = response.headers;

        const checks = [
            { name: 'Strict-Transport-Security', expected: 'max-age=31536000' },
            { name: 'X-Frame-Options', expected: 'DENY' },
            { name: 'X-Content-Type-Options', expected: 'nosniff' },
            { name: 'Content-Security-Policy', contains: 'script-src' }
        ];

        console.log('--- HEADER CHECKS ---');
        let passed = 0;
        checks.forEach(check => {
            const val = headers.get(check.name);
            if (val && (check.expected ? val.includes(check.expected) : val.includes(check.contains))) {
                console.log(`✅ ${check.name}: PASS`);
                passed++;
            } else {
                console.log(`❌ ${check.name}: FAIL (Got: ${val})`);
            }
        });

        console.log(`\nScore: ${passed}/${checks.length}`);

        if (passed === checks.length) {
            console.log('\n✨ Security Baseline Verified!');
        } else {
            console.warn('\n⚠️ Some security headers are missing or misconfigured.');
        }

    } catch (err) {
        console.error(`❌ Audit failed: ${err.message}`);
        process.exit(1);
    }
}

runAudit();
