// 🚀 FLOWPay - Crypto Processor Function
// Orquestra o fluxo completo: recebe valor, converte fiat → USDT, envia para wallet

const { getCorsHeaders, secureLog, logPixTransaction } = require('./config');
const { applyRateLimit } = require('./rate-limiter');
const { validateJSON, sanitizeData } = require('./validation-middleware');
const { withErrorHandling, ERROR_TYPES } = require('./error-handler');

// Importar serviços do núcleo cripto
const { getLiquidityProvider } = require('../../services/crypto/liquidity-provider');
const { getUSDTTransfer } = require('../../services/crypto/usdt-transfer');
const { getWalletRegistry } = require('../../services/crypto/wallet-registry');

/**
 * Processa conversão e transferência cripto
 * Fluxo: Recebe valor BRL → Converte para USDT → Envia para wallet
 */
async function processCryptoConversion(event, context) {
  // Aplicar rate limiting
  const rateLimitResult = applyRateLimit('crypto-processor')(event, context);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const headers = getCorsHeaders(event);

  // Handle preflight
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

    // Validar e sanitizar dados
    const { data: requestBody } = validateJSON('processCryptoConversion')(event, context);
    const sanitizedData = sanitizeData(requestBody);

    const {
      userId,
      walletAddress,
      amountBRL,
      network = 'ethereum',
      correlationId,
      pixChargeId
    } = sanitizedData;

    // Validações obrigatórias
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    if (!walletAddress) {
      throw new Error('walletAddress é obrigatório');
    }

    if (!amountBRL || amountBRL <= 0) {
      throw new Error('amountBRL deve ser maior que zero');
    }

    if (!correlationId && !pixChargeId) {
      throw new Error('correlationId ou pixChargeId é obrigatório');
    }

    const transactionId = correlationId || pixChargeId;

    secureLog('info', 'Iniciando processamento cripto', {
      userId: '[REDACTED]',
      walletAddress: maskAddress(walletAddress),
      amountBRL,
      network,
      transactionId
    });

    // 1. Validar/Registrar wallet do usuário
    const walletRegistry = getWalletRegistry();
    let wallet = walletRegistry.getWalletByAddress(walletAddress);

    if (!wallet) {
      // Registrar wallet automaticamente
      const registerResult = await walletRegistry.registerWallet(
        userId,
        walletAddress,
        network,
        { label: 'Wallet automática', verified: false }
      );
      wallet = registerResult.wallet;
      secureLog('info', 'Wallet registrada automaticamente', {
        walletId: wallet.id,
        address: maskAddress(walletAddress)
      });
    } else if (wallet.userId !== userId) {
      throw new Error('Wallet não pertence ao usuário');
    }

    // 2. Converter Fiat → USDT
    const liquidityProvider = getLiquidityProvider();
    const conversionResult = await liquidityProvider.convertFiatToUSDT(
      amountBRL,
      userId,
      transactionId
    );

    secureLog('info', 'Conversão Fiat → USDT concluída', {
      conversionId: conversionResult.conversionId,
      amountUSDT: conversionResult.to.amount,
      transactionId
    });

    // 3. Verificar disponibilidade de liquidez
    const liquidityCheck = await liquidityProvider.checkLiquidity(conversionResult.to.amount);
    if (!liquidityCheck.available) {
      throw new Error('Liquidez insuficiente para a transação');
    }

    // 4. Transferir USDT para wallet do usuário
    const usdtTransfer = getUSDTTransfer();
    const transferResult = await usdtTransfer.transferUSDT(
      userId,
      walletAddress,
      conversionResult.to.amount,
      network,
      transactionId
    );

    secureLog('info', 'Processamento cripto concluído com sucesso', {
      transactionId,
      conversionId: conversionResult.conversionId,
      txHash: transferResult.transaction.hash,
      amountUSDT: conversionResult.to.amount
    });

    // Retornar resultado completo
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction: {
          id: transactionId,
          conversion: {
            id: conversionResult.conversionId,
            from: conversionResult.from,
            to: conversionResult.to,
            rate: conversionResult.rate,
            fees: conversionResult.fees
          },
          transfer: transferResult.transaction,
          wallet: {
            address: maskAddress(walletAddress),
            network,
            label: wallet.label
          },
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    secureLog('error', 'Erro ao processar conversão cripto', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      })
    };
  }
}

/**
 * Mascara endereço para logs
 */
function maskAddress(address) {
  if (!address || address.length < 10) {
    return '[REDACTED]';
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Exportar handler com tratamento de erros
exports.handler = withErrorHandling(processCryptoConversion, {
  errorType: ERROR_TYPES.INTERNAL_ERROR,
  logError: true
});

