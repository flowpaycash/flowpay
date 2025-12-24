// 🚦 FLOWPay - Rate Limiter Middleware
// Implementa rate limiting básico para proteção contra spam/abuso

const crypto = require('crypto');

// Store simples em memória (em produção, usar Redis ou similar)
const requestCounts = new Map();

// Configurações de rate limiting
const RATE_LIMITS = {
  // APIs críticas - mais restritivas
  'create-pix-charge': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests por 15min
  'webhook-handler': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests por minuto
  'auth-magic-start': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests por 15min
  
  // APIs menos críticas
  'pix-orders': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests por minuto
  'debug-env': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests por minuto
  'get-admin-config': { windowMs: 60 * 1000, maxRequests: 20 } // 20 requests por minuto
};

// Função para obter IP do cliente
function getClientIP(event) {
  return event.headers['x-forwarded-for'] || 
         event.headers['x-real-ip'] || 
         event.headers['x-client-ip'] || 
         event.context?.clientIP || 
         'unknown';
}

// Função para gerar chave única para rate limiting
function generateRateLimitKey(ip, endpoint) {
  return crypto.createHash('sha256')
    .update(`${ip}:${endpoint}`)
    .digest('hex');
}

// Função principal de rate limiting
function checkRateLimit(event, endpoint) {
  const ip = getClientIP(event);
  const key = generateRateLimitKey(ip, endpoint);
  const now = Date.now();
  
  // Obter configuração do endpoint
  const config = RATE_LIMITS[endpoint] || { windowMs: 60 * 1000, maxRequests: 30 };
  
  // Limpar entradas expiradas
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
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: entry.firstRequest + config.windowMs,
        retryAfter: Math.ceil((entry.firstRequest + config.windowMs - now) / 1000)
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
    // Resetar contador se a janela expirou
    requestCounts.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
}

// Middleware para aplicar rate limiting
function applyRateLimit(endpoint) {
  return (event, context) => {
    const result = checkRateLimit(event, endpoint);
    
    if (!result.allowed) {
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
  };
}

// Função para limpar cache de rate limiting (para testes)
function clearRateLimitCache() {
  requestCounts.clear();
}

module.exports = {
  checkRateLimit,
  applyRateLimit,
  clearRateLimitCache,
  getClientIP
};
