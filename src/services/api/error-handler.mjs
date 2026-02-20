// 🔧 FLOWPay - Error Handler Middleware
// Sistema padronizado de tratamento de erros

import * as Sentry from "@sentry/astro";
import { config, secureLog } from "./config.mjs";

// Tipos de erro padronizados
export const ERROR_TYPES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  BAD_REQUEST_ERROR: "BAD_REQUEST_ERROR",
};

// Códigos de status HTTP mapeados
export const HTTP_STATUS = {
  [ERROR_TYPES.VALIDATION_ERROR]: 400,
  [ERROR_TYPES.AUTHENTICATION_ERROR]: 401,
  [ERROR_TYPES.AUTHORIZATION_ERROR]: 403,
  [ERROR_TYPES.RATE_LIMIT_ERROR]: 429,
  [ERROR_TYPES.EXTERNAL_API_ERROR]: 502,
  [ERROR_TYPES.INTERNAL_ERROR]: 500,
  [ERROR_TYPES.NOT_FOUND_ERROR]: 404,
  [ERROR_TYPES.BAD_REQUEST_ERROR]: 400,
};

// Classe de erro customizada
export class FlowPayError extends Error {
  constructor(type, message, details = {}, statusCode = null) {
    super(message);
    this.name = "FlowPayError";
    this.type = type;
    this.details = details;
    this.statusCode = statusCode || HTTP_STATUS[type] || 500;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }
}

/**
 * Envia erro ao Sentry com contexto padronizado do FlowPay.
 * Erros operacionais (ex: validacao, rate limit) sao enviados como warnings.
 * Erros programaticos (bugs reais) sao enviados como exceptions completas.
 */
export function captureToSentry(error, context = {}) {
  Sentry.withScope((scope) => {
    // Tag pelo tipo de erro para facilitar triagem no dashboard
    scope.setTag("error.type", error.type || "UNKNOWN");
    scope.setTag("error.operational", String(error instanceof FlowPayError));

    // Contexto de transacao / pagamento se disponivel
    if (context.id_transacao) {
      scope.setTag("transaction.id", context.id_transacao);
    }
    if (context.wallet) {
      scope.setUser({ id: context.wallet });
    }
    if (context.service) {
      scope.setTag("external.service", context.service);
    }

    // Dados extras sem informacao sensivel
    scope.setExtras({
      errorDetails: error.details || {},
      ...context,
      // Garante que dados sensiveis nao vazem
      wallet: context.wallet
        ? `${context.wallet.substring(0, 6)}...`
        : undefined,
    });

    // Erros operacionais com status >= 500 ou erros externos sao capturados como exception
    // Erros de validacao, auth e rate limit vao como mensagem de nivel warning
    const isHighSeverity =
      !error.isOperational ||
      error.statusCode >= 500 ||
      error.type === ERROR_TYPES.EXTERNAL_API_ERROR;

    if (isHighSeverity) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`[${error.type}] ${error.message}`, "warning");
    }
  });
}

// Função para criar erros padronizados
export function createError(type, message, details = {}) {
  return new FlowPayError(type, message, details);
}

// Função para tratar erros de validação
export function handleValidationError(field, message, value = null) {
  return createError(
    ERROR_TYPES.VALIDATION_ERROR,
    `Erro de validação: ${message}`,
    {
      field,
      value: value ? String(value).substring(0, 100) : null,
      timestamp: new Date().toISOString(),
    }
  );
}

// Função para tratar erros de API externa
export function handleExternalAPIError(
  service,
  statusCode,
  response,
  originalError = null
) {
  // Tentar extrair mensagem específica da resposta
  let errorMessage = `Erro na API externa: ${service}`;
  let errorDetails = {
    service,
    statusCode,
    response: response ? String(response).substring(0, 500) : null,
    originalError: originalError ? originalError.message : null,
    timestamp: new Date().toISOString(),
  };

  // Tentar parsear resposta JSON para extrair mensagem específica
  if (response) {
    try {
      const parsedResponse =
        typeof response === "string" ? JSON.parse(response) : response;

      // Extrair mensagem de erro da API Woovi
      if (
        parsedResponse.errors &&
        Array.isArray(parsedResponse.errors) &&
        parsedResponse.errors.length > 0
      ) {
        const firstError = parsedResponse.errors[0];
        errorMessage = firstError.message || errorMessage;
        errorDetails.apiError = firstError;
      } else if (parsedResponse.message) {
        errorMessage = parsedResponse.message;
        errorDetails.apiMessage = parsedResponse.message;
      } else if (parsedResponse.error) {
        errorMessage = parsedResponse.error;
        errorDetails.apiError = parsedResponse.error;
      }
    } catch (e) {
      // Se não for JSON, usar resposta como está
      if (typeof response === "string" && response.length < 200) {
        errorMessage = response;
      }
    }
  }

  // Mensagens amigáveis baseadas no status code
  if (statusCode === 401) {
    errorMessage = "Erro de autenticação na API. Verifique suas credenciais.";
  } else if (statusCode === 403) {
    errorMessage = "Acesso negado pela API. Verifique suas permissões.";
  } else if (statusCode === 404) {
    errorMessage = "Endpoint não encontrado na API.";
  } else if (statusCode === 429) {
    errorMessage = "Muitas requisições. Tente novamente em alguns instantes.";
  } else if (statusCode >= 500) {
    errorMessage =
      "Serviço temporariamente indisponível. Tente novamente em alguns instantes.";
  }

  return createError(
    ERROR_TYPES.EXTERNAL_API_ERROR,
    errorMessage,
    errorDetails
  );
}

