import {
  getOrder,
  listCreatedOrdersForReconciliation,
  updateOrderStatus,
} from "../database/sqlite.mjs";
import { secureLog } from "./config.mjs";

const WOOVI_PAID_STATUSES = new Set(["COMPLETED", "PAID", "CONFIRMED", "RECEIVED"]);

function toPositiveInt(value, fallback, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.trunc(value), max));
}

async function fetchWooviCharge(chargeId, timeoutMs) {
  const apiKey = process.env.WOOVI_API_KEY?.trim();
  const apiUrl = (process.env.WOOVI_API_URL || "https://api.woovi.com").replace(/\/$/, "");

  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/charge/${encodeURIComponent(chargeId)}`, {
      method: "GET",
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return { ok: false, reason: "provider_http_error", statusCode: response.status };
    }

    const payload = await response.json();
    const charge = payload?.charge || null;
    const providerStatus = String(charge?.status || "").toUpperCase();

    return {
      ok: true,
      providerStatus,
      isPaid: WOOVI_PAID_STATUSES.has(providerStatus),
      charge,
    };
  } catch (error) {
    return { ok: false, reason: "provider_exception", error: error.message };
  }
}

async function notifyPaymentReceived(chargeId, charge, providerStatus, amountFallback, source) {
  try {
    const { notifyNexus } = await import("./nexus-bridge.mjs");
    await notifyNexus("PAYMENT_RECEIVED", {
      transactionId: chargeId,
      orderId: chargeId,
      amount: Number(charge?.value || 0) / 100 || amountFallback || 0,
      currency: "BRL",
      metadata: {
        source,
        providerStatus,
        providerIdentifier: charge?.identifier || null,
        paidAt: charge?.paidAt || null,
      },
    });
  } catch (error) {
    secureLog("warn", "Reconciliation: falha ao notificar Nexus", {
      chargeId,
      error: error.message,
    });
  }
}

export async function runPixReconciliationBatch(options = {}) {
  const limit = toPositiveInt(
    Number(options.limit ?? process.env.FLOWPAY_PIX_RECONCILIATION_BATCH_SIZE ?? 25),
    25,
    200
  );
  const minAgeSeconds = toPositiveInt(
    Number(options.minAgeSeconds ?? process.env.FLOWPAY_PIX_RECONCILIATION_MIN_AGE_SECONDS ?? 15),
    15,
    3600
  );
  const maxAgeMinutes = toPositiveInt(
    Number(options.maxAgeMinutes ?? process.env.FLOWPAY_PIX_RECONCILIATION_MAX_AGE_MINUTES ?? 180),
    180,
    24 * 60
  );
  const timeoutMs = toPositiveInt(
    Number(options.timeoutMs ?? process.env.FLOWPAY_PIX_RECONCILIATION_TIMEOUT_MS ?? 8000),
    8000,
    30000
  );
  const source = options.source || "flowpay_auto_reconciliation";
  const notifyBridge = options.notifyBridge !== false;

  const candidates = listCreatedOrdersForReconciliation({
    limit,
    minAgeSeconds,
    maxAgeMinutes,
  });

  const result = {
    checked: candidates.length,
    synced: 0,
    skipped: 0,
    errors: 0,
  };

  for (const candidate of candidates) {
    const chargeId = candidate.charge_id;
    const current = getOrder(chargeId);

    if (!current || current.status !== "CREATED") {
      result.skipped++;
      continue;
    }

    const providerCheck = await fetchWooviCharge(chargeId, timeoutMs);

    if (!providerCheck.ok) {
      result.errors++;
      continue;
    }

    if (!providerCheck.isPaid) {
      result.skipped++;
      continue;
    }

    updateOrderStatus(chargeId, "PIX_PAID", {
      paid_at: new Date(providerCheck.charge?.paidAt || Date.now()).toISOString(),
    });
    updateOrderStatus(chargeId, "PENDING_REVIEW");
    result.synced++;

    secureLog("info", "Reconciliation: pedido atualizado para PENDING_REVIEW", {
      chargeId,
      providerStatus: providerCheck.providerStatus,
      source,
    });

    if (notifyBridge) {
      await notifyPaymentReceived(
        chargeId,
        providerCheck.charge,
        providerCheck.providerStatus,
        Number(candidate.amount_brl || 0),
        source
      );
    }
  }

  return result;
}
