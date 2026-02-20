import * as Sentry from "@sentry/astro";

export const GET = async () => {
  Sentry.logger.info("Health check", { source: "api/health" });

  return new Response(
    JSON.stringify({ status: "ok", time: new Date().toISOString() }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
