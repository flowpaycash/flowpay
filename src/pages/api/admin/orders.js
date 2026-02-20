import * as Sentry from "@sentry/astro";
import { getCorsHeaders, secureLog } from "../../../services/api/config.mjs";
import {
  requireAdminSession,
  withAdminNoStoreHeaders,
} from "../../../services/api/admin-auth.mjs";
import {
  listAllOrders,
  completeOrder,
  getOrder,
} from "../../../services/database/sqlite.mjs";

// GET /api/admin/orders - list all orders
export const GET = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({
      headers: Object.fromEntries(request.headers),
    }),
    "Content-Type": "application/json",
  });

  if (!requireAdminSession(cookies)) {
    Sentry.addBreadcrumb({
      category: "admin.orders",
      message: "Tentativa de acesso nao autorizado a listagem de pedidos",
      level: "warning",
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  Sentry.addBreadcrumb({
    category: "admin.orders",
    message: "Listagem de pedidos iniciada",
    level: "info",
  });

  try {
    const orders = listAllOrders(100);

    Sentry.addBreadcrumb({
      category: "admin.orders",
      message: "Pedidos listados com sucesso",
      level: "info",
      data: { count: orders.length },
    });

    return new Response(JSON.stringify({ success: true, orders }), {
      status: 200,
      headers,
    });
  } catch (error) {
    secureLog("error", "Admin orders list error", { error: error.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_orders_list");
      Sentry.captureException(error);
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers,
    });
  }
};

// POST /api/admin/orders - complete an order
export const POST = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({
      headers: Object.fromEntries(request.headers),
    }),
    "Content-Type": "application/json",
  });

  if (!requireAdminSession(cookies)) {
    Sentry.addBreadcrumb({
      category: "admin.orders",
      message: "Tentativa de acesso nao autorizado para completar pedido",
      level: "warning",
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  try {
    const body = await request.json();
    const { action, chargeId } = body;

    if (!chargeId || action !== "complete") {
      return new Response(
        JSON.stringify({
          error: "chargeId e action=complete sao obrigatorios.",
        }),
        { status: 400, headers }
      );
    }

    Sentry.addBreadcrumb({
      category: "admin.orders",
      message: "Tentativa de completar pedido",
      level: "info",
      data: { chargeId, action },
    });

    const order = getOrder(chargeId);

    if (!order) {
      return new Response(JSON.stringify({ error: "Pedido nao encontrado." }), {
        status: 404,
        headers,
      });
    }

    if (order.status === "COMPLETED") {
      return new Response(JSON.stringify({ error: "Pedido ja concluido." }), {
        status: 409,
        headers,
      });
    }

    if (!["PIX_PAID", "PENDING_REVIEW", "APPROVED"].includes(order.status)) {
      return new Response(
        JSON.stringify({
          error: `Nao e possivel concluir pedido com status ${order.status}.`,
        }),
        { status: 400, headers }
      );
    }

    completeOrder(chargeId, "admin");
    secureLog("info", "Pedido concluido pelo admin", { chargeId });

    Sentry.addBreadcrumb({
      category: "admin.orders",
      message: "Pedido concluido com sucesso pelo admin",
      level: "info",
      data: { chargeId, previous_status: order.status },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pedido concluido com sucesso.",
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    secureLog("error", "Admin order complete error", { error: error.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_orders_complete");
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
    getCorsHeaders({
      headers: Object.fromEntries(request.headers),
    })
  );
  return new Response(null, { status: 204, headers });
};
