// 🚀 FLOWPay - Create PIX Charge Function
// Integração com Woovi/OpenPix API

const crypto = require('crypto');
const { applyRateLimit } = require('./rate-limiter');
const { getCorsHeaders, secureLog, logPixTransaction, logAPIError } = require('./config');
const { 
  withErrorHandling, 
  handleExternalAPIError,
  ERROR_TYPES,
  errorHandler
} = require('./error-handler');
const { validateJSON, sanitizeData } = require('./validation-middleware');

// Função principal de criação de cobrança PIX
async function createPixChargeHandler(event, context) {
  // Aplicar rate limiting
  const rateLimitResult = applyRateLimit('create-pix-charge')(event, context);
  if (rateLimitResult) {
    return rateLimitResult;
  }
  
  // Obter headers CORS da configuração centralizada
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
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    // Validar e sanitizar dados de entrada
    const { data: requestBody } = validateJSON('createPixCharge')(event, context);
    const sanitizedData = sanitizeData(requestBody);
    
    const { wallet, valor, moeda, id_transacao } = sanitizedData;
    const validatedValue = parseFloat(valor);

    // Configuração da Woovi API
    const WOOVI_API_KEY = process.env.WOOVI_API_KEY;
    const WOOVI_API_URL = process.env.WOOVI_API_URL || 'https://api.woovi.com';
    
    if (!WOOVI_API_KEY) {
      throw new Error('Configuração da API Woovi não encontrada');
    }

    // Extrair apenas o Client ID da API Key (remover Client Secret se presente)
    const cleanApiKey = WOOVI_API_KEY.split(':')[0];
    secureLog('info', 'API Key processada para Woovi', {
      keyPrefix: cleanApiKey.substring(0, 20) + '...',
      hasSecret: WOOVI_API_KEY.includes(':')
    });

    // Criar cobrança PIX via Woovi API
    const pixData = {
      correlationID: id_transacao,
      value: validatedValue * 100, // Woovi espera valor em centavos
      expiresIn: 3600, // Expira em 1 hora
      additionalInfo: [
        {
          key: 'wallet',
          value: wallet
        },
        {
          key: 'moeda',
          value: moeda
        }
      ]
    };

    logPixTransaction('info', 'Iniciando criação de cobrança PIX', {
      id: id_transacao,
      amount: validatedValue,
      currency: moeda,
      wallet: wallet
    });

    // Chamada para API da Woovi
    const wooviResponse = await fetch(`${WOOVI_API_URL}/api/v1/charge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pixData)
    });

    if (!wooviResponse.ok) {
      // Tentar parsear resposta como JSON primeiro
      let errorResponse = null;
      let errorText = '';
      
      try {
        errorText = await wooviResponse.text();
        errorResponse = JSON.parse(errorText);
      } catch (e) {
        // Se não for JSON, usar texto como está
        errorResponse = errorText;
      }
      
      logAPIError('error', 'Erro na API Woovi', {
        service: 'Woovi',
        statusCode: wooviResponse.status,
        endpoint: '/api/v1/charge',
        method: 'POST',
        response: errorText,
        parsedResponse: errorResponse
      });
      
      throw handleExternalAPIError('Woovi', wooviResponse.status, errorResponse, null);
    }

    const wooviData = await wooviResponse.json();
    logPixTransaction('info', 'Cobrança PIX criada com sucesso', {
      id: wooviData.correlationID || id_transacao,
      status: wooviData.status || 'created',
      amount: wooviData.value ? wooviData.value / 100 : validatedValue,
      currency: moeda,
      qrCode: wooviData.qrCode ? '[GENERATED]' : 'none',
      brCode: wooviData.brCode ? '[GENERATED]' : 'none'
    });

    // Retornar dados da cobrança
    const response = {
      success: true,
      pix_data: {
        qr_code: wooviData.qrCodeImage,
        br_code: wooviData.brCode,
        correlation_id: wooviData.correlationID,
        value: wooviData.value / 100, // Converter de volta para reais
        expires_at: wooviData.expiresAt,
        status: wooviData.status
      },
      wallet,
      moeda,
      id_transacao
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    return errorHandler(error, event, context);
  }
}

// Exportar handler com tratamento de erro
exports.handler = withErrorHandling(createPixChargeHandler);


