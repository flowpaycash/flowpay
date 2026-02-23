import * as Sentry from "@sentry/astro";
import crypto from "crypto";
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
  saveAuthToken,
} from "../../../services/database/sqlite.mjs";
import { sendEmail } from "../../../services/api/email-service.mjs";
import { aprovacaoTemplate } from "../../../services/api/email/templates/aprovacao.mjs";
import { rejeicaoTemplate } from "../../../services/api/email/templates/rejeicao.mjs";
import { adminAprovacaoTemplate, adminRejeicaoTemplate } from "../../../services/api/email/templates/admin-notificacao.mjs";

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

      const token = crypto.randomBytes(32).toString("hex");
      const expiresHours = 48;
      const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
      saveAuthToken(user.email, token, expiresAt);
      const baseUrl = process.env.URL || "https://flowpay.cash";
      const magicLink = `${baseUrl}/auth/verify?token=${token}`;

      // Email para o usuário aprovado (com magic link)
      const approvalEmailResult = await sendEmail({
        to: user.email,
        subject: "Sua conta FlowPay foi aprovada! Acesse com seu link mágico",
        html: aprovacaoTemplate({
          name: user.name,
          loginUrl: magicLink,
          expiresHours,
        }),
      });

      if (!approvalEmailResult.success) {
        secureLog("error", "Erro ao enviar email de aprovacao", {
          userId,
          error: approvalEmailResult.error || "unknown_email_error",
          attempts: approvalEmailResult.attempts || [],
        });
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setTag("source", "admin_users_email");
          scope.setTag("email.type", "approval");
          scope.setContext("user", { userId });
          Sentry.captureMessage(
          "Falha no envio do e-mail de aprovação com magic link",
            "warning"
          );
        });
      }

      // Confirmação para o admin
      const adminEmailApprove = process.env.ADMIN_NOTIFY_EMAIL;
      if (adminEmailApprove) {
        const approvedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        void sendEmail({
          to: adminEmailApprove,
          subject: `[FlowPay] ✅ Aprovado: ${user.name}`,
          html: adminAprovacaoTemplate({ name: user.name, email: user.email, approvedAt }),
        }).then((result) => {
          if (!result.success) {
            secureLog("warn", "Falha ao enviar e-mail de confirmacao para admin (approve)", {
              userId,
              error: result.error || "unknown_email_error",
            });
          }
        }).catch((err) => {
          secureLog("error", "Erro inesperado no envio de e-mail para admin (approve)", {
            userId,
            error: err.message,
          });
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: approvalEmailResult.success
            ? "Usuario aprovado."
            : "Usuario aprovado, mas houve falha no envio do e-mail.",
          emailSent: Boolean(approvalEmailResult.success),
          magicLink: approvalEmailResult.success ? null : magicLink,
        }),
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

      // Email para o usuário rejeitado
      void sendEmail({
        to: user.email,
        subject: "Atualização sobre seu cadastro FlowPay",
        html: rejeicaoTemplate({ name: user.name, reason: rejectReason }),
      }).then((result) => {
        if (!result.success) {
          secureLog("error", "Erro ao enviar email de rejeicao", {
            userId,
            error: result.error || "unknown_email_error",
            attempts: result.attempts || [],
          });
          Sentry.withScope((scope) => {
            scope.setLevel("warning");
            scope.setTag("source", "admin_users_email");
            scope.setTag("email.type", "rejection");
            scope.setContext("user", { userId });
            Sentry.captureMessage(
              "Falha no envio do e-mail de rejeição",
              "warning"
            );
          });
        }
      }).catch((err) => {
        secureLog("error", "Erro inesperado no envio de email de rejeicao", {
          userId,
          error: err.message,
        });
      });

      // Confirmação para o admin
      const adminEmailReject = process.env.ADMIN_NOTIFY_EMAIL;
      if (adminEmailReject) {
        const rejectedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        void sendEmail({
          to: adminEmailReject,
          subject: `[FlowPay] ❌ Rejeitado: ${user.name}`,
          html: adminRejeicaoTemplate({ name: user.name, email: user.email, reason: rejectReason, rejectedAt }),
        }).then((result) => {
          if (!result.success) {
            secureLog("warn", "Falha ao enviar e-mail de confirmacao para admin (reject)", {
              userId,
              error: result.error || "unknown_email_error",
            });
          }
        }).catch((err) => {
          secureLog("error", "Erro inesperado no envio de e-mail para admin (reject)", {
            userId,
            error: err.message,
          });
        });
      }

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
