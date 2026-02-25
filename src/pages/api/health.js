import * as Sentry from "@sentry/astro";
import { getDatabase } from "../../services/database/sqlite.mjs";
import { redis } from "../../services/api/redis-client.mjs";
import { getCapabilityStatus } from "../../services/compliance/capability-status.mjs";

export const GET = async () => {
  const start = Date.now();
  Sentry.logger.info("Health check", { source: "api/health" });

  let db = "fail";
  try {
    const database = getDatabase();
    const row = database.prepare("SELECT 1 as ok").get();
    db = row?.ok === 1 ? "ok" : "fail";
  } catch {
    db = "fail";
  }

  const envStatus = {
    WOOVI_API_KEY: Boolean(process.env.WOOVI_API_KEY),
    WOOVI_WEBHOOK_SECRET: Boolean(process.env.WOOVI_WEBHOOK_SECRET),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    DASHBOARD_SECRET: Boolean(process.env.DASHBOARD_SECRET),
    QUICKNODE_WEBHOOK_SECRET: Boolean(process.env.QUICKNODE_WEBHOOK_SECRET),
    URL: Boolean(process.env.URL || process.env.RAILWAY_PUBLIC_DOMAIN),
    NODE_ENV: Boolean(process.env.NODE_ENV),
    NEXUS_SECRET: Boolean(process.env.NEXUS_SECRET),
    NEXUS_BRIDGE_ENABLED: process.env.NEXUS_BRIDGE_ENABLED !== "false",
  };

  const redisStatus = !redis ? "disabled" : redis.status === "ready" ? "ok" : redis.status;
  const email = envStatus.RESEND_API_KEY ? "ok" : "fail";
  const nexus = !envStatus.NEXUS_BRIDGE_ENABLED
    ? "disabled"
    : envStatus.NEXUS_SECRET
      ? "ok"
      : "offline";

  const responseBody = {
    status: (db === "ok" && (redisStatus === "ok" || redisStatus === "disabled")) ? "ok" : "degraded",
    time: new Date().toISOString(),
    db,
    redis: redisStatus,
    email,
    nexus,
    node: process.version,
    env: process.env.NODE_ENV || "production",
    uptime: Math.floor(process.uptime()),
    env_status: envStatus,
    env_values: {
      URL: process.env.URL || process.env.RAILWAY_PUBLIC_DOMAIN || "—",
      NODE_ENV: process.env.NODE_ENV || "production",
    },
    capabilities: getCapabilityStatus(),
  };

  Sentry.metrics.count("user_action", 1);
  Sentry.metrics.distribution("api_response_time", Date.now() - start);

  return new Response(
    JSON.stringify(responseBody),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
