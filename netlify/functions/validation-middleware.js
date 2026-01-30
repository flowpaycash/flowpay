// 🔧 FLOWPay - Validation Middleware
// Middleware reutilizável para validações de entrada

const { createError, ERROR_TYPES } = require('./error-handler');

// Esquemas de validação
const VALIDATION_SCHEMAS = {
  // Validação para criação de cobrança PIX
  createPixCharge: {
    required: ['wallet', 'valor', 'moeda', 'id_transacao'],
    validations: {
      wallet: {
        type: 'ethereum_address',
        required: true
      },
      valor: {
        type: 'monetary_value',
        required: true,
        min: 0.01,
        max: 1000000
      },
      moeda: {
        type: 'currency_code',
        required: true,
        allowed: ['BRL', 'USD', 'EUR']
      },
      id_transacao: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      }
    }
  },

  // Validação para webhook
  webhook: {
    required: ['event', 'data'],
    validations: {
      event: {
        type: 'string',
        required: true,
        allowed: ['charge.paid', 'charge.confirmed', 'charge.expired', 'charge.overdue']
      },
      data: {
        type: 'object',
        required: true
      }
    }
  },

  // Validação para autenticação
  auth: {
    required: ['email'],
    validations: {
      email: {
        type: 'email',
        required: true
      }
    }
  }
};

// Função para validar tipo de dados
function validateType(value, type, fieldName) {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser uma string`, {
          field: fieldName,
          expected: 'string',
          received: typeof value
        });
      }
      break;

    case 'number':
      if (typeof value !== 'number' && !Number.isFinite(parseFloat(value))) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um número`, {
          field: fieldName,
          expected: 'number',
          received: typeof value
        });
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um objeto`, {
          field: fieldName,
          expected: 'object',
          received: typeof value
        });
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um email válido`, {
          field: fieldName,
          value: value
        });
      }
      break;

    case 'ethereum_address':
      try {
        const { isAddress } = require('viem');
        if (!isAddress(value)) {
          throw new Error('Endereço Ethereum inválido');
        }
      } catch (e) {
        if (!value || !value.startsWith('0x') || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
          throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um endereço Ethereum válido`, {
            field: fieldName,
            value: value
          });
        }
      }
      break;

    case 'monetary_value':
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um valor monetário positivo`, {
          field: fieldName,
          value: value
        });
      }
      break;

    case 'currency_code':
      const allowedCurrencies = ['BRL', 'USD', 'EUR'];
      if (!allowedCurrencies.includes(value)) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um código de moeda válido`, {
          field: fieldName,
          value: value,
          allowed: allowedCurrencies
        });
      }
      break;
  }
}

// Função para validar comprimento
function validateLength(value, minLength, maxLength, fieldName) {
  if (minLength !== undefined && value.length < minLength) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ter pelo menos ${minLength} caracteres`, {
      field: fieldName,
      minLength,
      actualLength: value.length
    });
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ter no máximo ${maxLength} caracteres`, {
      field: fieldName,
      maxLength,
      actualLength: value.length
    });
  }
}

// Função para validar valores numéricos
function validateNumericRange(value, min, max, fieldName) {
  const numValue = parseFloat(value);

  if (min !== undefined && numValue < min) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser pelo menos ${min}`, {
      field: fieldName,
      min,
      actualValue: numValue
    });
  }

  if (max !== undefined && numValue > max) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser no máximo ${max}`, {
      field: fieldName,
      max,
      actualValue: numValue
    });
  }
}

// Função para validar valores permitidos
function validateAllowedValues(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} deve ser um dos valores permitidos`, {
      field: fieldName,
      value: value,
      allowed: allowed
    });
  }
}

// Função principal de validação
function validateData(data, schemaName) {
  const schema = VALIDATION_SCHEMAS[schemaName];

  if (!schema) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `Esquema de validação '${schemaName}' não encontrado`);
  }

  // Verificar campos obrigatórios
  const missingFields = schema.required.filter(field => !(field in data));
  if (missingFields.length > 0) {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, `Campos obrigatórios ausentes: ${missingFields.join(', ')}`, {
      missing: missingFields,
      provided: Object.keys(data)
    });
  }

  // Validar cada campo
  for (const [fieldName, fieldConfig] of Object.entries(schema.validations)) {
    const value = data[fieldName];

    // Pular se campo não fornecido e não obrigatório
    if (value === undefined || value === null) {
      if (fieldConfig.required) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, `Campo obrigatório '${fieldName}' não fornecido`);
      }
      continue;
    }

    // Validar tipo
    if (fieldConfig.type) {
      validateType(value, fieldConfig.type, fieldName);
    }

    // Validar comprimento (para strings)
    if (fieldConfig.type === 'string' && (fieldConfig.minLength !== undefined || fieldConfig.maxLength !== undefined)) {
      validateLength(value, fieldConfig.minLength, fieldConfig.maxLength, fieldName);
    }

    // Validar range numérico
    if (fieldConfig.type === 'monetary_value' && (fieldConfig.min !== undefined || fieldConfig.max !== undefined)) {
      validateNumericRange(value, fieldConfig.min, fieldConfig.max, fieldName);
    }

    // Validar valores permitidos
    if (fieldConfig.allowed) {
      validateAllowedValues(value, fieldConfig.allowed, fieldName);
    }
  }

  return true;
}

// Middleware para validação de JSON
function validateJSON(schemaName) {
  return (event, context) => {
    try {
      const data = JSON.parse(event.body || '{}');
      validateData(data, schemaName);
      return { data, error: null };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw createError(ERROR_TYPES.VALIDATION_ERROR, 'JSON inválido no corpo da requisição');
      }
      throw error;
    }
  };
}

// Middleware para validação de query parameters
function validateQueryParams(schemaName) {
  return (event, context) => {
    const queryParams = event.queryStringParameters || {};
    validateData(queryParams, schemaName);
    return { data: queryParams, error: null };
  };
}

// Função para sanitizar dados
function sanitizeData(data) {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remover caracteres perigosos
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove < e >
        .trim() // Remove espaços em branco
        .substring(0, 1000); // Limita tamanho
    } else if (typeof value === 'number') {
      // Validar números
      sanitized[key] = isNaN(value) ? 0 : value;
    } else if (typeof value === 'object' && value !== null) {
      // Recursão para objetos
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

module.exports = {
  VALIDATION_SCHEMAS,
  validateData,
  validateJSON,
  validateQueryParams,
  sanitizeData,
  validateType,
  validateLength,
  validateNumericRange,
  validateAllowedValues
};
