const crypto = require('crypto');

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
    const { email } = JSON.parse(event.body);
    
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'E-mail inválido' })
      };
    }

    // Gerar token único para magic link
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    
    // Em produção, você salvaria isso no banco de dados
    // Por enquanto, apenas logamos para desenvolvimento
    console.log('Magic link gerado:', {
      email,
      token,
      expiresAt: expiresAt.toISOString(),
      magicLink: `${process.env.URL || 'http://localhost:8888'}/auth/verify?token=${token}`
    });

    // Em produção, você enviaria um e-mail real
    const isDev = process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST;
    
    if (isDev) {
      // Modo desenvolvimento - apenas retorna sucesso
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sent: false, 
          message: 'Magic link gerado (dev). Veja o console.',
          token: token // Apenas em desenvolvimento
        })
      };
    } else {
      // TODO: Implementar envio de e-mail real
      // await sendEmail({
      //   to: email,
      //   subject: 'Seu link de acesso FLOWPay',
      //   html: generateEmailTemplate(token)
      // });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sent: true, 
          message: 'Link enviado para seu e-mail' 
        })
      };
    }

  } catch (error) {
    console.error('Erro ao processar magic link:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor' 
      })
    };
  }
};
