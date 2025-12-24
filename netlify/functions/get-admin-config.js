// 🔐 FLOWPay - Get Admin Config Function
// Retorna configurações do admin de forma segura

const { config, getCorsHeaders, secureLog } = require('./config');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders(event);
  
  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Verificar método HTTP
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }
    
    // Verificar se é ambiente de desenvolvimento
    if (config.environment === 'production') {
      secureLog('warn', 'Tentativa de acesso à configuração admin em produção', {
        ip: event.headers['x-forwarded-for'] || 'unknown',
        userAgent: event.headers['user-agent'] || 'unknown'
      });
      
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acesso negado em produção' })
      };
    }
    
    // Retornar apenas informações necessárias para desenvolvimento
    const adminConfig = {
      environment: config.environment,
      hasPassword: !!config.auth.adminPassword,
      sessionTimeout: config.auth.sessionTimeout,
      timestamp: new Date().toISOString()
    };
    
    secureLog('info', 'Configuração admin solicitada', {
      environment: config.environment
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: adminConfig
      })
    };
    
  } catch (error) {
    secureLog('error', 'Erro ao obter configuração admin', {
      error: error.message,
      stack: config.logging.includeStack ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno do servidor',
        message: config.environment === 'development' ? error.message : 'Erro interno'
      })
    };
  }
};
