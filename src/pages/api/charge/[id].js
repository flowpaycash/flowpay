import * as Sentry from "@sentry/astro";
import {
  getOrder,
  updateOrderStatus,
} from "../../../services/database/sqlite.mjs";
import { getCorsHeaders, secureLog } from "../../../services/api/config.mjs";
import { applyRateLimit } from "../../../services/api/rate-limiter.mjs";
import { ensurePixReconciliationSchedulerStarted } from "../../../services/api/pix-reconciliation-scheduler.mjs";

ensurePixReconciliationSchedulerStarted();

const WOOVI_PAID_STATUSES = new Set([
  "COMPLETED",
  "PAID",
  "CONFIRMED",
  "RECEIVED",
]);

async function syncCreatedOrderFromWoovi(chargeId) {
  const apiKey = process.env.WOOVI_API_KEY?.trim();
  const apiUrl = (process.env.WOOVI_API_URL || "https://api.woovi.com").replace(
    /\/$/,
    ""
  );

  if (!apiKey) {
    return { synced: false };
  }

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/charge/${encodeURIComponent(chargeId)}`,
      {
        method: "GET",
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return { synced: false, httpStatus: response.status };
    }

    const payload = await response.json();
    const charge = payload?.charge || null;
    const providerStatus = String(charge?.status || "").toUpperCase();

    if (!WOOVI_PAID_STATUSES.has(providerStatus)) {
      return { synced: false, providerStatus };
    }

    updateOrderStatus(chargeId, "PIX_PAID", {
      paid_at: new Date(charge?.paidAt || Date.now()).toISOString(),
    });
    updateOrderStatus(chargeId, "PENDING_REVIEW");

    secureLog("info", "Charge reconciliada via consulta Woovi", {
      chargeId,
      providerStatus,
    });

    // Mantém trilha do funil de receita mesmo quando webhook não atualiza.
    try {
      const { notifyNexus } = await import(
        "../../../services/api/nexus-bridge.mjs"
      );
      notifyNexus("PAYMENT_RECEIVED", {
        transactionId: chargeId,
        orderId: chargeId,
        amount: Number(charge?.value || 0) / 100,
        currency: "BRL",
        metadata: {
          source: "flowpay_charge_polling_reconciliation",
          providerStatus,
          providerIdentifier: charge?.identifier || null,
          paidAt: charge?.paidAt || null,
        },
      }).catch((error) => {
        secureLog("warn", "Falha ao notificar Nexus no fallback de charge", {
          chargeId,
          error: error.message,
        });
      });
    } catch (error) {
      secureLog("warn", "Nexus bridge indisponivel no fallback de charge", {
        chargeId,
        error: error.message,
      });
    }

    return { synced: true, providerStatus };
  } catch (error) {
    secureLog("warn", "Erro ao consultar Woovi em /api/charge/[id]", {
      chargeId,
      error: error.message,
    });
    return { synced: false, error: error.message };
  }
}

export const GET = async ({ params, request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  const { id } = params;

  if (!id || typeof id !== "string" || id.length > 100) {
    return new Response(JSON.stringify({ error: "Invalid ID" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Rate limit to prevent enumeration
  const rateLimitResult = await applyRateLimit("pix-orders")({
    headers: Object.fromEntries(request.headers),
    context: { clientIP: clientAddress },
  });

  if (rateLimitResult && rateLimitResult.statusCode === 429) {
    return new Response(rateLimitResult.body, { status: 429, headers });
  }

  Sentry.addBreadcrumb({
    category: "charge",
    message: "Consultando status da charge",
    level: "info",
    data: { charge_id: id },
  });

  try {
    let order = getOrder(id);

    if (!order) {
      Sentry.addBreadcrumb({
        category: "charge",
        message: "Charge nao encontrada no DB",
        level: "warning",
        data: { charge_id: id },
      });
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (order.status === "CREATED") {
      const reconcile = await syncCreatedOrderFromWoovi(id);
      if (reconcile.synced) {
        order = getOrder(id) || order;
      }
    }

    Sentry.addBreadcrumb({
      category: "charge",
      message: "Charge encontrada",
      level: "info",
      data: { charge_id: id, status: order.status },
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: order.status,
        tx_hash: order.tx_hash,
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    secureLog("error", "Charge lookup error", { error: e.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "charge_lookup");
      scope.setContext("charge", { charge_id: id });
      Sentry.captureException(e);
    });
    return new Response(JSON.stringify({ error: "Server Error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
};

export const OPTIONS = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  return new Response(null, { status: 204, headers });
};
