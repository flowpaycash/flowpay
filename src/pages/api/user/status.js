import { applyRateLimit } from "../../../services/api/rate-limiter.mjs";
import { getCorsHeaders, secureLog } from "../../../services/api/config.mjs";
import { getUserByEmail } from "../../../services/database/sqlite.mjs";
import { verifySessionToken } from "../../../services/auth/session.mjs";

function extractSessionToken(request) {
  const cookies = request.headers.get("cookie") || "";
  const sessionCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith("flowpay_session="));
  if (sessionCookie) {
    return sessionCookie.split("=")[1];
  }
  return request.headers.get("x-user-token");
}

// GET /api/user/status - check status for the authenticated user only
export const GET = async ({ request, clientAddress }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  const rateLimitResult = await applyRateLimit("user-status")({
    headers: Object.fromEntries(request.headers),
    context: { clientIP: clientAddress },
  });

  if (rateLimitResult && rateLimitResult.statusCode === 429) {
    return new Response(rateLimitResult.body, { status: 429, headers });
  }

  try {
    const token = extractSessionToken(request);
    const payload = verifySessionToken(token);

    if (
      !payload ||
      typeof payload.email !== "string" ||
      !payload.email.includes("@")
    ) {
      secureLog("warn", "Acesso negado em /api/user/status sem sessão válida");
      return new Response(
        JSON.stringify({ error: "Autenticação necessária." }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const user = getUserByEmail(payload.email.toLowerCase().trim());

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado." }),
        {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        found: true,
        status: user.status,
        name: user.name,
        email: user.email,
      }),
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno." }), {
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
