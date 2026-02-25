import * as Sentry from "@sentry/astro";

const SENTRY_DSN =
  import.meta.env.PUBLIC_SENTRY_DSN ||
  "https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/000000";

Sentry.init({
  dsn: SENTRY_DSN,

  environment: import.meta.env.PUBLIC_ENV || "production",

  release: import.meta.env.PUBLIC_SENTRY_RELEASE || "flowpay@1.0.1",

  // Performance monitoring
  tracesSampleRate: import.meta.env.PUBLIC_ENV === "development" ? 1.0 : 0.2,

  // Session replay - only in production to save quota
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Captura logs do console como logs estruturados no Sentry
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Filter out noise
  ignoreErrors: [
    // Network errors fora do controle
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // Browser extensions
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // MetaMask / Web3 ruidos comuns
    "User rejected the request",
    "MetaMask: Received invalid block header",
  ],

  beforeSend(event) {
    // Nao envia eventos em dev local
    if (import.meta.env.PUBLIC_ENV === "development") {
      console.warn("[Sentry] Event capturado (dev, nao enviado):", event);
      return null;
    }
    return event;
  },
});
