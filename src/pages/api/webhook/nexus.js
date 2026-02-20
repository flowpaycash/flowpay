import crypto from "crypto";
import * as Sentry from "@sentry/astro";
import { applyRateLimit } from "../../../services/api/rate-limiter.mjs";
import { getCorsHeaders, secureLog } from "../../../services/api/config.mjs";
import {
  updateOrderStatus,
  getOrder,
} from "../../../services/database/sqlite.mjs";

/**
 * NEØ PROTOCOL — Nexus Webhook Receiver
 *
 * This endpoint receives events from Neo-Nexus (the central event bus).
 * It replaces direct calls from FlowPay to Neobot based on the architectural decision
 * to use Nexus as the central hub for all inter-service communication.
 *
 * Events handled:
 * - MINT_CONFIRMED: Token minting was successful
 * - MINT_FAILED: Token minting failed
 * - ACCESS_UNLOCKED: User access was granted
 *
 * Security:
 * - HMAC-SHA256 signature validation via X-Nexus-Signature header
 * - Rate limiting
 * - Timing-safe comparison to prevent timing attacks
 */

export const POST = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    // Rate limiting
    const rateLimitResult = applyRateLimit("nexus-webhook")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, { status: 429, headers });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-nexus-signature");
    const NEXUS_SECRET = process.env.NEXUS_SECRET;

    // Validate HMAC signature
    if (!signature || !NEXUS_SECRET) {
      secureLog("warn", "Nexus Webhook: Missing signature or secret");
      Sentry.captureMessage(
        "Nexus Webhook: requisicao sem assinatura ou secret ausente",
        "warning"
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing signature or configuration",
        }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // HMAC-SHA256 validation with timing-safe comparison
    const expectedSignature = crypto
      .createHmac("sha256", NEXUS_SECRET)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      secureLog("error", "Nexus Webhook: Invalid HMAC signature");
      // Assinatura invalida e um evento de seguranca critico — pode ser tentativa de forja
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        scope.setTag("security.violation", "invalid_hmac_signature");
        scope.setTag("source", "nexus_webhook");
        scope.setContext("request", {
          ip: clientAddress,
          signature_received: signature
            ? signature.substring(0, 10) + "..."
            : "none",
        });
        Sentry.captureMessage(
          "Nexus Webhook: assinatura HMAC invalida — possivel tentativa de forja",
          "error"
        );
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid signature",
        }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and process event
    const { event, payload, timestamp } = JSON.parse(rawBody);
    secureLog("info", `Nexus Webhook: Received ${event}`, { payload });

    // Breadcrumb para rastrear o fluxo de eventos no Sentry
    Sentry.addBreadcrumb({
      category: "webhook.nexus",
      message: `Evento recebido: ${event}`,
      level: "info",
      data: { event, timestamp },
    });

    // Route event to appropriate handler
    switch (event) {
      case "FACTORY:MINT_CONFIRMED":
        await handleMintConfirmed(payload);
        break;

      case "FACTORY:MINT_FAILED":
        await handleMintFailed(payload);
        break;

      case "NEOBOT:ACCESS_UNLOCKED":
        await handleAccessUnlocked(payload);
        break;

      default:
        secureLog("warn", `Nexus Webhook: Unknown event type: ${event}`);
        Sentry.captureMessage(
          `Nexus Webhook: evento desconhecido recebido: ${event}`,
          "warning"
        );
    }

    // Standard response as per ECOSYSTEM_COMPLIANCE_CHECKLIST
    return new Response(
      JSON.stringify({
        status: "received",
        event: event,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    secureLog("error", "Nexus Webhook: Critical error", {
      error: error.message,
    });
    Sentry.withScope((scope) => {
      scope.setLevel("fatal");
      scope.setTag("source", "nexus_webhook");
      scope.setTag("failure", "unhandled_webhook_error");
      Sentry.captureException(error);
    });
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal error",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Handle MINT_CONFIRMED event from Smart Factory via Nexus
 * Updates order status to reflect successful on-chain minting
 */
async function handleMintConfirmed(payload) {
  const { orderId, txHash, contractAddress, recipient, amount } = payload;

  secureLog("info", "✅ MINT_CONFIRMED: Token minted successfully", {
    orderId,
    txHash,
  });

  const order = getOrder(orderId);
  if (order) {
    updateOrderStatus(orderId, "SETTLED", {
      tx_hash: txHash,
      contract_address: contractAddress,
      settled_at: new Date().toISOString(),
      settlement_type: "ON_CHAIN_MINT",
    });
  } else {
    secureLog("warn", "MINT_CONFIRMED: Order not found", { orderId });
  }
}

/**
 * Handle MINT_FAILED event from Smart Factory via Nexus
 * Updates order status to reflect minting failure
 */
async function handleMintFailed(payload) {
  const { orderId, error: mintError, contractAddress } = payload;

  secureLog("error", "❌ MINT_FAILED: Token minting failed", {
    orderId,
    error: mintError,
  });

  // MINT_FAILED e um evento de negocio critico — token nao foi mintado apos pagamento confirmado
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("event", "FACTORY:MINT_FAILED");
    scope.setTag("failure", "mint_failed");
    scope.setContext("mint", {
      orderId,
      contractAddress,
      error: mintError,
    });
    Sentry.captureMessage(
      `MINT_FAILED: falha ao mintar token para pedido ${orderId}`,
      "error"
    );
  });

  const order = getOrder(orderId);
  if (order) {
    updateOrderStatus(orderId, "SETTLEMENT_FAILED", {
      settlement_error: mintError,
      contract_address: contractAddress,
      failed_at: new Date().toISOString(),
    });
  }
}

/**
 * Handle ACCESS_UNLOCKED event from Neobot via Nexus
 * Confirms that user access was granted after payment
 */
async function handleAccessUnlocked(payload) {
  const { orderId, userId, accessType } = payload;

  secureLog("info", "🔓 ACCESS_UNLOCKED: User access granted", {
    orderId,
    userId,
    accessType,
  });

  const order = getOrder(orderId);
  if (order) {
    updateOrderStatus(orderId, "COMPLETED", {
      access_granted: true,
      access_granted_at: new Date().toISOString(),
      bridge_status: "CONFIRMED_VIA_NEXUS",
    });
  }
}

export const OPTIONS = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  return new Response(null, { status: 204, headers });
};
