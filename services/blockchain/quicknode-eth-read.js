// FLOWPay - QuickNode Ethereum (Read-Only)
// Endpoint Ethereum Mainnet para leitura e compatibilidade
// Função: ler contratos, auditorias externas, compatibilidade futura
// NÃO usar para escrita frequente no v0

const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');
const { secureLog } = require('../utils/config');

class QuickNodeEthRead {
  constructor() {
    // RPC URL do endpoint Ethereum (read-only)
    this.rpcUrl = process.env.QUICKNODE_ETHEREUM_RPC || '';

    if (!this.rpcUrl) {
      secureLog('warn', 'QUICKNODE_ETHEREUM_RPC não configurado - leitura Ethereum desabilitada');
    }

    // Cliente cache
    this.publicClient = null;
  }

  /**
   * Obtém cliente público (read-only) para Ethereum
   * @returns {object} Cliente público viem
   */
  getPublicClient() {
    if (this.publicClient) {
      return this.publicClient;
    }

    if (!this.rpcUrl) {
      throw new Error('QUICKNODE_ETHEREUM_RPC não configurado');
    }

    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http(this.rpcUrl)
    });

    secureLog('info', 'Cliente QuickNode Ethereum (read-only) criado', {
      rpcUrl: this.maskUrl(this.rpcUrl)
    });

    return this.publicClient;
  }

  /**
   * Verifica status de uma transação no Ethereum
   * @param {string} txHash - Hash da transação
   * @returns {object} Status da transação
   */
  async getTransactionStatus(txHash) {
    try {
      const client = this.getPublicClient();

      const receipt = await client.getTransactionReceipt({ hash: txHash });

      return {
        hash: txHash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber.toString(),
        confirmations: receipt.status === 'success' ? 1 : 0,
        network: 'ethereum',
        chainId: 1,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar status da transação no Ethereum', {
        error: error.message,
        txHash: this.maskAddress(txHash)
      });
      throw error;
    }
  }

  /**
   * Lê código de um contrato
   * @param {string} address - Endereço do contrato
   * @returns {string} Bytecode do contrato
   */
  async readContract(address) {
    try {
      const client = this.getPublicClient();
      const code = await client.getBytecode({ address });
      return code;
    } catch (error) {
      secureLog('error', 'Erro ao ler contrato no Ethereum', {
        error: error.message,
        address: this.maskAddress(address)
      });
      throw error;
    }
  }

  /**
   * Mascara URL para logs
   */
  maskUrl(url) {
    if (!url) return '[REDACTED]';

    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname.substring(0, 10)}...${urlObj.pathname}`;
    } catch {
      return '[REDACTED]';
    }
  }

  /**
   * Mascara endereço para logs
   */
  maskAddress(address) {
    if (!address || address.length < 10) {
      return '[REDACTED]';
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

// Singleton instance
let ethReadInstance = null;

function getQuickNodeEthRead() {
  if (!ethReadInstance) {
    ethReadInstance = new QuickNodeEthRead();
  }
  return ethReadInstance;
}

module.exports = {
  QuickNodeEthRead,
  getQuickNodeEthRead
};

