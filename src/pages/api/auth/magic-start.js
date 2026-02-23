import crypto from "crypto";
import { getUserByEmail, saveAuthToken } from "../../../services/database/sqlite.mjs";
import { applyRateLimit } from "../../../services/api/rate-limiter.mjs";
import {
  config,
  secureLog,
  getCorsHeaders,
} from "../../../services/api/config.mjs";
import { sendEmail } from "../../../services/api/email-service.mjs";
import { magicLinkTemplate } from "../../../services/api/email/templates/magic-link.mjs";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  try {
    // Rate limiting to prevent email enumeration/spam
    const rateLimitResult = await applyRateLimit("auth-magic-start")({
      headers: Object.fromEntries(request.headers),
      context: { clientIP: clientAddress },
    });

    if (rateLimitResult && rateLimitResult.statusCode === 429) {
      return new Response(rateLimitResult.body, { status: 429, headers });
    }

    const { email } = await request.json();

    if (
      !email ||
      typeof email !== "string" ||
      email.length > 254 ||
      !EMAIL_REGEX.test(email)
    ) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers,
      });
    }

    // Generate secure random token
    const normalizedEmail = email.toLowerCase().trim();
    const user = getUserByEmail(normalizedEmail);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "E-mail não cadastrado. Crie sua conta primeiro." }),
        {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    if (user.status === "PENDING_APPROVAL") {
      return new Response(
        JSON.stringify({ error: "Seu cadastro ainda está em análise." }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    if (user.status === "REJECTED") {
      return new Response(
        JSON.stringify({
          error:
            "Seu cadastro foi reprovado. Entre em contato com o suporte para revisão.",
        }),
        {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + config.auth.tokenExpiration);

    // Save to DB
    saveAuthToken(normalizedEmail, token, expiresAt);

    const domain = process.env.URL || "https://flowpay.cash";
    const magicLink = `${domain}/auth/verify?token=${token}`;

    // Send magic link via Resend
    const emailResult = await sendEmail({
      to: email,
      subject: "Seu link de acesso ao FlowPay",
      html: magicLinkTemplate({ magicLink }),
    });

    if (emailResult.success) {
      secureLog("info", "Magic link sent via Resend", {
        email: normalizedEmail,
        id: emailResult.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          sent: true,
          message: "Link mágico enviado para seu e-mail.",
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    secureLog("error", "Failed to send magic link via Resend", {
      email: normalizedEmail,
      error: emailResult.error,
    });

    return new Response(
      JSON.stringify({
        success: false,
        sent: false,
        message:
          "Serviço de e-mail indisponível. Tente novamente em instantes.",
      }),
      {
        status: 503,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    secureLog("error", "Magic start error", { error: error.message });
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
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
