import * as Sentry from "@sentry/astro";
import { applyRateLimit } from "../../services/api/rate-limiter.mjs";
import { getCorsHeaders, secureLog } from "../../services/api/config.mjs";
import {
  updateOrderStatus,
  getOrder,
  getDatabase,
} from "../../services/database/sqlite.mjs";
import crypto from "crypto";

export const POST = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    const rateLimitResult = applyRateLimit("webhook-handler")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, { status: 429, headers });
    }

    const clientIP = clientAddress;
    const normalizedIP = clientIP.replace("::ffff:", "");
    const { config } = await import("../../services/api/config.mjs");

    if (!config.woovi.allowedIPs.includes(normalizedIP)) {
      secureLog(
        "warn",
        `Webhook bloqueado: IP nao autorizado (${normalizedIP})`
      );
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("security.violation", "unauthorized_ip");
        scope.setTag("source", "woovi_webhook");
        scope.setContext("request", { ip: normalizedIP });
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
    const signature = request.headers.get("x-woovi-signature");
    const WEBHOOK_SECRET = process.env.WOOVI_WEBHOOK_SECRET;

    if (!signature || !WEBHOOK_SECRET) {
      secureLog(
        "info",
        "Astro Webhook: Ping ou falta de secret - retornando 200 para validacao"
      );
      return new Response(JSON.stringify({ status: "ready" }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // HMAC validation (timing-safe)
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest("base64");

    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

    if (
      sigBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, digestBuffer)
    ) {
      secureLog("error", "Astro Webhook: Invalid Signature");
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        scope.setTag("security.violation", "invalid_hmac_signature");
        scope.setTag("source", "woovi_webhook");
        scope.setContext("request", {
          ip: normalizedIP,
          signature_received: signature
            ? signature.substring(0, 10) + "..."
            : "none",
        });
        Sentry.captureMessage(
          "Woovi Webhook: assinatura HMAC invalida — possivel tentativa de forja",
          "error"
        );
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers,
      });
    }

    const { data, event: eventType } = JSON.parse(rawBody);
    const charge = data.charge;
    const correlationID = charge.correlationID;

    secureLog("info", `Astro Webhook recebido: ${eventType}`, {
      correlationID,
    });

    Sentry.addBreadcrumb({
      category: "webhook.woovi",
      message: `Evento recebido: ${eventType}`,
      level: "info",
      data: { eventType, correlationID },
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

        // Email notification
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
              "Webhook: Erro ao carregar servico de e-mail ou template",
              { error: emailErr.message }
            );
            Sentry.withScope((scope) => {
              scope.setLevel("warning");
              scope.setTag("source", "woovi_webhook");
              scope.setTag("failure", "email_service_load");
              scope.setContext("charge", { correlationID });
              Sentry.captureException(emailErr);
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
    // Retorna 200 para a Woovi nao re-tentar em erros de logica
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers,
    });
  }
};

export const OPTIONS = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  return new Response(null, { status: 204, headers });
};
