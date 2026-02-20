// FLOWPay - Rate Limiter Middleware
// Redis-backed rate limiting via ioredis — substitui o Map em memoria

import crypto from "crypto";
import { secureLog } from "./config.mjs";

// Configuracoes de rate limiting por endpoint
export const RATE_LIMITS = {
  "create-pix-charge": { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  "webhook-handler": { windowMs: 60 * 1000, maxRequests: 100 },
  "auth-magic-start": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "nexus-webhook": { windowMs: 60 * 1000, maxRequests: 60 },
  "pix-orders": { windowMs: 60 * 1000, maxRequests: 30 },
  "debug-env": { windowMs: 60 * 1000, maxRequests: 10 },
  "get-admin-config": { windowMs: 60 * 1000, maxRequests: 20 },
};

// --- Redis client (singleton, lazy) -----------------------------------

let redisClient = null;
let redisAvailable = false;

async function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    secureLog(
      "warn",
      "[rate-limiter] REDIS_URL nao definido — usando fallback em memoria"
    );
    return null;
  }

  try {
    const { default: Redis } = await import("ioredis");

    const client = new Redis(url, {
      connectTimeout: 3000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on("connect", () => {
      redisAvailable = true;
      secureLog("info", "[rate-limiter] Redis conectado");
    });
    client.on("error", () => {
      redisAvailable = false;
    });
    client.on("close", () => {
      redisAvailable = false;
    });

    await client.connect();

    redisClient = client;
    redisAvailable = true;
    return client;
  } catch (err) {
    secureLog(
      "warn",
      "[rate-limiter] Falha ao conectar no Redis — fallback em memoria",
      { error: err.message }
    );
    return null;
  }
}

// Inicia a conexao em background ao carregar o modulo
getRedis().catch(() => {});

// --- Fallback em memoria (usado se Redis estiver indisponivel) ---------

const memoryStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now - entry.firstRequest > 60 * 60 * 1000) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000).unref();

function checkMemory(key, config, now) {
  const entry = memoryStore.get(key);

  if (!entry || now - entry.firstRequest > config.windowMs) {
    memoryStore.set(key, { count: 1, firstRequest: now, lastRequest: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    const resetTime = entry.firstRequest + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  entry.count++;
  entry.lastRequest = now;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.firstRequest + config.windowMs,
  };
}

// --- Redis check (sliding window via INCR + EXPIRE) -------------------

async function checkRedis(redis, key, config, now) {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const redisKey = `rl:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);

    const results = await pipeline.exec();
    const count = results[0][1];
    const ttl = results[1][1];

    // Define TTL apenas na primeira requisicao da janela
    if (count === 1 || ttl < 0) {
      await redis.expire(redisKey, windowSec);
    }

    const resetTime = now + (ttl > 0 ? ttl * 1000 : config.windowMs);
    const remaining = Math.max(0, config.maxRequests - count);
    const allowed = count <= config.maxRequests;

    if (!allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }

    return { allowed: true, remaining, resetTime };
  } catch (err) {
    secureLog("warn", "[rate-limiter] Erro no Redis — fallback em memoria", {
      error: err.message,
    });
    redisAvailable = false;
    return checkMemory(key, config, now);
  }
}

// --- Helpers ----------------------------------------------------------

export function getClientIP(event) {
  // CF-Connecting-IP tem prioridade (Cloudflare proxy)
  if (event.headers["cf-connecting-ip"]) {
    return event.headers["cf-connecting-ip"].trim();
  }

  if (event.headers["x-forwarded-for"]) {
    const forwarded = event.headers["x-forwarded-for"];
    const ips =
      typeof forwarded === "string" ? forwarded.split(",") : forwarded;
    return ips[0].trim();
  }

  return (
    event.headers["x-real-ip"] ||
    event.headers["x-client-ip"] ||
    event.context?.clientIP ||
    "unknown-ip"
  );
}

export function generateRateLimitKey(ip, endpoint) {
  return crypto.createHash("sha256").update(`${ip}:${endpoint}`).digest("hex");
}

// --- Funcao principal -------------------------------------------------

export async function checkRateLimit(event, endpoint) {
  const ip = getClientIP(event);
  const key = generateRateLimitKey(ip, endpoint);
  const now = Date.now();
  const config = RATE_LIMITS[endpoint] || {
    windowMs: 60 * 1000,
    maxRequests: 30,
  };

  const redis = redisAvailable ? await getRedis() : null;

  if (redis && redisAvailable) {
    return checkRedis(redis, key, config, now);
  }

  return checkMemory(key, config, now);
}

// --- Middleware -------------------------------------------------------

export function applyRateLimit(endpoint) {
  return (event) => {
    // Wrapper sincrono compativel com o codigo existente
    // Resolve internamente de forma assincrona mas retorna uma Promise
    return checkRateLimit(event, endpoint)
      .then((result) => {
        if (!result.allowed) {
          secureLog("warn", `Rate limit excedido: ${endpoint}`, {
            endpoint,
            retryAfter: result.retryAfter,
          });

          return {
            statusCode: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": RATE_LIMITS[endpoint]?.maxRequests || 30,
              "X-RateLimit-Remaining": result.remaining,
              "X-RateLimit-Reset": result.resetTime,
              "Retry-After": result.retryAfter,
            },
            body: JSON.stringify({
              error: "Rate limit exceeded",
              message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
              retryAfter: result.retryAfter,
            }),
          };
        }

        return null;
      })
      .catch(() => null); // fail open — nao bloqueia request se o limiter crashar
  };
}

// Para testes
export function clearRateLimitCache() {
  memoryStore.clear();
}
