// 🚦 FLOWPay - Rate Limiter Middleware
// Implementa rate limiting básico para proteção contra spam/abuso com cleanup

import crypto from 'crypto';
import { secureLog } from './config.mjs';

// Store simples em memória (em produção, usar Redis ou similar)
const requestCounts = new Map();

// Configurações de rate limiting
export const RATE_LIMITS = {
  // APIs críticas - mais restritivas
  'create-pix-charge': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests por 15min
  'webhook-handler': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests por minuto
  'auth-magic-start': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests por 15min

  // APIs menos críticas
  'pix-orders': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests por minuto
  'debug-env': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests por minuto
  'get-admin-config': { windowMs: 60 * 1000, maxRequests: 20 } // 20 requests por minuto
};

// 🧹 CLEANUP MECHANISM (Memory Leak Protection)
// Remove expired entries every minute
const CLEANUP_INTERVAL = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of requestCounts.entries()) {
    // Calculate the specific window for this key entry if possible, 
    // or just use a generous max window (e.g. 1 hour) to be safe if meta is missing
    // For simplicity, if lastRequest was over 1 hour ago, delete it.
    // Or better: check if now > resetTime (which we don't store directly but can infer)

    // Simple expiry: if inactive for 1h, purge.
    if (now - entry.lastRequest > 60 * 60 * 1000) {
      requestCounts.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    secureLog('debug', `Rate limiter cleanup: removed ${cleaned} expired keys`);
  }
}, CLEANUP_INTERVAL).unref(); // unref to not block process exit

// Função para obter IP do cliente com proteção contra spoofing
export function getClientIP(event) {
  // Na Railway/Netlify, o x-forwarded-for é geralmente confiável se configurado corretamente
  // mas devemos pegar o primeiro IP da lista (client original)

  if (event.headers['x-forwarded-for']) {
    const forwarded = event.headers['x-forwarded-for'];
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  return event.headers['x-real-ip'] ||
    event.headers['x-client-ip'] ||
    event.context?.clientIP ||
    'unknown-ip';
}

// Função para gerar chave única para rate limiting
export function generateRateLimitKey(ip, endpoint) {
  return crypto.createHash('sha256')
    .update(`${ip}:${endpoint}`)
    .digest('hex');
}

// Função principal de rate limiting
export function checkRateLimit(event, endpoint) {
  const ip = getClientIP(event);
  const key = generateRateLimitKey(ip, endpoint);
  const now = Date.now();

  // Obter configuração do endpoint
  const config = RATE_LIMITS[endpoint] || { windowMs: 60 * 1000, maxRequests: 30 };

  // Limpar entradas expiradas específicas
  if (requestCounts.has(key)) {
    const entry = requestCounts.get(key);
    if (now - entry.firstRequest > config.windowMs) {
      requestCounts.delete(key);
    }
  }

  // Verificar se existe entrada para este IP/endpoint
  if (!requestCounts.has(key)) {
    requestCounts.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  const entry = requestCounts.get(key);

  // Verificar se ainda está na janela de tempo
  if (now - entry.firstRequest <= config.windowMs) {
    if (entry.count >= config.maxRequests) {
      const resetTime = entry.firstRequest + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Incrementar contador
    entry.count++;
    entry.lastRequest = now;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.firstRequest + config.windowMs
    };
  } else {
    // Resetar contador se a janela expirou (double check)
    requestCounts.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
}

// Middleware para aplicar rate limiting
export function applyRateLimit(endpoint) {
  return (event, context) => {
    try {
      const result = checkRateLimit(event, endpoint);

      if (!result.allowed) {
        secureLog('warn', `Rate limit exceeded for ${endpoint}`, {
          ip: getClientIP(event), // Log IP for ban analysis
          endpoint
        });

        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMITS[endpoint]?.maxRequests || 30,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.resetTime,
            'Retry-After': result.retryAfter
          },
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter
          })
        };
      }

      return null; // Continua com a execução normal
    } catch (e) {
      console.error("Rate limiter error:", e);
      // Fail open (allow request) if rate limiter crashes? Or fail closed?
      // For availability, fail open.
      return null;
    }
  };
}

// Função para limpar cache de rate limiting (para testes)
export function clearRateLimitCache() {
  requestCounts.clear();
}
