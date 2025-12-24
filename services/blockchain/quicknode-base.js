// FLOWPay - QuickNode Base (Proof Layer)
// Endpoint Base (EVM) para escrita de provas on-chain
// Função: registrar fatos, confirmar estados, auditar

const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');
const { secureLog } = require('../../netlify/functions/config');

class QuickNodeBase {
  constructor() {
    // RPC URL do endpoint Base
    this.rpcUrl = process.env.QUICKNODE_BASE_RPC || '';

    if (!this.rpcUrl) {
      secureLog('warn', 'QUICKNODE_BASE_RPC não configurado - provas on-chain desabilitadas');
    }

    // Wallet para assinar transações de prova (pode ser vazia, só para assinar)
    this.writerWallet = {
      address: process.env.BLOCKCHAIN_WRITER_ADDRESS || '',
      privateKey: process.env.BLOCKCHAIN_WRITER_PRIVATE_KEY || ''
    };

    // Validar formato do endereço da wallet (se configurado)
    if (this.writerWallet.address) {
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(this.writerWallet.address)) {
        secureLog('warn', 'Endereço da wallet de escrita inválido. Verifique BLOCKCHAIN_WRITER_ADDRESS');
      }
    }

    // Clientes cache
    this.publicClient = null;
    this.walletClient = null;
  }

  /**
   * Obtém cliente público (read-only) para Base
   * @returns {object} Cliente público viem
   */
  getPublicClient() {
    if (this.publicClient) {
      return this.publicClient;
    }

    if (!this.rpcUrl) {
      throw new Error('QUICKNODE_BASE_RPC não configurado');
    }

    this.publicClient = createPublicClient({
      chain: base,
      transport: http(this.rpcUrl)
    });

    secureLog('info', 'Cliente QuickNode Base (proof) criado', {
      rpcUrl: this.maskUrl(this.rpcUrl)
    });

    return this.publicClient;
  }

  /**
   * Obtém cliente de wallet (read-write) para Base
   * @returns {object} Cliente wallet viem
   */
  getWalletClient() {
    if (this.walletClient) {
      return this.walletClient;
    }

    if (!this.rpcUrl) {
      throw new Error('QUICKNODE_BASE_RPC não configurado');
    }

    if (!this.writerWallet.privateKey) {
      throw new Error('BLOCKCHAIN_WRITER_PRIVATE_KEY não configurada');
    }

    const account = privateKeyToAccount(this.writerWallet.privateKey);

    this.walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(this.rpcUrl)
    });

    secureLog('info', 'Cliente QuickNode Base (wallet) criado', {
      address: this.maskAddress(account.address),
      rpcUrl: this.maskUrl(this.rpcUrl)
    });

    return this.walletClient;
  }

  /**
   * Verifica status de uma transação na Base
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
        network: 'base',
        chainId: 8453,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar status da transação na Base', {
        error: error.message,
        txHash: this.maskAddress(txHash)
      });
      throw error;
    }
  }

  /**
   * Lê uma prova on-chain
   * @param {string} txHash - Hash da transação de prova
   * @returns {object} Dados da prova
   */
  async readProof(txHash) {
    try {
      const status = await this.getTransactionStatus(txHash);

      if (status.status !== 'confirmed') {
        throw new Error('Transação não confirmada');
      }

      return {
        txHash,
        status: 'confirmed',
        blockNumber: status.blockNumber,
        network: 'base',
        chainId: 8453
      };

    } catch (error) {
      secureLog('error', 'Erro ao ler prova on-chain', {
        error: error.message,
        txHash: this.maskAddress(txHash)
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
let baseInstance = null;

function getQuickNodeBase() {
  if (!baseInstance) {
    baseInstance = new QuickNodeBase();
  }
  return baseInstance;
}

module.exports = {
  QuickNodeBase,
  getQuickNodeBase
};

