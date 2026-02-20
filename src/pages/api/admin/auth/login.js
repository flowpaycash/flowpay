import * as Sentry from "@sentry/astro";
import { getCorsHeaders, secureLog } from "../../../../services/api/config.mjs";
import { applyRateLimit } from "../../../../services/api/rate-limiter.mjs";
import {
  createAdminSessionToken,
  isAdminPasswordConfigured,
  logAdminConfigIssue,
  setAdminSessionCookie,
  verifyAdminPassword,
  withAdminNoStoreHeaders,
} from "../../../../services/api/admin-auth.mjs";

export const POST = async ({ request, cookies, clientAddress }) => {
  const baseHeaders = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });
  const headers = withAdminNoStoreHeaders({
    ...baseHeaders,
    "Content-Type": "application/json",
  });

  if (!isAdminPasswordConfigured()) {
    logAdminConfigIssue();
    return new Response(
      JSON.stringify({ error: "Admin auth unavailable. Contact support." }),
      { status: 500, headers }
    );
  }

  const rateLimitResult = await applyRateLimit("admin-login")({
    headers: Object.fromEntries(request.headers),
    context: { clientIP: clientAddress },
  });

  if (rateLimitResult && rateLimitResult.statusCode === 429) {
    return new Response(rateLimitResult.body, {
      status: 429,
      headers: { ...headers, ...rateLimitResult.headers },
    });
  }

  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return new Response(JSON.stringify({ error: "Senha obrigatória." }), {
        status: 400,
        headers,
      });
    }

    if (!verifyAdminPassword(password)) {
      Sentry.addBreadcrumb({
        category: "admin.auth",
        message: "Tentativa de login admin com credenciais inválidas",
        level: "warning",
      });

      secureLog("warn", "Admin login rejected", {
        ip: clientAddress || "unknown",
      });

      return new Response(
        JSON.stringify({ error: "Credenciais inválidas." }),
        {
          status: 401,
          headers,
        }
      );
    }

    const token = createAdminSessionToken({
      clientIp: clientAddress || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    if (!token) {
      secureLog("error", "Admin login failed: missing session signing secret");
      return new Response(JSON.stringify({ error: "Internal auth error." }), {
        status: 500,
        headers,
      });
    }

    setAdminSessionCookie(cookies, token);

    Sentry.addBreadcrumb({
      category: "admin.auth",
      message: "Admin login bem-sucedido",
      level: "info",
    });

    secureLog("info", "Admin login successful", {
      ip: clientAddress || "unknown",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    secureLog("error", "Admin login error", { error: error.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_auth_login");
      Sentry.captureException(error);
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers,
    });
  }
};

export const OPTIONS = async ({ request }) => {
  const headers = withAdminNoStoreHeaders(
    getCorsHeaders({ headers: Object.fromEntries(request.headers) })
  );
  return new Response(null, { status: 204, headers });
};
