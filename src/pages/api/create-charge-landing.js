// FLOWPay - Create Charge Landing (Fiat-Only)
// Endpoint para checkout via Landing Page: CPF + Email -> Wallet Abstraction -> PIX
// Aceita dados Web2 (CPF/Email) e gera smart wallet automaticamente via Account Abstraction

import * as Sentry from "@sentry/astro";
import { applyRateLimit } from "../../services/api/rate-limiter.mjs";
import {
  getCorsHeaders,
  secureLog,
  logPixTransaction,
  logAPIError,
} from "../../services/api/config.mjs";
import {
  handleExternalAPIError,
  FlowPayError,
  ERROR_TYPES,
  captureToSentry,
} from "../../services/api/error-handler.mjs";
import {
  validateData,
  sanitizeData,
} from "../../services/api/validation-middleware.mjs";
import { createOrder } from "../../services/database/sqlite.mjs";
import { ensurePixReconciliationSchedulerStarted } from "../../services/api/pix-reconciliation-scheduler.mjs";

ensurePixReconciliationSchedulerStarted();

/**
 * Gera wallet deterministica a partir do CPF usando Account Abstraction.
 * Se o SmartWalletService nao estiver configurado, usa um endereco derivado do CPF como fallback.
 */
async function resolveWalletFromCPF(cpf) {
  try {
    const { getSmartWalletService } =
      await import("../../../services/wallet/smart-account.js");
    const smartWallet = getSmartWalletService();

    if (smartWallet.isConfigured()) {
      const result = await smartWallet.createWallet(cpf);
      secureLog("info", "Landing: Smart Account criada via AA", {
        cpf_hash: cpf.substring(0, 3) + "***",
        wallet: result.address
          ? `${result.address.slice(0, 10)}...`
          : "unknown",
      });
      return result.address;
    }
  } catch (err) {
    secureLog(
      "warn",
      "Landing: SmartWalletService indisponivel, usando fallback",
      {
        error: err.message,
      }
    );
    Sentry.withScope((scope) => {
      scope.setLevel("warning");
      scope.setTag("source", "create_charge_landing");
      scope.setTag("failure", "smart_wallet_service_unavailable");
      Sentry.captureException(err);
    });
  }

  // Fallback: gerar endereco deterministico a partir do CPF
  const { createHash } = await import("crypto");
  const hash = createHash("sha256")
    .update(`flowpay-landing-${cpf}`)
    .digest("hex");
  const fallbackAddress = "0x" + hash.substring(0, 40);
  secureLog("info", "Landing: Usando wallet fallback (hash CPF)", {
    cpf_hash: cpf.substring(0, 3) + "***",
  });
  return fallbackAddress;
}