// Função para tratar erros de autenticação
export function handleAuthError(message, details = {}) {
  return createError(ERROR_TYPES.AUTHENTICATION_ERROR, message, {
    ...details,
    timestamp: new Date().toISOString(),
  });
}

// Função para tratar erros de rate limiting
export function handleRateLimitError(limit, remaining, resetTime) {
  return createError(ERROR_TYPES.RATE_LIMIT_ERROR, "Rate limit excedido", {
    limit,
    remaining,
    resetTime,
    retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    timestamp: new Date().toISOString(),
  });
}

// Middleware principal de tratamento de erro
export function errorHandler(error, event, context) {
  // Envia ao Sentry com contexto da requisicao
  captureToSentry(error, {
    path: event.path,
    method: event.httpMethod,
    requestId: context?.awsRequestId,
  });

  // Log do erro de forma segura
  secureLog("error", "Erro capturado pelo error handler", {
    errorType: error.type || "UNKNOWN",
    message: error.message,
    stack: config.logging.includeStack ? error.stack : undefined,
    event: {
      httpMethod: event.httpMethod,
      path: event.path,
      userAgent: event.headers["user-agent"] || "unknown",
    },
    context: {
      requestId: context.awsRequestId,
      functionName: context.functionName,
    },
  });

  // Determinar se é erro operacional ou programático
  const isOperational = error instanceof FlowPayError && error.isOperational;

  // Preparar resposta baseada no tipo de erro
  let statusCode = 500;
  let responseBody = {
    error: "Erro interno do servidor",
    message: "Ocorreu um erro inesperado",
    timestamp: new Date().toISOString(),
  };

  if (isOperational) {
    // Erro operacional - retornar detalhes controlados
    statusCode = error.statusCode;

    // Mensagem amigável para o usuário
    let userMessage = error.message;

    // Melhorar mensagens baseadas no tipo de erro
    if (error.type === ERROR_TYPES.EXTERNAL_API_ERROR) {
      // Mensagem já vem amigável do handleExternalAPIError
      userMessage = error.message;
    } else if (error.type === ERROR_TYPES.VALIDATION_ERROR) {
      userMessage =
        error.message || "Dados inválidos. Verifique os campos informados.";
    } else if (error.type === ERROR_TYPES.AUTHENTICATION_ERROR) {
      userMessage = "Erro de autenticação. Verifique suas credenciais.";
    } else if (error.type === ERROR_TYPES.RATE_LIMIT_ERROR) {
      userMessage =
        "Muitas requisições. Aguarde alguns instantes e tente novamente.";
    }

    responseBody = {
      success: false,
      error: userMessage,
      errorType: error.type,
      details: undefined,
      timestamp: error.timestamp,
    };
  } else {
    // Erro programático - logar e retornar resposta genérica
    secureLog("error", "Erro programático não tratado", {
      error: error.message,
      stack: error.stack,
      event: event.httpMethod + " " + event.path,
    });

    responseBody = {
      success: false,
      error: "Erro interno do servidor",
      message:
        "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
      timestamp: new Date().toISOString(),
    };
  }

  // Headers de resposta
  const headers = {
    "Content-Type": "application/json",
    "X-Error-Type": error.type || "UNKNOWN",
    "X-Request-ID": context.awsRequestId,
  };

  // Adicionar headers específicos para rate limiting
  if (error.type === ERROR_TYPES.RATE_LIMIT_ERROR) {
    headers["X-RateLimit-Limit"] = error.details.limit;
    headers["X-RateLimit-Remaining"] = error.details.remaining;
    headers["X-RateLimit-Reset"] = error.details.resetTime;
    headers["Retry-After"] = error.details.retryAfter;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(responseBody),
  };
}

// Função para wrapper de funções com tratamento de erro
export function withErrorHandling(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      return errorHandler(error, event, context);
    }
  };
}

// Função para validar parâmetros obrigatórios
export function validateRequiredParams(params, requiredFields) {
  const missing = requiredFields.filter((field) => !params[field]);

  if (missing.length > 0) {
    throw handleValidationError(
      "required_params",
      `Campos obrigatórios ausentes: ${missing.join(", ")}`,
      { missing, provided: Object.keys(params) }
    );
  }
}

// Função para validar formato de email
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw handleValidationError("email", "Formato de email inválido", {
      email,
    });
  }
}

// Função para validar endereço Ethereum
export function validateEthereumAddress(address) {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    throw handleValidationError("wallet", "Endereço Ethereum inválido", {
      address,
    });
  }
}

// Função para validar valor monetário
export function validateMonetaryValue(value, fieldName = "valor") {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    throw handleValidationError(
      fieldName,
      "Valor deve ser um número positivo",
      { value }
    );
  }
  return numValue;
}
