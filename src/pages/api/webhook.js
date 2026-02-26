import * as Sentry from "@sentry/astro";
import { applyRateLimit } from "../../services/api/rate-limiter.mjs";
import { getCorsHeaders, secureLog } from "../../services/api/config.mjs";
import {
  updateOrderStatus,
  getOrder,
  getDatabase,
} from "../../services/database/sqlite.mjs";
import crypto from "crypto";
import { ensurePixReconciliationSchedulerStarted } from "../../services/api/pix-reconciliation-scheduler.mjs";

ensurePixReconciliationSchedulerStarted();

const WEBHOOK_SIGNATURE_HEADERS = [
  "x-woovi-signature",
  "x-openpix-signature",
  "x-webhook-signature",
  "x-signature",
];

const WOOVI_PAID_STATUSES = new Set([
  "COMPLETED",
  "PAID",
  "CONFIRMED",
  "RECEIVED",
]);

function normalizeSignature(signature) {
  if (!signature || typeof signature !== "string") return "";
  return signature.replace(/^sha256=/i, "").trim();
}

function timingSafeEqualString(a, b) {
  if (!a || !b) return false;
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

async function verifyPaidStatusFromWoovi(correlationID) {
  const apiKey = process.env.WOOVI_API_KEY?.trim();
  const apiUrl = (process.env.WOOVI_API_URL || "https://api.woovi.com").replace(
    /\/$/,
    ""
  );

  if (!apiKey || !correlationID) {
    return { verified: false };
  }

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/charge/${encodeURIComponent(correlationID)}`,
      {
        method: "GET",
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return { verified: false, httpStatus: response.status };
    }

    const payload = await response.json();
    const charge = payload?.charge || null;
    const status = String(charge?.status || "").toUpperCase();

    return {
      verified: WOOVI_PAID_STATUSES.has(status),
      status,
      charge,
    };
  } catch (error) {
    secureLog("warn", "Woovi fallback verification failed", {
      correlationID,
      error: error.message,
    });
    return { verified: false, error: error.message };
  }
}

export const POST = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    const rateLimitResult = await applyRateLimit("webhook-handler")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, { status: 429, headers });
    }

    const { config } = await import("../../services/api/config.mjs");

    // Cloudflare injeta o IP real do cliente em CF-Connecting-IP.
    // Sem esse header (acesso direto ao Railway), usa clientAddress como fallback.
    const cfIP = request.headers.get("cf-connecting-ip");
    const rawIP = cfIP || clientAddress;
    const normalizedIP = rawIP.replace("::ffff:", "");

    secureLog("info", "Woovi Webhook: IP recebido", {
      cf_connecting_ip: cfIP || "ausente",
      client_address: clientAddress,
      resolved_ip: normalizedIP,
    });

    if (!config.woovi.allowedIPs.includes(normalizedIP)) {
      secureLog(
        "warn",
        `Webhook bloqueado: IP nao autorizado (${normalizedIP})`
      );
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("security.violation", "unauthorized_ip");
        scope.setTag("source", "woovi_webhook");
        scope.setContext("request", {
          ip: normalizedIP,
          cf_connecting_ip: cfIP || "ausente",
          client_address: clientAddress,
        });
        Sentry.captureMessage(
          `Woovi Webhook: IP nao autorizado bloqueado — ${normalizedIP}`,
          "warning"
        );
      });
      return new Response(JSON.stringify({ error: "Unauthorized IP" }), {
        status: 403,
        headers,
      });
    }

    const rawBody = await request.text();
    const signatureHeaderUsed = WEBHOOK_SIGNATURE_HEADERS.find((headerName) =>
      request.headers.get(headerName)
    );
    const signature = normalizeSignature(
      signatureHeaderUsed ? request.headers.get(signatureHeaderUsed) : null
    );
    const WEBHOOK_SECRET = process.env.WOOVI_WEBHOOK_SECRET;

    let payload = null;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      secureLog("warn", "Webhook com payload JSON invalido", {
        error: parseError.message,
      });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const eventType = payload?.event;
    const chargeFromPayload = payload?.data?.charge || {};
    const correlationIDFromPayload = chargeFromPayload?.correlationID;

    if (!WEBHOOK_SECRET) {
      secureLog(
        "warn",
        "Webhook sem WOOVI_WEBHOOK_SECRET configurado - retornando 200 para validacao"
      );
      return new Response(JSON.stringify({ status: "ready" }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let webhookVerified = false;
    let verificationMethod = "none";

    if (signature) {
      // HMAC validation with support for Base64, Base64URL and HEX variants.
      const digestBase64 = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawBody)
        .digest("base64");
      const digestBase64Url = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawBody)
        .digest("base64url");
      const digestHex = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      if (
        timingSafeEqualString(signature, digestBase64) ||
        timingSafeEqualString(signature, digestBase64Url) ||
        timingSafeEqualString(signature, digestHex)
      ) {
        webhookVerified = true;
        verificationMethod = `hmac:${signatureHeaderUsed}`;
      }
    }

    // No fallback verification — HMAC signature is required.
    // The IP allowlist (WOOVI_ALLOWED_IPS) is the defense-in-depth layer.
    // Reconciliation of missed webhooks should be done via a scheduled job,
    // not by accepting unverified inbound requests.

    if (!webhookVerified) {
      if (!signature && !eventType) {
        secureLog(
          "info",
          "Astro Webhook: Ping sem assinatura - retornando 200 para validacao"
        );
        return new Response(JSON.stringify({ status: "ready" }), {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      secureLog("error", "Astro Webhook: assinatura ausente/invalida", {
        signature_header: signatureHeaderUsed || "none",
        signature_preview: signature ? `${signature.slice(0, 10)}...` : "none",
        eventType: eventType || "unknown",
        correlationID: correlationIDFromPayload || "unknown",
        available_x_headers: Array.from(request.headers.keys())
          .filter((headerName) => headerName.startsWith("x-"))
          .slice(0, 12),
      });

      return new Response(
        JSON.stringify({ error: "Unauthorized webhook payload" }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const charge = chargeFromPayload || {};
    const correlationID = charge?.correlationID || correlationIDFromPayload;

    secureLog("info", `Astro Webhook recebido: ${eventType}`, {
      correlationID,
      verificationMethod,
    });

    Sentry.addBreadcrumb({
      category: "webhook.woovi",
      message: `Evento recebido: ${eventType}`,
      level: "info",
      data: { eventType, correlationID, verificationMethod },
    });

    if (eventType === "charge.paid" || eventType === "charge.confirmed") {
      const order = getOrder(correlationID);

      if (order) {
        // Idempotency check
        const terminalStates = [
          "COMPLETED",
          "PIX_PAID",
          "PENDING_REVIEW",
          "APPROVED",
          "SETTLED",
        ];
        if (
          terminalStates.includes(order.status) ||
          order.bridge_status === "SENT"
        ) {
          secureLog(
            "info",
            "Astro Webhook: Idempotency check - Order already processed",
            { correlationID, status: order.status, bridge: order.bridge_status }
          );
          Sentry.addBreadcrumb({
            category: "webhook.woovi",
            message: "Idempotency: pedido ja processado, ignorando",
            level: "info",
            data: { correlationID, status: order.status },
          });
          return new Response(
            JSON.stringify({ success: true, message: "Already processed" }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            }
          );
        }

        updateOrderStatus(correlationID, "PIX_PAID", {
          paid_at: new Date(charge.paidAt || Date.now()).toISOString(),
        });
        updateOrderStatus(correlationID, "PENDING_REVIEW");

        Sentry.addBreadcrumb({
          category: "webhook.woovi",
          message: "Status do pedido atualizado para PENDING_REVIEW",
          level: "info",
          data: { correlationID },
        });

        secureLog("info", "Astro Webhook: Preparando disparo da Bridge", {
          correlationID,
        });

        const customerEmail = charge.customer?.email;
        const customerName = charge.customer?.name;
        const customerTaxID = charge.customer?.taxID?.taxID;

        // Enriquecer dados do comprador
        try {
          const db = getDatabase();
          const updates = [];
          const values = [];
          if (customerEmail && !order.customer_email) {
            updates.push("customer_email = ?");
            values.push(customerEmail);
          }
          if (customerName && !order.customer_name) {
            updates.push("customer_name = ?");
            values.push(customerName);
          }
          if (customerTaxID && !order.customer_cpf) {
            updates.push("customer_cpf = ?");
            values.push(customerTaxID);
          }
          if (updates.length > 0) {
            values.push(correlationID);
            db.prepare(
              `UPDATE orders SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE charge_id = ?`
            ).run(...values);
            secureLog("info", "Webhook: Dados do comprador atualizados", {
              correlationID,
            });
          }
        } catch (enrichErr) {
          secureLog("warn", "Webhook: Falha ao enriquecer dados do comprador", {
            error: enrichErr.message,
          });
          Sentry.withScope((scope) => {
            scope.setLevel("warning");
            scope.setTag("source", "woovi_webhook");
            scope.setTag("failure", "buyer_data_enrichment");
            scope.setContext("charge", { correlationID });
            Sentry.captureException(enrichErr);
          });
        }

        // POE: Proof of existence layer
        try {
          const { getPOEService } =
            await import("../../../services/blockchain/poe-service.js");
          const poe = getPOEService();
          await poe.addOrderToBatch(correlationID);
          Sentry.addBreadcrumb({
            category: "webhook.woovi",
            message: "Pedido adicionado ao batch de PoE",
            level: "info",
            data: { correlationID },
          });
        } catch (poeErr) {
          secureLog(
            "error",
            "Astro Webhook: Erro ao adicionar na camada de PoE",
            { error: poeErr.message }
          );
          Sentry.withScope((scope) => {
            scope.setLevel("error");
            scope.setTag("source", "woovi_webhook");
            scope.setTag("failure", "poe_batch_add");
            scope.setContext("charge", { correlationID });
            Sentry.captureException(poeErr);
          });
        }

        // Nexus bridge notification
        const { notifyNexus } =
          await import("../../services/api/nexus-bridge.mjs");
        notifyNexus("PAYMENT_RECEIVED", {
          transactionId: correlationID,
          orderId: correlationID,
          amount: charge.value / 100,
          currency: "BRL",
          payer: order.customer_wallet || order.customer_ref || "unknown",
          customerEmail,
          metadata: {
            source: "flowpay",
            chargeId: charge.identifier,
            paidAt: charge.paidAt,
          },
        }).catch((err) => {
          secureLog("error", "Astro Webhook: Erro ao notificar Nexus", {
            error: err.message,
          });
          Sentry.withScope((scope) => {
            scope.setLevel("error");
            scope.setTag("source", "woovi_webhook");
            scope.setTag("failure", "nexus_notification");
            scope.setContext("charge", { correlationID });
            Sentry.captureException(err);
          });
        });

        // Email notification (Customer)
        if (customerEmail) {
          try {
            const { sendEmail } =
              await import("../../services/api/email-service.mjs");
            const { paymentConfirmedTemplate } =
              await import("../../services/api/email/templates/payment-confirmed.mjs");

            sendEmail({
              to: customerEmail,
              subject: "Pagamento Confirmado - FlowPay",
              html: paymentConfirmedTemplate({
                orderId: correlationID,
                amount: charge.value / 100,
              }),
            }).catch((err) => {
              secureLog("error", "Webhook: Erro de e-mail assíncrono", {
                error: err.message,
              });
              Sentry.withScope((scope) => {
                scope.setLevel("warning");
                scope.setTag("source", "woovi_webhook");
                scope.setTag("failure", "payment_confirmed_email");
                scope.setContext("charge", { correlationID });
                Sentry.captureException(err);
              });
            });
          } catch (emailErr) {
            secureLog(
              "error",
              "Webhook: Erro ao carregar servico de e-mail ou template (Buyer)",
              { error: emailErr.message }
            );
          }
        }

        // Notificação do Vendedor (A3)
        if (order && order.product_ref && order.product_ref !== "manual") {
          try {
            const { vendedorNotificacaoTemplate } = await import("../../services/api/email/templates/vendedor-notificacao.mjs");
            const { getPaymentButton } = await import("../../services/database/sqlite.mjs");
            const sellerData = getPaymentButton(order.product_ref);

            if (sellerData && sellerData.user_email) {
              const { sendEmail } = await import("../../services/api/email-service.mjs");

              void sendEmail({
                to: sellerData.user_email,
                subject: `Novo pagamento de R$ ${(charge.value / 100).toFixed(2)} recebido!`,
                html: vendedorNotificacaoTemplate({
                  sellerName: sellerData.user_name || "Vendedor",
                  amount: charge.value / 100,
                  productName: sellerData.title || order.product_name || "Link de Pagamento",
                  customerName: order.customer_name || null
                })
              }).catch((err) => {
                secureLog("error", "Webhook: Erro ao notificar vendedor por e-mail", {
                  error: err.message,
                  sellerEmail: sellerData.user_email
                });
              });
            }
          } catch (sellerErr) {
            secureLog("error", "Webhook: Erro ao carregar templates para o vendedor", {
              error: sellerErr.message
            });
          }
        }
      } else {
        secureLog("warn", "Astro Webhook: Pedido nao encontrado no SQLite", {
          correlationID,
        });
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("source", "woovi_webhook");
          scope.setTag("failure", "order_not_found");
          scope.setContext("charge", { correlationID, eventType });
          Sentry.captureMessage(
            `Woovi Webhook: pedido nao encontrado para correlationID ${correlationID}`,
            "warning"
          );
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    secureLog("error", "Astro Webhook: critical error", {
      error: error.message,
    });
    Sentry.withScope((scope) => {
      scope.setLevel("fatal");
      scope.setTag("source", "woovi_webhook");
      scope.setTag("failure", "unhandled_webhook_error");
      Sentry.captureException(error);
    });
    // Em erro critico, retornar 5xx para permitir retentativa do provedor
    return new Response(JSON.stringify({ error: "Internal error" }), {
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