export const POST = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    // Rate Limiting
    const rateLimitResult = await applyRateLimit("create-pix-charge")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, {
        status: 429,
        headers: { ...headers, ...rateLimitResult.headers },
      });
    }

    const rawBody = await request.json();
    validateData(rawBody, "createLandingCharge");

    const sanitizedData = sanitizeData(rawBody);
    const {
      amount_brl,
      product_ref,
      customer_cpf,
      customer_email,
      customer_name,
    } = sanitizedData;

    const validatedValue = parseFloat(amount_brl);
    const cpfClean = customer_cpf.replace(/\D/g, "");

    Sentry.setContext("landing_charge", {
      product_ref,
      amount: validatedValue,
      cpf_hash: cpfClean.substring(0, 3) + "***",
    });

    Sentry.addBreadcrumb({
      category: "landing",
      message: "Iniciando criacao de cobranca via landing page",
      level: "info",
      data: { product_ref, amount: validatedValue },
    });

    // Resolve wallet via Account Abstraction
    const wallet = await resolveWalletFromCPF(cpfClean);

    Sentry.addBreadcrumb({
      category: "landing",
      message: "Wallet resolvida",
      level: "info",
      data: { wallet: wallet ? `${wallet.slice(0, 10)}...` : "unknown" },
    });

    const id_transacao = `landing_${Date.now()}_${cpfClean.substring(0, 4)}`;

    const WOOVI_API_KEY = process.env.WOOVI_API_KEY;
    const WOOVI_API_URL = process.env.WOOVI_API_URL || "https://api.woovi.com";

    if (!WOOVI_API_KEY) {
      throw new Error("Configuracao da API Woovi nao encontrada");
    }

    const cleanApiKey = WOOVI_API_KEY.trim();

    const pixData = {
      correlationID: id_transacao,
      value: Math.round(validatedValue * 100),
      expiresIn: 3600,
      customer: {
        name: customer_name || undefined,
        email: customer_email,
        taxID: cpfClean,
      },
      additionalInfo: [
        { key: "wallet", value: wallet },
        { key: "product_ref", value: product_ref },
        { key: "source", value: "landing-page" },
      ],
    };

    logPixTransaction("info", "Landing API: Criando cobranca PIX", {
      id: id_transacao,
      amount: validatedValue,
      product: product_ref,
      cpf_hash: cpfClean.substring(0, 3) + "***",
    });

    Sentry.addBreadcrumb({
      category: "landing",
      message: "Chamando API Woovi",
      level: "info",
      data: { endpoint: "/api/v1/charge", correlationID: id_transacao },
    });

    const wooviResponse = await fetch(`${WOOVI_API_URL}/api/v1/charge`, {
      method: "POST",
      headers: {
        Authorization: cleanApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pixData),
      signal: AbortSignal.timeout(15000),
    });

    if (!wooviResponse.ok) {
      const errorText = await wooviResponse.text();
      let errorResponse;
      try {
        errorResponse = JSON.parse(errorText);
      } catch (e) {
        errorResponse = errorText;
      }

      logAPIError("error", "Erro na API Woovi (Landing)", {
        service: "Woovi",
        statusCode: wooviResponse.status,
        response: errorText,
      });

      const externalError = handleExternalAPIError(
        "Woovi",
        wooviResponse.status,
        errorResponse,
        null
      );
      captureToSentry(externalError, {
        id_transacao,
        wallet,
        service: "Woovi",
        source: "landing",
      });
      throw externalError;
    }

    const wooviData = await wooviResponse.json();

    Sentry.addBreadcrumb({
      category: "landing",
      message: "Cobranca PIX criada com sucesso na Woovi",
      level: "info",
      data: {
        correlationID:
          wooviData.correlationID || wooviData.charge?.correlationID,
        status: wooviData.status || wooviData.charge?.status,
      },
    });

    // Persistencia SQLite
    try {
      createOrder({
        charge_id: id_transacao,
        amount_brl: validatedValue,
        product_ref: product_ref,
        customer_ref: `cpf_${cpfClean.substring(0, 6)}`,
        customer_wallet: wallet,
        customer_cpf: cpfClean,
        customer_email: customer_email,
        customer_name: customer_name || null,
        status: "CREATED",
        pix_qr: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
        pix_copy_paste: wooviData.brCode || wooviData.charge?.brCode,
        checkout_url:
          wooviData.paymentLinkUrl || wooviData.charge?.paymentLinkUrl || null,
        metadata: JSON.stringify({
          woovi_id: wooviData.correlationID,
          source: "landing-page",
          wallet_type: "account-abstraction",
        }),
      });
      secureLog("info", "Landing: Pedido salvo no SQLite", { id_transacao });

      Sentry.addBreadcrumb({
        category: "landing",
        message: "Pedido persistido no SQLite com sucesso",
        level: "info",
        data: { id_transacao },
      });
    } catch (dbError) {
      secureLog("error", "Landing: Falha no SQLite", {
        error: dbError.message,
        id_transacao,
      });
      // Charge criada na Woovi mas nao persistida — bug critico
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        scope.setTag("source", "create_charge_landing");
        scope.setTag("failure", "db_persist_after_woovi_success");
        scope.setContext("charge", {
          id_transacao,
          wallet: wallet ? `${wallet.substring(0, 10)}...` : undefined,
          product_ref,
        });
        Sentry.captureException(dbError);
      });
    }

    const responseData = {
      success: true,
      charge: {
        charge_id: id_transacao,
        qr_code: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
        pix_copy_paste: wooviData.brCode || wooviData.charge?.brCode,
        value: validatedValue,
        expires_at: wooviData.expiresAt || wooviData.charge?.expiresDate,
        status: wooviData.status || wooviData.charge?.status,
      },
      wallet,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    secureLog("error", "Landing API: Erro no create-charge-landing", {
      error: error.message,
    });

    if (!(error instanceof FlowPayError)) {
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        scope.setTag("source", "create_charge_landing");
        Sentry.captureException(error);
      });
    }

    const statusCode = error.statusCode || 500;
    const errorBody = {
      success: false,
      error: error.message || "Erro interno no servidor",
      type: error.type || "INTERNAL_ERROR",
    };

    return new Response(JSON.stringify(errorBody), {
      status: statusCode,
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
