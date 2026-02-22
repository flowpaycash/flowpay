/**
 * 🚀 NΞØ PROTOCOL - Stress Test Suite
 * "Ca-ching!" 💰
 */

const TARGET_URL = 'http://localhost:4321/api/health';
const DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CONCURRENCY = 10;
const REPORT_INTERVAL_MS = 10 * 1000; // 10 seconds

let totalRequests = 0;
let totalSuccess = 0;
let totalErrors = 0;
let startTimes = [];
let latencies = [];

console.log('\x1b[35m%s\x1b[0m', '--- 🚀 NΞØ FLOWPAY STRESS TEST ---');
console.log('Target:', TARGET_URL);
console.log('Duration:', DURATION_MS / 1000 / 60, 'minutes');
console.log('Concurrency:', CONCURRENCY);
console.log('-----------------------------------');

async function performRequest() {
    const start = Date.now();
    totalRequests++;
    try {
        const res = await fetch(TARGET_URL);
        if (res.ok) {
            totalSuccess++;
        } else {
            totalErrors++;
        }
    } catch (err) {
        totalErrors++;
    } finally {
        const end = Date.now();
        latencies.push(end - start);
    }
}

async function stress() {
    const testEnd = Date.now() + DURATION_MS;

    const reportTimer = setInterval(() => {
        const uptime = Math.floor((Date.now() - testStart) / 1000);
        const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
        const rps = (totalRequests / uptime).toFixed(2);

        console.log(`\x1b[36m[${uptime}s]\x1b[0m Requests: ${totalRequests} | \x1b[32mSuccess: ${totalSuccess}\x1b[0m | \x1b[31mErrors: ${totalErrors}\x1b[0m | Avg Latency: ${avgLatency}ms | RPS: ${rps} 💰`);

        // Clear latencies to avoid memory bloat over 30 mins
        if (latencies.length > 1000) latencies = latencies.slice(-100);
    }, REPORT_INTERVAL_MS);

    const testStart = Date.now();

    while (Date.now() < testEnd) {
        const batch = Array.from({ length: CONCURRENCY }, () => performRequest());
        await Promise.all(batch);
        // Tiny sleep to prevent CPU choking if needed, though this is a stress test
        await new Promise(r => setTimeout(r, 10));
    }

    clearInterval(reportTimer);

    console.log('\n\x1b[35m%s\x1b[0m', '--- ✅ STRESS TEST COMPLETE ---');
    console.log('Total Requests:', totalRequests);
    console.log('Total Success:', totalSuccess);
    console.log('Total Errors:', totalErrors);
    console.log('Final RPS:', (totalRequests / (DURATION_MS / 1000)).toFixed(2));
    console.log('Ca-ching! 💰💰💰');
}

stress().catch(console.error);
