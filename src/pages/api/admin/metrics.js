import * as Sentry from "@sentry/astro";
import { getDatabase } from "../../../services/database/sqlite.mjs";
import { getCorsHeaders } from "../../../services/api/config.mjs";

export const GET = async ({ request }) => {
  const headers = getCorsHeaders({
    headers: Object.fromEntries(request.headers),
  });

  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
    Sentry.addBreadcrumb({
      category: "admin.metrics",
      message: "Tentativa de acesso nao autorizado",
      level: "warning",
    });
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Admin authentication required",
      }),
      {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  Sentry.addBreadcrumb({
    category: "admin.metrics",
    message: "Consulta de metricas iniciada",
    level: "info",
  });

  try {
    const db = getDatabase();

    const users = db
      .prepare("SELECT COUNT(*) as total FROM wallet_sessions")
      .get();

    const guests = db
      .prepare(
        `SELECT COUNT(*) as total FROM audit_log
        WHERE event_type = 'ACCESS' AND actor = 'GUEST'
        AND created_at > datetime('now', '-1 day')`
      )
      .get();

    const payments = db
      .prepare(
        `SELECT COUNT(*) as total, SUM(amount_brl) as volume FROM orders
        WHERE status IN ('PIX_PAID', 'PENDING_REVIEW', 'APPROVED', 'SETTLED')
        AND created_at > datetime('now', '-1 day')`
      )
      .get();

    const metrics = {
      total_wallets: users.total,
      guest_access_24h: guests.total,
      payments_24h: payments.total,
      volume_24h: payments.volume || 0,
    };

    Sentry.addBreadcrumb({
      category: "admin.metrics",
      message: "Metricas coletadas com sucesso",
      level: "info",
      data: metrics,
    });

    return new Response(JSON.stringify({ success: true, metrics }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_metrics");
      Sentry.captureException(error);
    });
    return new Response(
      JSON.stringify({ error: "Internal error", detail: error.message }),
      { status: 500, headers }
    );
  }
};
