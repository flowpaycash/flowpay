// 🔐 FLOWPay - Configuração Centralizada
// Centraliza todas as configurações e validações de ambiente

export const config = {
  // Ambiente atual
  environment: process.env.NODE_ENV || 'development',

  // URLs permitidas por ambiente
  allowedOrigins: {
    production: process.env.ALLOWED_ORIGINS_PROD
      ? process.env.ALLOWED_ORIGINS_PROD.split(',')
      : ['https://flowpaypix.netlify.app', 'https://flowpay-production-10d8.up.railway.app', 'https://flowpay.cash', 'https://www.flowpay.cash'],
    staging: process.env.ALLOWED_ORIGINS_STAGING
      ? process.env.ALLOWED_ORIGINS_STAGING.split(',')
      : ['https://flowpaypix-staging.netlify.app'],
    development: ['http://localhost:8888', 'http://localhost:8000', 'http://127.0.0.1:8888']
  },

  // Configurações da API Woovi
  woovi: {
    apiKey: process.env.WOOVI_API_KEY,
    webhookSecret: process.env.WOOVI_WEBHOOK_SECRET,
    apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com',
    // IPs oficiais da Woovi para webhooks (Load from ENV or strict default)
    allowedIPs: process.env.WOOVI_ALLOWED_IPS
      ? process.env.WOOVI_ALLOWED_IPS.split(',')
      : ['179.190.27.5', '179.190.27.6', '186.224.205.214', '181.192.114.64']
  },

  // Configurações de autenticação
  auth: {
    // ⚠️ CRITICAL: Never default to a hardcoded password in production
    adminPassword: process.env.ADMIN_PASSWORD,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas em ms
    tokenExpiration: 15 * 60 * 1000 // 15 minutos em ms
  },

  // Configurações de segurança
  security: {
    cors: {
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'x-woovi-signature']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // máximo requests por IP por janela
      skipSuccessfulRequests: false
    },
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    }
  },

  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    redactSensitiveData: true,
    includeStack: process.env.NODE_ENV === 'development'
  }
};

// Validação de configurações obrigatórias
export function validateConfig() {
  const required = [
    'WOOVI_API_KEY',
    'WOOVI_WEBHOOK_SECRET'
  ];

  // In production, require ADMIN_PASSWORD
  if (process.env.NODE_ENV === 'production') {
    required.push('ADMIN_PASSWORD');
  }

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `🔥 ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`;
    console.error(errorMsg);
    // In strict mode (production), we might want to exit. 
    // Throwing error usually stops standard Node processes.
    throw new Error(errorMsg);
  }

  return true;
}

// Função para obter CORS headers
export function getCorsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  // Check against Environment-specific allow list
  const envOrigins = config.allowedOrigins[config.environment] || config.allowedOrigins.development;
  const isAllowedOrigin = envOrigins.includes(origin);

  // Return specific origin if allowed, else null (or strict deny)
  // Returning 'null' causing issues with credentials often, better to not return Access-Control-Allow-Origin at all or handle specifically.
  // Standard secure practice: If allowed, echo origin. If not, don't send header (block).

  if (!isAllowedOrigin) {
    return {
      ...config.security.headers
    };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': config.security.cors.headers.join(', '),
    'Access-Control-Allow-Methods': config.security.cors.methods.join(', '),
    'Access-Control-Allow-Credentials': config.security.cors.credentials.toString(),
    ...config.security.headers
  };
}

// Função para logging seguro e estruturado
export function secureLog(level, message, data = {}) {
  // Avoid logging in test unless verbose
  if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE) return;

  const timestamp = new Date().toISOString();
  const logLevel = level.toUpperCase();

  // Estrutura base do log
  const logEntry = {
    timestamp,
    level: logLevel,
    message,
    service: 'flowpay',
    environment: config.environment
  };

  // Processar dados se fornecidos
  if (data && typeof data === 'object') {
    try {
      if (config.logging.redactSensitiveData) {
        logEntry.data = redactSensitiveData(data);
      } else {
        logEntry.data = data;
      }
    } catch (err) {
      logEntry.data = { error: 'Failed to process log data', rawError: err.message };
    }
  }

  // Log estruturado em JSON
  // Use stdout/stderr appropriately
  if (level.toLowerCase() === 'error') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Função para remover dados sensíveis (Optimized & Non-Recursive Loop Safe)
export function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;

  // Pre-compute array once for substring checks (avoid Array.from per key)
  const sensitiveKeysExact = new Set([
    'password', 'token', 'secret', 'key', 'apikey', 'api_key', 'access_token',
    'webhook_secret', 'client_secret', 'private_key', 'privatekey',
    'authorization', 'auth', 'credentials', 'session', 'sessiontoken',
    'wallet', 'mnemonic', 'seed', 'correlationid', 'transactionid', 'id_transacao', 'card_number', 'cvv'
  ]);
  const sensitiveSubstrings = [...sensitiveKeysExact];

  const seen = new WeakSet();

  function isSensitiveKey(lowerKey) {
    if (sensitiveKeysExact.has(lowerKey)) return true;
    for (let i = 0; i < sensitiveSubstrings.length; i++) {
      if (lowerKey.includes(sensitiveSubstrings[i])) return true;
    }
    return false;
  }

  function redact(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj)) {
      return '[CIRCULAR]';
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => redact(item));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redact(value);
      }
    }
    return result;
  }

  return redact(data);
}

// Função para logging de transações PIX (específica)
export function logPixTransaction(level, message, transactionData = {}) {
  const safeTransactionData = {
    id: transactionData.id || transactionData.correlationID || 'unknown',
    status: transactionData.status || 'unknown',
    amount: transactionData.amount || transactionData.value || 'unknown',
    currency: transactionData.currency || transactionData.moeda || 'unknown',
    createdAt: transactionData.createdAt || transactionData.created_at || new Date().toISOString(),
    // Dados sensíveis sempre redatados explicitamente
    wallet: '[REDACTED]',
    apiKey: '[REDACTED]',
    webhookSecret: '[REDACTED]'
  };

  secureLog(level, message, safeTransactionData);
}

// Função para logging de erros de API
export function logAPIError(level, message, errorData = {}) {
  const safeErrorData = {
    service: errorData.service || 'unknown',
    statusCode: errorData.statusCode || 'unknown',
    endpoint: errorData.endpoint || 'unknown',
    method: errorData.method || 'unknown',
    // Limit response size to avoid log bloat
    response: errorData.response ? String(errorData.response).substring(0, 500) : 'unknown',
    timestamp: new Date().toISOString()
  };

  secureLog(level, message, safeErrorData);
}

