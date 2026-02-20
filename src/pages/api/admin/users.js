import * as Sentry from "@sentry/astro";
import { getCorsHeaders, secureLog } from "../../../services/api/config.mjs";
import {
  requireAdminSession,
  withAdminNoStoreHeaders,
} from "../../../services/api/admin-auth.mjs";
import {
  listUsers,
  approveUser,
  rejectUser,
  getUserById,
} from "../../../services/database/sqlite.mjs";
import { sendEmail } from "../../../services/api/email-service.mjs";

// GET /api/admin/users - list all users
export const GET = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({
      headers: Object.fromEntries(request.headers),
    }),
    "Content-Type": "application/json",
  });

  if (!requireAdminSession(cookies)) {
    Sentry.addBreadcrumb({
      category: "admin.users",
      message: "Tentativa de acesso nao autorizado a listagem de usuarios",
      level: "warning",
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  Sentry.addBreadcrumb({
    category: "admin.users",
    message: "Listagem de usuarios iniciada",
    level: "info",
  });

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || null;
    const users = listUsers(status);

    Sentry.addBreadcrumb({
      category: "admin.users",
      message: "Usuarios listados com sucesso",
      level: "info",
      data: { count: users.length, filter_status: status },
    });

    return new Response(JSON.stringify({ success: true, users }), {
      status: 200,
      headers,
    });
  } catch (error) {
    secureLog("error", "Admin users list error", { error: error.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_users_list");
      Sentry.captureException(error);
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers,
    });
  }
};

// POST /api/admin/users - approve or reject user
export const POST = async ({ request, cookies }) => {
  const headers = withAdminNoStoreHeaders({
    ...getCorsHeaders({
      headers: Object.fromEntries(request.headers),
    }),
    "Content-Type": "application/json",
  });

  if (!requireAdminSession(cookies)) {
    Sentry.addBreadcrumb({
      category: "admin.users",
      message: "Tentativa de acesso nao autorizado para acao em usuario",
      level: "warning",
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  try {
    const body = await request.json();
    const { action, userId, reason } = body;

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: "userId e action sao obrigatorios." }),
        { status: 400, headers }
      );
    }

    Sentry.addBreadcrumb({
      category: "admin.users",
      message: `Acao admin em usuario: ${action}`,
      level: "info",
      data: { userId, action },
    });

    const user = getUserById(userId);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuario nao encontrado." }),
        { status: 404, headers }
      );
    }

    if (action === "approve") {
      approveUser(userId, "admin");
      secureLog("info", "Usuario aprovado", { userId, email: user.email });

      Sentry.addBreadcrumb({
        category: "admin.users",
        message: "Usuario aprovado pelo admin",
        level: "info",
        data: { userId },
      });

      sendEmail({
        to: user.email,
        subject: "Sua conta FlowPay foi aprovada!",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
            <img src="https://flowpay.cash/img/flowpay-logo.png" alt="FlowPay" style="height:48px;margin-bottom:32px" />
            <h1 style="font-size:1.5rem;margin-bottom:8px">Conta aprovada, ${user.name}!</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:32px">
              Sua conta FlowPay foi aprovada. Acesse o dashboard para comecar a criar seus links de pagamento.
            </p>
            <a href="https://flowpay.cash/dashboard" style="display:inline-block;background:linear-gradient(135deg,#ff007a,#ff7a00);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:1rem">
              Acessar Dashboard
            </a>
          </div>
        `,
      }).catch((err) => {
        secureLog("error", "Erro ao enviar email de aprovacao", {
          userId,
          error: err.message,
        });
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("source", "admin_users_email");
          scope.setTag("email.type", "approval");
          scope.setContext("user", { userId });
          Sentry.captureException(err);
        });
      });

      return new Response(
        JSON.stringify({ success: true, message: "Usuario aprovado." }),
        {
          status: 200,
          headers,
        }
      );
    }

    if (action === "reject") {
      const rejectReason = reason || "Reprovado pelo administrador";
      rejectUser(userId, rejectReason, "admin");
      secureLog("info", "Usuario rejeitado", {
        userId,
        email: user.email,
        reason: rejectReason,
      });

      Sentry.addBreadcrumb({
        category: "admin.users",
        message: "Usuario rejeitado pelo admin",
        level: "info",
        data: { userId, reason: rejectReason },
      });

      sendEmail({
        to: user.email,
        subject: "Atualizacao sobre seu cadastro FlowPay",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
            <img src="https://flowpay.cash/img/flowpay-logo.png" alt="FlowPay" style="height:48px;margin-bottom:32px" />
            <h1 style="font-size:1.5rem;margin-bottom:8px">Ola, ${user.name}</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:16px">
              Infelizmente nao foi possivel aprovar seu cadastro no FlowPay no momento.
            </p>
            ${rejectReason !== "Reprovado pelo administrador" ? `<p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin-bottom:24px">Motivo: ${rejectReason}</p>` : ""}
            <p style="color:rgba(255,255,255,0.4);font-size:0.85rem">Em caso de duvidas, entre em contato com nosso suporte.</p>
          </div>
        `,
      }).catch((err) => {
        secureLog("error", "Erro ao enviar email de rejeicao", {
          userId,
          error: err.message,
        });
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("source", "admin_users_email");
          scope.setTag("email.type", "rejection");
          scope.setContext("user", { userId });
          Sentry.captureException(err);
        });
      });

      return new Response(
        JSON.stringify({ success: true, message: "Usuario rejeitado." }),
        {
          status: 200,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acao invalida. Use approve ou reject." }),
      { status: 400, headers }
    );
  } catch (error) {
    secureLog("error", "Admin user action error", { error: error.message });
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("source", "admin_users_action");
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
