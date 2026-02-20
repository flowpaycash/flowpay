import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV || "production",

  release:
    process.env.SENTRY_RELEASE ||
    `flowpay@${process.env.npm_package_version || "1.0.1"}`,

  // Performance monitoring - amostragem conservadora em producao
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  // Nao captura spans de filesystem, apenas HTTP e DB
  integrations: [Sentry.httpIntegration()],

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
