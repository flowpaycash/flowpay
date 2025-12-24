// 🔔 FLOWPay - QuickNode Webhook Handler
// Recebe eventos de webhooks do QuickNode (templates: evmContractEvents, evmWalletFilter, etc)

const { getCorsHeaders, secureLog } = require('./config');
const { getWriteProof } = require('../../services/blockchain/write-proof');
const { getWalletRegistry } = require('../../services/crypto/wallet-registry');

exports.handler = async (event, context) => {
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
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método não permitido' })
      };
    }

    // QuickNode envia eventos no formato:
    // {
    //   "data": [...eventos],
    //   "metadata": { webhookId, network, ... }
    // }
    const webhookPayload = JSON.parse(event.body || '{}');
    
    const { data = [], metadata = {} } = webhookPayload;
    
    secureLog('info', 'Webhook QuickNode recebido', {
      webhookId: metadata.webhookId,
      network: metadata.network,
      eventCount: data.length
    });

    // Processar cada evento
    for (const eventData of data) {
      await processQuickNodeEvent(eventData, metadata);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook processado',
        eventsProcessed: data.length
      })
    };

  } catch (error) {
    secureLog('error', 'Erro ao processar webhook QuickNode', {
      error: error.message,
      stack: error.stack
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
};

/**
 * Processa evento do QuickNode
 * Suporta diferentes tipos de eventos (Transfer, logs, etc)
 */
async function processQuickNodeEvent(eventData, metadata) {
  try {
    // QuickNode envia eventos em diferentes formatos dependendo do template
    // evmContractEvents: eventos de contratos
    // evmWalletFilter: transações de wallets específicas

    // Detectar tipo de evento
    if (eventData.event || eventData.logs) {
      // Evento de contrato (evmContractEvents)
      await handleContractEvent(eventData, metadata);
    } else if (eventData.transaction || eventData.hash) {
      // Transação de wallet (evmWalletFilter)
      await handleWalletTransaction(eventData, metadata);
    } else {
      secureLog('info', 'Formato de evento não reconhecido', {
        keys: Object.keys(eventData)
      });
    }

  } catch (error) {
    secureLog('error', 'Erro ao processar evento QuickNode', {
      error: error.message,
      eventData: JSON.stringify(eventData).substring(0, 200)
    });
  }
}

/**
 * Processa evento de contrato (evmContractEvents)
 * Exemplo: Transfer(address,address,uint256) do USDT
 */
async function handleContractEvent(eventData, metadata) {
  try {
    // Extrair dados do evento Transfer
    const event = eventData.event || eventData;
    const logs = eventData.logs || [];
    
    // Procurar evento Transfer
    const transferLog = logs.find(log => 
      log.topics && 
      log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    );

    if (!transferLog) {
      return; // Não é evento Transfer
    }

    // Decodificar dados do evento
    // topics[0] = event signature
    // topics[1] = from (indexed)
    // topics[2] = to (indexed)
    // data = value (uint256)
    const from = '0x' + transferLog.topics[1].slice(-40);
    const to = '0x' + transferLog.topics[2].slice(-40);
    const value = BigInt(transferLog.data || '0x0');
    const txHash = transferLog.transactionHash || eventData.transactionHash;
    const blockNumber = transferLog.blockNumber || eventData.blockNumber;

    secureLog('info', 'Transferência USDT detectada (QuickNode)', {
      from: maskAddress(from),
      to: maskAddress(to),
      value: value.toString(),
      txHash: maskAddress(txHash),
      blockNumber,
      network: metadata.network
    });

    // Verificar se o destinatário está no wallet registry
    const walletRegistry = getWalletRegistry();
    const walletInfo = await walletRegistry.getWallet(to, metadata.network || 'ethereum');

    if (walletInfo) {
      secureLog('info', 'Transferência para wallet registrada', {
        wallet: maskAddress(to),
        userId: walletInfo.userId
      });

      // TODO: Atualizar status da ordem de liquidação relacionada
      // Pode buscar por correlationId ou userId
    }

    // Registrar prova on-chain (se configurado)
    if (process.env.PROOF_CONTRACT_ADDRESS) {
      try {
        await getWriteProof().writeProof({
          eventType: 'USDT_TRANSFER',
          transactionHash: txHash,
          from,
          to,
          value: value.toString(),
          network: metadata.network || 'ethereum',
          metadata: {
            detectedBy: 'quicknode_webhook',
            blockNumber
          }
        });
      } catch (proofError) {
        secureLog('error', 'Erro ao registrar prova on-chain', {
          error: proofError.message
        });
      }
    }

  } catch (error) {
    secureLog('error', 'Erro ao processar evento de contrato', {
      error: error.message
    });
  }
}

/**
 * Processa transação de wallet (evmWalletFilter)
 * Monitora todas as transações de wallets específicas
 */
async function handleWalletTransaction(eventData, metadata) {
  try {
    const tx = eventData.transaction || eventData;
    const { from, to, hash, value, blockNumber } = tx;

    secureLog('info', 'Transação de wallet detectada (QuickNode)', {
      from: maskAddress(from),
      to: maskAddress(to),
      txHash: maskAddress(hash),
      value: value?.toString() || '0',
      blockNumber,
      network: metadata.network
    });

    // Verificar se é wallet registrada
    const walletRegistry = getWalletRegistry();
    
    if (from) {
      const fromWallet = await walletRegistry.getWallet(from, metadata.network || 'ethereum');
      if (fromWallet) {
        secureLog('info', 'Transação de wallet registrada (from)', {
          wallet: maskAddress(from),
          userId: fromWallet.userId
        });
      }
    }

    if (to) {
      const toWallet = await walletRegistry.getWallet(to, metadata.network || 'ethereum');
      if (toWallet) {
        secureLog('info', 'Transação para wallet registrada (to)', {
          wallet: maskAddress(to),
          userId: toWallet.userId
        });
      }
    }

  } catch (error) {
    secureLog('error', 'Erro ao processar transação de wallet', {
      error: error.message
    });
  }
}

/**
 * Mascara endereço
 */
function maskAddress(address) {
  if (!address || address.length < 10) {
    return '[REDACTED]';
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
