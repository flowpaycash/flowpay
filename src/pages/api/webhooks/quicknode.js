import * as Sentry from "@sentry/astro";
import { secureLog } from "../../../services/api/config.mjs";
import crypto from "crypto";

/**
 * Endpoint para receber webhooks do QuickNode
 * Suporta monitoramento de transferencias USDT e Wallets
 */
export const POST = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-qn-signature") ||
      request.headers.get("x-quicknode-signature");
    const secret = process.env.QUICKNODE_WEBHOOK_SECRET;

    // Validacao de assinatura se o secret estiver configurado
    if (secret && signature) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = hmac.update(rawBody).digest("hex");

      if (signature !== digest) {
        secureLog("error", "QuickNode Webhook: Assinatura invalida");
        Sentry.withScope((scope) => {
          scope.setLevel("error");
          scope.setTag("security.violation", "invalid_hmac_signature");
          scope.setTag("source", "quicknode_webhook");
          scope.setContext("request", {
            signature_received: signature
              ? signature.substring(0, 10) + "..."
              : "none",
          });
          Sentry.captureMessage(
            "QuickNode Webhook: assinatura HMAC invalida — possivel tentativa de forja",
            "error"
          );
        });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
        });
      }
    }

    const data = JSON.parse(rawBody);
    const isBatch = Array.isArray(data);
    const count = isBatch ? data.length : 1;

    secureLog("info", "QuickNode Webhook recebido", {
      type: isBatch ? "batch" : "single",
      count,
    });

    Sentry.addBreadcrumb({
      category: "webhook.quicknode",
      message: "Evento QuickNode recebido",
      level: "info",
      data: {
        type: isBatch ? "batch" : "single",
        count,
      },
    });

    // TODO: Implementar logica de processamento conforme o evento
    // Ex: Confirmar deposito de USDT, atualizar status de ponte, etc.

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    secureLog("error", "QuickNode Webhook: Erro critico", {
      error: error.message,
    });
    Sentry.withScope((scope) => {
      scope.setLevel("fatal");
      scope.setTag("source", "quicknode_webhook");
      scope.setTag("failure", "unhandled_webhook_error");
      Sentry.captureException(error);
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
};

/**
 * Suporte a preflight CORS
 */
export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, x-qn-signature, x-quicknode-signature",
    },
  });
};
