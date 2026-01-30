console.log("🚀 [Wrapper] Server wrapper starting...");
console.log(`[Wrapper] Environment: PORT=${process.env.PORT}, HOST=${process.env.HOST}, RAILWAY=${process.env.RAILWAY_ENVIRONMENT}`);
console.log("[Wrapper] Current directory:", process.cwd());

try {
    console.log("[Wrapper] Importing entry.mjs...");
    await import('./dist/server/entry.mjs');
    console.log("[Wrapper] Import successful.");
} catch (err) {
    console.error("🔥 [Wrapper] CRITICAL ERROR importing entry.mjs:", err);
    process.exit(1);
}
