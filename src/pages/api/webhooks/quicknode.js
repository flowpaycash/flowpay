import * as Sentry from "@sentry/astro";
import { secureLog } from "../../../services/api/config.mjs";
import crypto from "crypto";

/**
 * POST /api/webhooks/quicknode
 * Recebe eventos de transferência ERC-20 (USDT/USDC) do QuickNode.
 * Confirma a chegada de cripto, atualiza a ordem no banco e notifica o Nexus Bridge.
 */
export const POST = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-qn-signature") ||
      request.headers.get("x-quicknode-signature");
    const secret = process.env.QUICKNODE_WEBHOOK_SECRET;

    // Validação HMAC se o secret estiver configurado
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
            "QuickNode: assinatura HMAC invalida — possivel tentativa de forja",
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
    const events = isBatch ? data : [data];

    secureLog("info", "QuickNode Webhook recebido", {
      type: isBatch ? "batch" : "single",
      count: events.length,
    });

    Sentry.addBreadcrumb({
      category: "webhook.quicknode",
      message: "Evento QuickNode recebido",
      level: "info",
      data: { type: isBatch ? "batch" : "single", count: events.length },
    });

    // Processa todos os eventos em paralelo
    const results = await Promise.allSettled(
      events.map(evt => processQuickNodeEvent(evt))
    );

    const processed = results.filter(r => r.status === "fulfilled" && r.value?.processed).length;
    const skipped = results.filter(r => r.status === "fulfilled" && !r.value?.processed).length;
    const failed = results.filter(r => r.status === "rejected").length;

    secureLog("info", "QuickNode Webhook finalizado", { processed, skipped, failed });

    return new Response(
      JSON.stringify({ success: true, processed, skipped, failed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    secureLog("error", "QuickNode Webhook: Erro critico", { error: error.message });
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

// ── Lógica de processamento de evento individual ───────────────────────────

/**
 * Tokens ERC-20 aceitos (lowercase).
 * Expandir conforme novas redes forem integradas.
 */
const ACCEPTED_TOKENS = new Set([
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT Polygon
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC Polygon (antigo)
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // USDC Polygon (novo)
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT Ethereum
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC Ethereum
]);

// ERC-20 Transfer event topic
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function processQuickNodeEvent(evt) {
  // ── Extrai os campos da transferência ──────────────────────────────────

  let toAddress = null;
  let tokenAddr = null;
  let rawAmount = null;
  let txHash = null;
  let network = evt.network || "polygon";

  // Formato 1: logs array (stream ERC-20 do QuickNode)
  if (Array.isArray(evt.logs) && evt.logs.length > 0) {
    const transferLog = evt.logs.find(
      (l) => l.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC
    );
    if (transferLog) {
      toAddress = "0x" + (transferLog.topics[2] || "").slice(-40).toLowerCase();
      tokenAddr = transferLog.address?.toLowerCase();
      rawAmount = BigInt(transferLog.data || "0x0");
      txHash = evt.transactionHash || evt.hash;
    }
  }

  // Formato 2: objeto flat (alert / address monitor do QuickNode)
  if (!toAddress && evt.to && evt.contractAddress) {
    toAddress = evt.to.toLowerCase();
    tokenAddr = evt.contractAddress.toLowerCase();
    rawAmount = BigInt(evt.value || evt.amount || "0");
    txHash = evt.transactionHash || evt.hash;
  }

  // Dados insuficientes
  if (!toAddress || !tokenAddr || rawAmount === null || rawAmount === 0n) {
    return { processed: false, reason: "Dados insuficientes" };
  }

  // Token não aceito
  if (!ACCEPTED_TOKENS.has(tokenAddr)) {
    return { processed: false, reason: `Token nao aceito: ${tokenAddr}` };
  }

  // Converte para unidade legível (USDT/USDC = 6 decimais)
  const amountFormatted = Number(rawAmount) / 1e6;

  secureLog("info", "QuickNode: Transferencia ERC-20 detectada", {
    to: toAddress,
    token: tokenAddr,
    amount: amountFormatted,
    txHash,
  });

  // ── Localiza a ordem pendente correspondente ────────────────────────────

  const { getDatabase } = await import("../../../services/database/sqlite.mjs");
  const db = getDatabase();

  // Tolerância de ±2% no valor para cobrir variações de câmbio leve
  const tol = amountFormatted * 0.02;

  const order = db.prepare(`
    SELECT * FROM orders
    WHERE LOWER(customer_wallet) = ?
      AND bridge_status IN ('PENDING')
      AND status IN ('PIX_PAID', 'PENDING_REVIEW', 'APPROVED')
      AND amount_usdt BETWEEN ? AND ?
    ORDER BY created_at ASC
    LIMIT 1
  `).get(toAddress, amountFormatted - tol, amountFormatted + tol);

  if (!order) {
    secureLog("warn", "QuickNode: Nenhuma ordem pendente para wallet/valor", {
      wallet: toAddress,
      amount: amountFormatted,
    });
    Sentry.addBreadcrumb({
      category: "webhook.quicknode",
      message: "Transferencia recebida sem ordem pendente correspondente",
      level: "warning",
      data: { to: toAddress, amount: amountFormatted, token: tokenAddr },
    });
    return { processed: false, reason: "Ordem nao encontrada" };
  }

  // Idempotência
  if (order.bridge_status === "SENT") {
    secureLog("info", "QuickNode: Ordem ja processada (idempotencia)", {
      chargeId: order.charge_id,
    });
    return { processed: false, reason: "Ja processado" };
  }

  // ── Atualiza o banco: SETTLED ───────────────────────────────────────────

  db.prepare(`
    UPDATE orders
    SET bridge_status   = 'SENT',
        bridge_attempts = bridge_attempts + 1,
        status          = 'SETTLED',
        settled_at      = CURRENT_TIMESTAMP,
        tx_hash         = ?,
        network         = ?,
        updated_at      = CURRENT_TIMESTAMP
    WHERE charge_id = ?
  `).run(txHash || "quicknode-confirmed", network, order.charge_id);

  secureLog("info", "QuickNode: Ordem SETTLED com sucesso", {
    chargeId: order.charge_id,
    txHash,
    amount: amountFormatted,
    network,
  });

  Sentry.addBreadcrumb({
    category: "webhook.quicknode",
    message: "Pedido liquidado via QuickNode",
    level: "info",
    data: { chargeId: order.charge_id, txHash, amount: amountFormatted },
  });

  // ── Notifica Nexus Bridge (non-blocking) ───────────────────────────────

  const { notifyNexus } = await import("../../../services/api/nexus-bridge.mjs");

  notifyNexus("CRYPTO_SETTLED", {
    transactionId: order.charge_id,
    orderId: order.charge_id,
    amount: amountFormatted,
    currency: tokenAddr,
    txHash,
    metadata: { source: "quicknode", network, token: tokenAddr },
  }).catch((err) => {
    secureLog("error", "QuickNode: Falha ao notificar Nexus", {
      error: err.message,
    });
    Sentry.captureException(err);
  });

  return { processed: true, chargeId: order.charge_id, txHash };
}

/**
 * Preflight CORS
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
