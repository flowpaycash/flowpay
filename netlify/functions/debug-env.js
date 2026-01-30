// 🚀 FLOWPay - Debug Environment Variables
// Protegido: Não funciona em produção

exports.handler = async (event, context) => {
  const allowedOrigins = {
    production: ['https://flowpaypix.netlify.app'],
    staging: ['https://flowpaypix-staging.netlify.app'],
    development: ['http://localhost:8888', 'http://localhost:8000', 'http://127.0.0.1:8888']
  };

  const environment = process.env.NODE_ENV || 'development';
  const origin = event.headers.origin || event.headers.Origin;
  const isAllowedOrigin = allowedOrigins[environment]?.includes(origin) || false;

  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Bloquear acesso em produção para evitar vazamento de informações (CRITICAL SECURITY FIX)
  if (process.env.NODE_ENV === 'production') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Acesso negado em ambiente de produção' })
    };
  }

  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      variables: {
        WOOVI_API_KEY: process.env.WOOVI_API_KEY ?
          `${process.env.WOOVI_API_KEY.substring(0, 10)}...` : 'NÃO CONFIGURADA',
        WOOVI_API_URL: process.env.WOOVI_API_URL || 'NÃO CONFIGURADA',
        WOOVI_WEBHOOK_SECRET: process.env.WOOVI_WEBHOOK_SECRET ?
          `${process.env.WOOVI_WEBHOOK_SECRET.substring(0, 10)}...` : 'NÃO CONFIGURADA'
      },
      function_name: context.functionName
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugInfo, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno', message: error.message })
    };
  }
};
