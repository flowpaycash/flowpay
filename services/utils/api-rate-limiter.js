// FLOWPay - API Rate Limiter
// Rate limiting para chamadas de APIs externas (QuickNode, provedores de liquidez, etc)

class APIRateLimiter {
  constructor() {
    // Store de requisições por endpoint
    this.requestHistory = new Map();

    // Configurações de rate limiting por serviço
    this.configs = {
      quicknode: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minuto
        retryAfterMs: 1000
      },
      liquidityProvider: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 1 minuto
        retryAfterMs: 2000
      },
      default: {
        maxRequests: 30,
        windowMs: 60 * 1000,
        retryAfterMs: 1000
      }
    };
  }

  /**
   * Verifica se uma requisição pode ser feita
   * @param {string} service - Nome do serviço (quicknode, liquidityProvider, etc)
   * @param {string} endpoint - Endpoint específico (opcional)
   * @returns {object} { allowed: boolean, remaining: number, retryAfter?: number }
   */
  checkLimit(service, endpoint = 'default') {
    const config = this.configs[service] || this.configs.default;
    const key = `${service}:${endpoint}`;
    const now = Date.now();

    // Limpar histórico expirado
    this.cleanupExpired(now);

    // Verificar se existe histórico para esta chave
    if (!this.requestHistory.has(key)) {
      this.requestHistory.set(key, {
        requests: [now],
        firstRequest: now
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    const history = this.requestHistory.get(key);

    // Remover requisições fora da janela
    history.requests = history.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    // Verificar se excedeu o limite
    if (history.requests.length >= config.maxRequests) {
      const oldestRequest = history.requests[0];
      const retryAfter = Math.ceil(
        (oldestRequest + config.windowMs - now) / 1000
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        resetTime: oldestRequest + config.windowMs
      };
    }

    // Adicionar nova requisição
    history.requests.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - history.requests.length,
      resetTime: history.requests[0] + config.windowMs
    };
  }

  /**
   * Limpa histórico expirado
   * @param {number} now - Timestamp atual
   */
  cleanupExpired(now) {
    const maxAge = Math.max(
      ...Object.values(this.configs).map(c => c.windowMs)
    );

    for (const [key, history] of this.requestHistory.entries()) {
      if (now - history.firstRequest > maxAge * 2) {
        this.requestHistory.delete(key);
      }
    }
  }

  /**
   * Wrapper para chamadas de API com rate limiting
   * @param {string} service - Nome do serviço
   * @param {string} endpoint - Endpoint específico
   * @param {Function} apiCall - Função que faz a chamada de API
   * @returns {Promise<any>} Resultado da chamada de API
   */
  async withRateLimit(service, endpoint, apiCall) {
    const check = this.checkLimit(service, endpoint);

    if (!check.allowed) {
      throw new Error(
        `Rate limit exceeded for ${service}/${endpoint}. Retry after ${check.retryAfter}s`
      );
    }

    try {
      return await apiCall();
    } catch (error) {
      // Em caso de erro, não contar como requisição bem-sucedida
      // (opcional: implementar lógica mais sofisticada)
      throw error;
    }
  }
}

// Singleton instance
let rateLimiterInstance = null;

function getAPIRateLimiter() {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new APIRateLimiter();
  }
  return rateLimiterInstance;
}

module.exports = {
  APIRateLimiter,
  getAPIRateLimiter
};

