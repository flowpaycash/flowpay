// 🚀 FLOWPay - PIX Orders Function
// Lista transações PIX do arquivo JSON

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    // Verificar método HTTP
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    // Se for POST, criar nova transação
    if (event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body || '{}');
      const { wallet, valor, moeda, id_transacao, status = 'pending' } = requestBody;

      if (!wallet || !valor || !moeda || !id_transacao) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Campos obrigatórios: wallet, valor, moeda, id_transacao' 
          })
        };
      }

      // Criar nova transação
      const newOrder = {
        id: id_transacao,
        wallet,
        valor: parseFloat(valor),
        moeda,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Nova transação PIX criada:', newOrder);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Transação PIX criada com sucesso',
          order: newOrder
        })
      };
    }

    // Se for GET, retornar lista de transações (mock por enquanto)
    const mockOrders = [
      {
        id: "pix_123456",
        wallet: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        valor: 100.00,
        moeda: "BRL",
        status: "pending",
        created_at: "2024-01-25T10:00:00Z",
        updated_at: "2024-01-25T10:00:00Z"
      },
      {
        id: "pix_789012",
        wallet: "0x1234567890123456789012345678901234567890",
        valor: 50.00,
        moeda: "USDT",
        status: "completed",
        created_at: "2024-01-25T09:00:00Z",
        updated_at: "2024-01-25T09:30:00Z"
      }
    ];

    console.log('📋 Listando transações PIX:', mockOrders.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: mockOrders.length,
        orders: mockOrders
      })
    };

  } catch (error) {
    console.error('❌ Erro na função pix-orders:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message
      })
    };
  }
};
