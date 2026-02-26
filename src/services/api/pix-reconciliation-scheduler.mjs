import { runPixReconciliationBatch } from "./pix-reconciliation.mjs";
import { secureLog } from "./config.mjs";

let started = false;
let running = false;

function parseIntervalMs() {
  const raw = Number(process.env.FLOWPAY_PIX_RECONCILIATION_INTERVAL_MS || 20000);
  if (!Number.isFinite(raw)) return 20000;
  return Math.max(5000, Math.min(Math.trunc(raw), 300000));
}

async function tick(intervalMs) {
  if (running) return;
  running = true;

  try {
    const batch = await runPixReconciliationBatch({
      source: "flowpay_reconciliation_scheduler",
    });

    if (batch.synced > 0) {
      secureLog("info", "Scheduler: reconciliacao automatica aplicada", {
        intervalMs,
        ...batch,
      });
    }
  } catch (error) {
    secureLog("error", "Scheduler: erro na reconciliacao automatica", {
      error: error.message,
    });
  } finally {
    running = false;
  }
}

export function ensurePixReconciliationSchedulerStarted() {
  if (started) return;

  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (process.env.FLOWPAY_PIX_RECONCILIATION_ENABLED === "false") {
    return;
  }

  started = true;

  const intervalMs = parseIntervalMs();
  const timer = setInterval(() => {
    void tick(intervalMs);
  }, intervalMs);
  timer.unref?.();

  const bootstrap = setTimeout(() => {
    void tick(intervalMs);
  }, Math.min(5000, intervalMs));
  bootstrap.unref?.();

  secureLog("info", "Scheduler: reconciliacao PIX automatica iniciada", {
    intervalMs,
    batchLimit: Number(process.env.FLOWPAY_PIX_RECONCILIATION_BATCH_SIZE || 25),
  });
}
