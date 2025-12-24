// 🚀 FLOWPay - Webhook Handler Function
// Recebe webhooks da Woovi/OpenPix e processa confirmações de pagamento

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
    'Access-Control-Allow-Headers': 'Content-Type, x-woovi-signature',
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

  try {
    // Verificar método HTTP
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    // Verificar assinatura HMAC da Woovi
    const wooviSignature = event.headers['x-woovi-signature'];
    const webhookSecret = process.env.WOOVI_WEBHOOK_SECRET;
    
    if (!wooviSignature || !webhookSecret) {
      console.error('❌ Assinatura ou secret não encontrados');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Assinatura inválida' })
      };
    }

    // Calcular HMAC para verificar autenticidade
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(event.body, 'utf8')
      .digest('hex');

    if (wooviSignature !== expectedSignature) {
      console.error('❌ Assinatura HMAC inválida');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Assinatura inválida' })
      };
    }

    // Parse do webhook
    const webhookData = JSON.parse(event.body || '{}');
    console.log('🔄 Webhook recebido da Woovi:', webhookData);

    // Verificar se é uma confirmação de pagamento
    if (webhookData.event === 'charge.paid' || webhookData.event === 'charge.confirmed') {
      const charge = webhookData.data;
      
      console.log('💰 Pagamento PIX confirmado:', {
        correlation_id: charge.correlationID,
        value: charge.value,
        status: charge.status,
        paid_at: charge.paidAt
      });

      // Extrair informações adicionais
      const wallet = charge.additionalInfo?.find(info => info.key === 'wallet')?.value;
      const moeda = charge.additionalInfo?.find(info => info.key === 'moeda')?.value;

      if (wallet) {
        console.log('🎯 Wallet para conversão:', wallet);
        
        // TODO: Implementar conversão para cripto
        // 1. Verificar saldo da conta Woovi
        // 2. Fazer transferência para wallet do usuário
        // 3. Registrar transação no blockchain
        
        // Por enquanto, apenas log
        console.log('🚀 Iniciando conversão PIX -> Crypto para wallet:', wallet);
      }

      // Retornar sucesso
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Webhook processado com sucesso',
          charge_id: charge.correlationID,
          status: charge.status
        })
      };
    }

    // Outros tipos de webhook
    console.log('ℹ️ Webhook não relacionado a pagamento:', webhookData.event);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Webhook recebido',
        event: webhookData.event
      })
    };

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    
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
