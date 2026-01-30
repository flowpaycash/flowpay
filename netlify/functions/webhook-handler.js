// 🚀 FLOWPay - Webhook Handler Function
// Recebe webhooks da Woovi/OpenPix e processa confirmações de pagamento

const crypto = require('crypto');

/**
 * Mascara endereço para logs
 */
function maskAddress(address) {
  if (!address || address.length < 10) {
    return '[REDACTED]';
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

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
    // Usar timingSafeEqual para prevenir timing attacks
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const bodyString = event.body || '';
    hmac.update(bodyString, 'utf8');
    const expectedSignature = hmac.digest('hex');

    try {
      if (!crypto.timingSafeEqual(Buffer.from(wooviSignature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
        console.error('❌ Assinatura HMAC inválida (timing safe check failed)');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Assinatura inválida' })
        };
      }
    } catch (e) {
      console.error('❌ Erro na comparação de assinaturas:', e.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Erro de validação de assinatura' })
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
      const moeda = charge.additionalInfo?.find(info => info.key === 'moeda')?.value || 'USDT';
      const chainId = charge.additionalInfo?.find(info => info.key === 'chainId')?.value || '137'; // Polygon por padrão

      if (wallet) {
        console.log('🎯 Wallet para liquidação:', wallet);
        console.log('💰 Valor PIX confirmado:', charge.value);
        console.log('🪙 Moeda destino:', moeda);
        console.log('⛓️ Chain ID:', chainId);

        try {
          // LIQUIDAÇÃO ASSISTIDA: Criar ordem pendente (não executar automaticamente)
          console.log('🔄 PIX CONFIRMED - Criando ordem de liquidação...');

          // Importar serviços
          const { getLiquidityProvider } = require('../../services/crypto/liquidity-provider');
          const { createSettlementOrder } = require('./settlement-orders');

          // Extrair userId
          const userId = charge.additionalInfo?.find(info => info.key === 'userId')?.value ||
            charge.customer?.name ||
            `user_${charge.correlationID}`;

          const amountBRL = parseFloat(charge.value) / 100; // Converter centavos para reais

          // Criar ordem de liquidação (pendente de aprovação)
          const liquidityProvider = getLiquidityProvider();
          const orderResult = await liquidityProvider.createSettlementOrder({
            amountBRL,
            userId,
            correlationId: charge.correlationID,
            targetAsset: moeda || 'USDT'
          });

          // Registrar ordem no sistema
          const order = createSettlementOrder({
            orderId: orderResult.order.orderId,
            userId,
            correlationId: charge.correlationID,
            amountBRL,
            targetAsset: moeda || 'USDT',
            estimatedAmount: orderResult.order.estimatedAmount,
            estimatedRate: orderResult.order.estimatedRate,
            walletAddress: wallet,
            network: chainId === '1' ? 'ethereum' : chainId === '137' ? 'polygon' : 'bsc'
          });

          console.log('✅ Ordem de liquidação criada (pendente de revisão):', {
            orderId: order.orderId,
            correlationId: charge.correlationID,
            amountBRL,
            estimatedUSDT: orderResult.order.estimatedAmount
          });

          // Retornar sucesso (ordem criada, aguardando aprovação)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'PIX confirmado. Ordem de liquidação criada (pendente de aprovação)',
              charge_id: charge.correlationID,
              status: charge.status,
              settlement: {
                orderId: order.orderId,
                status: 'PENDING_REVIEW',
                amountBRL,
                estimatedAmount: orderResult.order.estimatedAmount,
                estimatedRate: orderResult.order.estimatedRate,
                wallet: maskAddress(wallet)
              }
            })
          };

        } catch (error) {
          console.error('❌ Erro ao criar ordem de liquidação:', error);

          // Retornar erro, mas manter o webhook como processado
          // (para evitar retentativas infinitas)
          return {
            statusCode: 200, // 200 para não gerar retentativas
            headers,
            body: JSON.stringify({
              success: false,
              message: 'PIX confirmado, mas falha ao criar ordem de liquidação',
              charge_id: charge.correlationID,
              status: charge.status,
              error: error.message
            })
          };
        }
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
