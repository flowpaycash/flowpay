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

export const POST = async ({ request, clientAddress }) => {
  // 1. Setup & CORS
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    // 🚦 Rate Limiting (Aproximado para Astro)
    // No Astro, podemos usar o clientAddress
    const rateLimitResult = applyRateLimit("create-pix-charge")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, {
        status: 429,
        headers: { ...headers, ...rateLimitResult.headers },
      });
    }

    // 2. Parse & Validate
    const rawBody = await request.json();
    validateData(rawBody, "createPixCharge");

    const sanitizedData = sanitizeData(rawBody);
    const {
      wallet,
      valor,
      moeda,
      id_transacao,
      product_id,
      customer_name,
      customer_email,
    } = sanitizedData;

    // Contexto da transacao para o Sentry — facilita rastrear erros por charge
    Sentry.setContext("pix_charge", {
      id_transacao,
      amount: parseFloat(valor),
      currency: moeda,
      product_id: product_id || "manual",
      wallet: wallet ? `${wallet.substring(0, 6)}...` : undefined,
    });
    Sentry.addBreadcrumb({
      category: "pix",
      message: "Iniciando criacao de cobranca PIX",
      level: "info",
      data: { id_transacao, moeda },
    });

    const validatedValue = parseFloat(valor);

    // 3. Woovi API Implementation
    const WOOVI_API_KEY = process.env.WOOVI_API_KEY;
    const WOOVI_API_URL = process.env.WOOVI_API_URL || "https://api.woovi.com";

    if (!WOOVI_API_KEY) {
      throw new Error("Configuração da API Woovi não encontrada");
    }

    const cleanApiKey = WOOVI_API_KEY ? WOOVI_API_KEY.trim() : "";

    const pixData = {
      correlationID: id_transacao,
      value: Math.round(validatedValue * 100),
      expiresIn: 3600,
      additionalInfo: [
        { key: "wallet", value: wallet },
        { key: "moeda", value: moeda },
        { key: "product_id", value: product_id || "manual" },
      ],
    };

    Sentry.addBreadcrumb({
      category: "pix",
      message: "Chamando API Woovi",
      level: "info",
      data: { endpoint: "/api/v1/charge", correlationID: id_transacao },
    });

    logPixTransaction("info", "Astro API: Criando cobrança PIX", {
      id: id_transacao,
      amount: validatedValue,
      currency: moeda,
      wallet: wallet,
    });

    const wooviResponse = await fetch(`${WOOVI_API_URL}/api/v1/charge`, {
      method: "POST",
      headers: {
        Authorization: cleanApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pixData),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!wooviResponse.ok) {
      const errorText = await wooviResponse.text();
      let errorResponse;
      try {
        errorResponse = JSON.parse(errorText);
      } catch (e) {
        errorResponse = errorText;
      }

      logAPIError("error", "Erro na API Woovi (Astro)", {
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
      });
      throw externalError;
    }

    const wooviData = await wooviResponse.json();

    Sentry.addBreadcrumb({
      category: "pix",
      message: "Cobranca PIX criada com sucesso na Woovi",
      level: "info",
      data: {
        correlationID:
          wooviData.correlationID || wooviData.charge?.correlationID,
        status: wooviData.status || wooviData.charge?.status,
      },
    });

    // 🏛️ PERSISTÊNCIA SOBERANA (SQLite)
    try {
      createOrder({
        charge_id: id_transacao,
        amount_brl: validatedValue,
        product_ref: product_id || "manual",
        customer_ref: `user_${wallet.substring(2, 10)}`,
        customer_wallet: wallet,
        customer_name: customer_name || null,
        customer_email: customer_email || null,
        status: "CREATED",
        pix_qr: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
        pix_copy_paste: wooviData.brCode || wooviData.charge?.brCode,
        checkout_url:
          wooviData.paymentLinkUrl || wooviData.charge?.paymentLinkUrl || null,
        metadata: JSON.stringify({
          woovi_id: wooviData.correlationID,
          source: "flowpay-autonomous-node",
        }),
      });
      secureLog("info", "Pedido salvo no SQLite (Railway Bridge) ✅", {
        id_transacao,
      });
    } catch (dbError) {
      secureLog("error", "Falha no SQLite Bridge", {
        error: dbError.message,
        id_transacao,
      });
      // Falha no DB e um bug critico — charge foi criada na Woovi mas nao persistida
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        scope.setTag("failure", "db_persist_after_woovi_success");
        scope.setContext("charge", {
          id_transacao,
          wallet: wallet ? `${wallet.substring(0, 6)}...` : undefined,
        });
        Sentry.captureException(dbError);
      });
    }

    const responseData = {
      success: true,
      pix_data: {
        qr_code: wooviData.charge?.qrCodeImage || wooviData.qrCodeImage,
        br_code: wooviData.brCode || wooviData.charge?.brCode,
        correlation_id:
          wooviData.correlationID || wooviData.charge?.correlationID,
        value: validatedValue,
        expires_at: wooviData.expiresAt || wooviData.charge?.expiresDate,
        status: wooviData.status || wooviData.charge?.status,
      },
      wallet,
      moeda,
      id_transacao,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    secureLog("error", "Erro na API Astro create-charge", {
      error: error.message,
    });
    // Captura apenas se ainda nao foi enviado pelo captureToSentry acima
    if (!(error instanceof FlowPayError)) {
      Sentry.captureException(error);
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

// Handle OPTIONS for CORS
export const OPTIONS = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  return new Response(null, {
    status: 204,
    headers,
  });
};
