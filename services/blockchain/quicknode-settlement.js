// FLOWPay - QuickNode Settlement (USDT Layer)
// Endpoint Polygon OU BSC para liquidação USDT
// Função: enviar USDT, ler saldos, confirmar transferências

const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { polygon, bsc } = require('viem/chains');
const { secureLog } = require('../utils/config');

class QuickNodeSettlement {
  constructor() {
    // Escolher rede: polygon ou bsc (configurar no .env)
    this.settlementNetwork = (process.env.USDT_SETTLEMENT_NETWORK || 'polygon').toLowerCase();

    // RPC URLs por rede
    this.rpcUrls = {
      polygon: process.env.QUICKNODE_POLYGON_RPC || '',
      bsc: process.env.QUICKNODE_BSC_RPC || ''
    };

    // Endereços do contrato USDT por rede
    this.usdtContracts = {
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      bsc: '0x55d398326f99059fF775485246999027B3197955'
    };

    // Chains viem
    this.chains = {
      polygon,
      bsc
    };

    // Wallet do serviço para envio de USDT
    this.serviceWallet = {
      address: process.env.SERVICE_WALLET_ADDRESS || '',
      privateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || ''
    };

    // Validar configuração da rede de liquidação
    if (!this.rpcUrls[this.settlementNetwork]) {
      secureLog('warn', `RPC URL não configurada para rede ${this.settlementNetwork}. Configure QUICKNODE_${this.settlementNetwork.toUpperCase()}_RPC`);
    }

    // Clientes cache
    this.publicClient = null;
    this.walletClient = null;
  }

  /**
   * Obtém cliente público (read-only) para rede de liquidação
   * @returns {object} Cliente público viem
   */
  getPublicClient() {
    if (this.publicClient) {
      return this.publicClient;
    }

    const rpcUrl = this.rpcUrls[this.settlementNetwork];
    if (!rpcUrl) {
      throw new Error(`QUICKNODE_${this.settlementNetwork.toUpperCase()}_RPC não configurado`);
    }

    const chain = this.chains[this.settlementNetwork];
    if (!chain) {
      throw new Error(`Rede de liquidação não suportada: ${this.settlementNetwork}`);
    }

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    secureLog('info', 'Cliente QuickNode Settlement criado', {
      network: this.settlementNetwork,
      rpcUrl: this.maskUrl(rpcUrl)
    });

    return this.publicClient;
  }

  /**
   * Obtém cliente de wallet (read-write) para rede de liquidação
   * @returns {object} Cliente wallet viem
   */
  getWalletClient() {
    if (this.walletClient) {
      return this.walletClient;
    }

    if (!this.serviceWallet.privateKey) {
      throw new Error('SERVICE_WALLET_PRIVATE_KEY não configurada');
    }

    const rpcUrl = this.rpcUrls[this.settlementNetwork];
    if (!rpcUrl) {
      throw new Error(`QUICKNODE_${this.settlementNetwork.toUpperCase()}_RPC não configurado`);
    }

    const chain = this.chains[this.settlementNetwork];
    const account = privateKeyToAccount(this.serviceWallet.privateKey);

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });

    secureLog('info', 'Cliente QuickNode Settlement (wallet) criado', {
      network: this.settlementNetwork,
      address: this.maskAddress(account.address),
      rpcUrl: this.maskUrl(rpcUrl)
    });

    return this.walletClient;
  }

  /**
   * Obtém endereço do contrato USDT na rede de liquidação
   * @returns {string} Endereço do contrato USDT
   */
  getUSDTContractAddress() {
    return this.usdtContracts[this.settlementNetwork];
  }

  /**
   * Obtém chain ID da rede de liquidação
   * @returns {number} Chain ID
   */
  getChainId() {
    return this.chains[this.settlementNetwork].id;
  }

  /**
   * Obtém nome da rede de liquidação
   * @returns {string} Nome da rede
   */
  getNetwork() {
    return this.settlementNetwork;
  }

  /**
   * Verifica status de uma transação na rede de liquidação
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
        network: this.settlementNetwork,
        chainId: this.getChainId(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar status da transação de liquidação', {
        error: error.message,
        txHash: this.maskAddress(txHash),
        network: this.settlementNetwork
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
let settlementInstance = null;

function getQuickNodeSettlement() {
  if (!settlementInstance) {
    settlementInstance = new QuickNodeSettlement();
  }
  return settlementInstance;
}

module.exports = {
  QuickNodeSettlement,
  getQuickNodeSettlement
};

