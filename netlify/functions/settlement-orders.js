// 📋 FLOWPay - Settlement Orders Function
// Gerencia ordens de liquidação pendentes (liquidação assistida)

const { getCorsHeaders, secureLog } = require('./config');
const { applyRateLimit } = require('./rate-limiter');
const { getLiquidityProvider } = require('../../services/crypto/liquidity-provider');
const { getUSDTTransfer } = require('../../services/crypto/usdt-transfer');
const { getWalletRegistry } = require('../../services/crypto/wallet-registry');
const { getWriteProof } = require('../../services/blockchain/write-proof');

// Storage em memória (em produção, usar banco de dados)
// Estrutura: Map<orderId, settlementOrder>
const settlementOrders = new Map();

/**
 * Lista ordens de liquidação pendentes
 */
async function listSettlementOrders(event, context) {
  const rateLimitResult = applyRateLimit('settlement-orders')(event, context);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const headers = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
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

    // Filtrar apenas pendentes
    const pendingOrders = Array.from(settlementOrders.values())
      .filter(order => order.status === 'PENDING_REVIEW')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    secureLog('info', 'Listando ordens de liquidação pendentes', {
      count: pendingOrders.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orders: pendingOrders,
        count: pendingOrders.length
      })
    };

  } catch (error) {
    secureLog('error', 'Erro ao listar ordens de liquidação', {
      error: error.message
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

/**
 * Executa ordem de liquidação (após aprovação humana)
 */
async function executeSettlementOrder(event, context) {
  const rateLimitResult = applyRateLimit('settlement-orders')(event, context);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const headers = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    const requestBody = JSON.parse(event.body || '{}');
    const { orderId, walletAddress, network = 'ethereum' } = requestBody;

    if (!orderId) {
      throw new Error('orderId é obrigatório');
    }

    if (!walletAddress) {
      throw new Error('walletAddress é obrigatório');
    }

    // Buscar ordem
    const order = settlementOrders.get(orderId);
    if (!order) {
      throw new Error('Ordem não encontrada');
    }

    if (order.status !== 'PENDING_REVIEW') {
      throw new Error(`Ordem não está pendente. Status atual: ${order.status}`);
    }

    secureLog('info', 'Executando ordem de liquidação', {
      orderId,
      walletAddress: maskAddress(walletAddress),
      network
    });

    // 1. Validar/Registrar wallet
    const walletRegistry = getWalletRegistry();
    let wallet = walletRegistry.getWalletByAddress(walletAddress);

    if (!wallet) {
      const registerResult = await walletRegistry.registerWallet(
        order.userId,
        walletAddress,
        network,
        { label: 'Wallet liquidação', verified: false }
      );
      wallet = registerResult.wallet;
    }

    // 2. Executar liquidação (conversão + transferência)
    const liquidityProvider = getLiquidityProvider();
    const settlement = await liquidityProvider.settle({
      amountBRL: order.amountBRL,
      userId: order.userId,
      correlationId: order.correlationId,
      target: order.targetAsset,
      strategy: 'auto'
    });

    // 3. Transferir USDT
    const usdtTransfer = getUSDTTransfer();
    const transferResult = await usdtTransfer.transferUSDT(
      order.userId,
      walletAddress,
      settlement.to.amount,
      network,
      order.correlationId
    );

    // 4. Registrar prova on-chain
    try {
      const writeProof = getWriteProof();
      await writeProof.writeProof({
        pixChargeId: order.correlationId,
        txHash: transferResult.transaction.hash,
        recipientWallet: walletAddress,
        amountBRL: order.amountBRL,
        amountUSDT: settlement.to.amount,
        network,
        metadata: {
          orderId,
          executedBy: 'admin',
          executedAt: new Date().toISOString()
        }
      });
    } catch (proofError) {
      // Não falhar se prova falhar
      secureLog('warn', 'Erro ao registrar prova (não crítico)', {
        error: proofError.message,
        orderId
      });
    }

    // 5. Atualizar status da ordem
    order.status = 'EXECUTED';
    order.executedAt = new Date().toISOString();
    order.transferTxHash = transferResult.transaction.hash;
    order.amountUSDT = settlement.to.amount;
    settlementOrders.set(orderId, order);

    secureLog('info', 'Ordem de liquidação executada com sucesso', {
      orderId,
      txHash: transferResult.transaction.hash
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          ...order,
          userId: '[REDACTED]'
        },
        transfer: transferResult.transaction
      })
    };

  } catch (error) {
    secureLog('error', 'Erro ao executar ordem de liquidação', {
      error: error.message,
      orderId: requestBody?.orderId
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

/**
 * Cria nova ordem de liquidação (chamado pelo webhook)
 */
function createSettlementOrder(orderData) {
  const order = {
    ...orderData,
    status: 'PENDING_REVIEW',
    createdAt: new Date().toISOString()
  };

  settlementOrders.set(order.orderId, order);

  secureLog('info', 'Ordem de liquidação criada', {
    orderId: order.orderId,
    correlationId: order.correlationId
  });

  return order;
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

// Exportar handler baseado no método
exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    return await listSettlementOrders(event, context);
  } else if (event.httpMethod === 'POST') {
    return await executeSettlementOrder(event, context);
  } else {
    return {
      statusCode: 405,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }
};

// Exportar função para criar ordem (usada pelo webhook)
exports.createSettlementOrder = createSettlementOrder;

