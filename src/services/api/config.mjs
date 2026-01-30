// 🔐 FLOWPay - Configuração Centralizada
// Centraliza todas as configurações e validações de ambiente

export const config = {
  // Ambiente atual
  environment: process.env.NODE_ENV || 'development',

  // URLs permitidas por ambiente
  allowedOrigins: {
    production: ['https://flowpaypix.netlify.app'],
    staging: ['https://flowpaypix-staging.netlify.app'],
    development: ['http://localhost:8888', 'http://localhost:8000', 'http://127.0.0.1:8888']
  },

  // Configurações da API Woovi
  woovi: {
    apiKey: process.env.WOOVI_API_KEY,
    webhookSecret: process.env.WOOVI_WEBHOOK_SECRET,
    apiUrl: process.env.WOOVI_API_URL || 'https://api.woovi.com'
  },

  // Configurações de autenticação
  auth: {
    adminPassword: process.env.ADMIN_PASSWORD || 'flowpay2024',
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
      maxRequests: 100, // máximo 100 requests por IP por janela
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

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`);
  }

  return true;
}

// Função para obter CORS headers
export function getCorsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin;
  const isAllowedOrigin = config.allowedOrigins[config.environment]?.includes(origin) || false;

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
    'Access-Control-Allow-Headers': config.security.cors.headers.join(', '),
    'Access-Control-Allow-Methods': config.security.cors.methods.join(', '),
    'Access-Control-Allow-Credentials': config.security.cors.credentials.toString(),
    ...config.security.headers
  };
}

// Função para logging seguro e estruturado
export function secureLog(level, message, data = {}) {
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
    if (config.logging.redactSensitiveData) {
      // Remove dados sensíveis dos logs
      const redactedData = redactSensitiveData(data);
      logEntry.data = redactedData;
    } else {
      logEntry.data = data;
    }
  }

  // Log estruturado em JSON
  console[level.toLowerCase()](JSON.stringify(logEntry));
}

// Função para remover dados sensíveis
export function redactSensitiveData(data) {
  const redacted = { ...data };
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
    'webhook_secret', 'client_secret', 'private_key', 'privateKey',
    'authorization', 'auth', 'credentials', 'session', 'sessionToken',
    'wallet', 'address', 'mnemonic', 'seed', 'privateKey',
    'correlationID', 'transactionId', 'id_transacao'
  ];

  // Função recursiva para redatar objetos aninhados
  function redactObject(obj, path = '') {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => redactObject(item, `${path}[${index}]`));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase()) ||
        currentPath.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactObject(value, currentPath);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return redactObject(redacted);
}

// Função para logging de transações PIX (específica)
export function logPixTransaction(level, message, transactionData = {}) {
  const safeTransactionData = {
    id: transactionData.id || transactionData.correlationID || 'unknown',
    status: transactionData.status || 'unknown',
    amount: transactionData.amount || transactionData.value || 'unknown',
    currency: transactionData.currency || transactionData.moeda || 'unknown',
    createdAt: transactionData.createdAt || transactionData.created_at || new Date().toISOString(),
    // Dados sensíveis sempre redatados
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
    response: errorData.response ? String(errorData.response).substring(0, 200) : 'unknown',
    timestamp: new Date().toISOString()
  };

  secureLog(level, message, safeErrorData);
}
