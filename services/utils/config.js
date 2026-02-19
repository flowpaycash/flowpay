// 🔐 FLOWPay - Configuração Central para Serviços Node.js
// Fornece utilitários de logging, proteção de dados sensíveis e acesso a configurações
// Substitui a dependência anterior do Netlify Functions

const config = {
    environment: process.env.NODE_ENV || 'development',
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        redactSensitiveData: true
    }
};

/**
 * Remove dados sensíveis de um objeto (Prevenção de vazamento em logs)
 */
function redactSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = new Set([
        'password', 'token', 'secret', 'key', 'apikey', 'api_key', 'access_token',
        'webhook_secret', 'client_secret', 'private_key', 'privatekey',
        'authorization', 'auth', 'credentials', 'session', 'sessiontoken',
        'wallet', 'mnemonic', 'seed', 'correlationid', 'transactionid', 'card_number', 'cvv'
    ]);

    const seen = new WeakSet();

    function redact(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (seen.has(obj)) return '[CIRCULAR]';
        seen.add(obj);

        if (Array.isArray(obj)) return obj.map(item => redact(item));

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            let isSensitive = sensitiveKeys.has(lowerKey);

            if (!isSensitive) {
                for (const sensitive of sensitiveKeys) {
                    if (lowerKey.includes(sensitive)) {
                        isSensitive = true;
                        break;
                    }
                }
            }

            if (isSensitive) {
                result[key] = '[REDACTED]';
            } else {
                result[key] = redact(value);
            }
        }
        return result;
    }

    return redact(data);
}

/**
 * Logging estruturado e seguro
 */
function secureLog(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logLevel = level.toUpperCase();

    const logEntry = {
        timestamp,
        level: logLevel,
        message,
        environment: config.environment
    };

    if (data && typeof data === 'object') {
        logEntry.data = config.logging.redactSensitiveData ? redactSensitiveData(data) : data;
    }

    const output = JSON.stringify(logEntry);
    if (logLevel === 'ERROR') {
        console.error(output);
    } else {
        console.log(output);
    }
}

/**
 * Logging de erros de API
 */
function logAPIError(level, message, errorData = {}) {
    const safeErrorData = {
        service: errorData.service || 'unknown',
        statusCode: errorData.statusCode || 'unknown',
        endpoint: errorData.endpoint || 'unknown',
        method: errorData.method || 'unknown',
        response: errorData.response ? String(errorData.response).substring(0, 500) : 'unknown'
    };

    secureLog(level, message, safeErrorData);
}

module.exports = {
    config,
    secureLog,
    redactSensitiveData,
    logAPIError
};
