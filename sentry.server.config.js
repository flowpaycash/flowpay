import { createRequire } from "node:module";
if (typeof require === "undefined") {
  globalThis.require = createRequire(import.meta.url);
}
import * as Sentry from "@sentry/astro";

const SENTRY_DSN =
  process.env.SENTRY_DSN ||
  "https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/000000";

Sentry.init({
  dsn: SENTRY_DSN,

  environment: process.env.NODE_ENV || "production",

  release:
    process.env.SENTRY_RELEASE ||
    `flowpay@${process.env.npm_package_version || "1.0.1"}`,

  // Tracing must be enabled for MCP monitoring to work
  tracesSampleRate: 1.0,

  // Enable PII for better debugging in MCP interactions
  sendDefaultPii: true,

  // Captura logs do console como logs estruturados no Sentry
  enableLogs: true,

  // Nao captura spans de filesystem, apenas HTTP e DB
  integrations: [
    Sentry.httpIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Nao vaza dados sensiveis nos eventos
  beforeSend(event) {
    if (event.request) {
      // Remove headers sensiveis
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-api-key"];
        delete event.request.headers["x-openpix-key"];
      }

      // Remove body de requisicoes (pode conter dados de pagamento)
      delete event.request.data;
    }

    return event;
  },

  // Filtra erros esperados / sem valor de alerta
  ignoreErrors: [
    // Rotas nao encontradas - nao sao bugs
    "NotFound",
    // Erros de autenticacao esperados
    "Unauthorized",
    "Forbidden",
  ],
});
