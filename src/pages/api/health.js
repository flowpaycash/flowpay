import * as Sentry from "@sentry/astro";

export const GET = async () => {
  const start = Date.now();
  Sentry.logger.info("Health check", { source: "api/health" });
  Sentry.metrics.count("user_action", 1);
  Sentry.metrics.distribution("api_response_time", Date.now() - start);

  return new Response(
    JSON.stringify({ status: "ok", time: new Date().toISOString() }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
