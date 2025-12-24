// 🔗 FLOWPay - QuickNode Integration Service
// Integra todas as APIs REST do QuickNode para uso no FlowPay

const { getQuickNodeREST } = require('./quicknode-rest');
const { getWriteProof } = require('./write-proof');
const { secureLog } = require('../../netlify/functions/config');

class QuickNodeIntegration {
  constructor() {
    this.rest = getQuickNodeREST();
    this.writeProof = getWriteProof();
  }

  /**
   * Armazena prova completa no IPFS e registra referência on-chain
   * @param {object} proofData - Dados completos da prova
   * @returns {object} Hash IPFS e tx hash on-chain
   */
  async storeProofWithIPFS(proofData) {
    try {
      // 1. Armazenar metadados completos no IPFS
      const ipfsResult = await this.rest.storeInIPFS({
        ...proofData,
        storedAt: new Date().toISOString(),
        service: 'flowpay'
      }, `proof_${proofData.pixChargeId}.json`);

      // 2. Registrar referência on-chain (apenas hash IPFS)
      const onChainResult = await this.writeProof.writeProof({
        ...proofData,
        metadata: {
          ...proofData.metadata,
          ipfsHash: ipfsResult.ipfsHash,
          ipfsUrl: ipfsResult.ipfsUrl
        }
      });

      secureLog('info', 'Prova armazenada no IPFS e registrada on-chain', {
        ipfsHash: ipfsResult.ipfsHash,
        txHash: onChainResult.proof.txHash
      });

      return {
        success: true,
        ipfs: ipfsResult,
        onChain: onChainResult.proof
      };

    } catch (error) {
      secureLog('error', 'Erro ao armazenar prova com IPFS', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cache de ordens de liquidação no KV
   * @param {string} orderId - ID da ordem
   * @param {object} orderData - Dados da ordem
   * @param {number} ttl - Time to live em segundos (24 horas padrão)
   * @returns {object} Resultado
   */
  async cacheSettlementOrder(orderId, orderData, ttl = 86400) {
    try {
      const key = `settlement_order:${orderId}`;
      
      await this.rest.setKV(key, orderData, ttl);

      secureLog('info', 'Ordem de liquidação armazenada no KV', {
        orderId,
        ttl
      });

      return {
        success: true,
        key,
        orderId
      };

    } catch (error) {
      secureLog('error', 'Erro ao armazenar ordem no KV', {
        error: error.message,
        orderId
      });
      throw error;
    }
  }

  /**
   * Recupera ordem de liquidação do cache
   * @param {string} orderId - ID da ordem
   * @returns {object} Dados da ordem ou null
   */
  async getCachedSettlementOrder(orderId) {
    try {
      const key = `settlement_order:${orderId}`;
      const result = await this.rest.getKV(key);

      if (!result.found) {
        return null;
      }

      return result.value;

    } catch (error) {
      secureLog('error', 'Erro ao recuperar ordem do KV', {
        error: error.message,
        orderId
      });
      return null;
    }
  }

  /**
   * Configura monitoramento de transações USDT
   * Cria stream para monitorar transferências em tempo real
   * @param {string} network - Rede blockchain
   * @returns {object} Stream configurado
   */
  async setupUSDTMonitoring(network = 'ethereum') {
    try {
      const result = await this.rest.monitorUSDTTransfers(null, network);

      secureLog('info', 'Monitoramento USDT configurado', {
        streamId: result.stream.id,
        network
      });

      return result;

    } catch (error) {
      secureLog('error', 'Erro ao configurar monitoramento USDT', {
        error: error.message,
        network
      });
      throw error;
    }
  }

  /**
   * Armazena histórico de transações no IPFS
   * Útil para backup e auditoria
   * @param {array} transactions - Array de transações
   * @returns {object} Hash IPFS
   */
  async archiveTransactions(transactions) {
    try {
      const archiveData = {
        transactions,
        archivedAt: new Date().toISOString(),
        count: transactions.length,
        service: 'flowpay'
      };

      const result = await this.rest.storeInIPFS(
        archiveData,
        `archive_${Date.now()}.json`
      );

      secureLog('info', 'Transações arquivadas no IPFS', {
        ipfsHash: result.ipfsHash,
        count: transactions.length
      });

      return result;

    } catch (error) {
      secureLog('error', 'Erro ao arquivar transações', {
        error: error.message
      });
      throw error;
    }
  }
}

// Singleton instance
let integrationInstance = null;

function getQuickNodeIntegration() {
  if (!integrationInstance) {
    integrationInstance = new QuickNodeIntegration();
  }
  return integrationInstance;
}

module.exports = {
  QuickNodeIntegration,
  getQuickNodeIntegration
};

