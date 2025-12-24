// 🚀 FLOWPay - Auth Magic Verify Function
// Verifica magic link e cria sessão

const { validateMagicLinkToken, generateAdminSessionToken } = require('./token-validator');
const { config, getCorsHeaders, secureLog } = require('./config');

exports.handler = async (event, context) => {
  // CORS headers específicos por ambiente
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const { token } = JSON.parse(event.body);
    
    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token não fornecido' })
      };
    }

    // Validar token criptograficamente
    const tokenValidation = validateMagicLinkToken(token);
    
    if (!tokenValidation.valid) {
      secureLog('warn', 'Tentativa de validação de token inválido', {
        error: tokenValidation.error,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'null'
      });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Token inválido ou expirado',
          details: config.environment === 'development' ? tokenValidation.error : undefined
        })
      };
    }

    // Gerar sessão segura
    const sessionToken = generateAdminSessionToken(tokenValidation.data.email);
    
    // Log seguro da autenticação
    secureLog('info', 'Usuário autenticado via magic link', {
      email: tokenValidation.data.email,
      sessionTokenPrefix: sessionToken.substring(0, 10) + '...',
      remainingTime: tokenValidation.remainingTime,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Autenticação bem-sucedida',
        sessionToken
      })
    };

  } catch (error) {
    console.error('Erro ao verificar magic link:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor' 
      })
    };
  }
};

// Função auxiliar para gerar token de sessão
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
