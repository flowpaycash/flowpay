// 🔗 FLOWPay - QuickNode Client
// Cliente para conexão com blockchains via QuickNode RPC

const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { mainnet, polygon, bsc, arbitrum, optimism } = require('viem/chains');
const { secureLog } = require('../../netlify/functions/config');

class QuickNodeClient {
  constructor() {
    // Configurações QuickNode por rede
    this.rpcUrls = {
      ethereum: process.env.QUICKNODE_ETHEREUM_URL || '',
      polygon: process.env.QUICKNODE_POLYGON_URL || '',
      bsc: process.env.QUICKNODE_BSC_URL || '',
      arbitrum: process.env.QUICKNODE_ARBITRUM_URL || '',
      optimism: process.env.QUICKNODE_OPTIMISM_URL || ''
    };

    // Wallet para assinar transações (apenas para escrita de eventos)
    this.writerWallet = {
      address: process.env.BLOCKCHAIN_WRITER_ADDRESS || '',
      privateKey: process.env.BLOCKCHAIN_WRITER_PRIVATE_KEY || ''
    };

    // Mapeamento de chains
    this.chains = {
      ethereum: mainnet,
      polygon: polygon,
      bsc: bsc,
      arbitrum: arbitrum,
      optimism: optimism
    };

    // Clientes cache
    this.clients = {};
  }

  /**
   * Obtém cliente público (read-only) para uma rede
   * @param {string} network - Nome da rede (ethereum, polygon, bsc, etc)
   * @returns {object} Cliente público viem
   */
  getPublicClient(network = 'ethereum') {
    const networkKey = network.toLowerCase();
    
    if (this.clients[`public_${networkKey}`]) {
      return this.clients[`public_${networkKey}`];
    }

    const chain = this.chains[networkKey];
    if (!chain) {
      throw new Error(`Rede não suportada: ${network}. Suportadas: ${Object.keys(this.chains).join(', ')}`);
    }

    const rpcUrl = this.rpcUrls[networkKey];
    if (!rpcUrl) {
      throw new Error(`QuickNode URL não configurada para ${network}. Configure QUICKNODE_${networkKey.toUpperCase()}_URL`);
    }

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    this.clients[`public_${networkKey}`] = client;
    
    secureLog('info', 'Cliente QuickNode público criado', {
      network,
      rpcUrl: this.maskUrl(rpcUrl)
    });

    return client;
  }

  /**
   * Obtém cliente de wallet (read-write) para uma rede
   * @param {string} network - Nome da rede
   * @returns {object} Cliente wallet viem
   */
  getWalletClient(network = 'ethereum') {
    const networkKey = network.toLowerCase();
    
    if (this.clients[`wallet_${networkKey}`]) {
      return this.clients[`wallet_${networkKey}`];
    }

    if (!this.writerWallet.privateKey) {
      throw new Error('BLOCKCHAIN_WRITER_PRIVATE_KEY não configurada');
    }

    const chain = this.chains[networkKey];
    if (!chain) {
      throw new Error(`Rede não suportada: ${network}`);
    }

    const rpcUrl = this.rpcUrls[networkKey];
    if (!rpcUrl) {
      throw new Error(`QuickNode URL não configurada para ${network}`);
    }

    const account = privateKeyToAccount(this.writerWallet.privateKey);

    const client = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });

    this.clients[`wallet_${networkKey}`] = client;
    
    secureLog('info', 'Cliente QuickNode wallet criado', {
      network,
      address: this.maskAddress(account.address),
      rpcUrl: this.maskUrl(rpcUrl)
    });

    return client;
  }

  /**
   * Verifica status de uma transação
   * @param {string} txHash - Hash da transação
   * @param {string} network - Nome da rede
   * @returns {object} Status da transação
   */
  async getTransactionStatus(txHash, network = 'ethereum') {
    try {
      const client = this.getPublicClient(network);

      const receipt = await client.getTransactionReceipt({ hash: txHash });

      return {
        hash: txHash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber.toString(),
        confirmations: receipt.status === 'success' ? 1 : 0,
        network,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar status da transação', {
        error: error.message,
        txHash: this.maskAddress(txHash),
        network
      });
      throw error;
    }
  }

  /**
   * Obtém informações de um bloco
   * @param {string|number} blockNumber - Número do bloco ou 'latest'
   * @param {string} network - Nome da rede
   * @returns {object} Informações do bloco
   */
  async getBlock(blockNumber = 'latest', network = 'ethereum') {
    try {
      const client = this.getPublicClient(network);

      const block = await client.getBlock({ blockNumber });

      return {
        number: block.number.toString(),
        hash: block.hash,
        timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        transactions: block.transactions.length,
        network
      };

    } catch (error) {
      secureLog('error', 'Erro ao obter bloco', {
        error: error.message,
        blockNumber,
        network
      });
      throw error;
    }
  }

  /**
   * Verifica se um endereço é um contrato
   * @param {string} address - Endereço para verificar
   * @param {string} network - Nome da rede
   * @returns {boolean} True se é contrato
   */
  async isContract(address, network = 'ethereum') {
    try {
      const client = this.getPublicClient(network);

      const code = await client.getBytecode({ address });

      return code && code !== '0x';

    } catch (error) {
      secureLog('error', 'Erro ao verificar se é contrato', {
        error: error.message,
        address: this.maskAddress(address),
        network
      });
      return false;
    }
  }

  /**
   * Mascara URL para logs
   * @param {string} url - URL completa
   * @returns {string} URL mascarada
   */
  maskUrl(url) {
    if (!url) return '[REDACTED]';
    
    try {
      const urlObj = new URL(url);
      const masked = `${urlObj.protocol}//${urlObj.hostname.substring(0, 10)}...${urlObj.pathname}`;
      return masked;
    } catch {
      return '[REDACTED]';
    }
  }

  /**
   * Mascara endereço para logs
   * @param {string} address - Endereço completo
   * @returns {string} Endereço mascarado
   */
  maskAddress(address) {
    if (!address || address.length < 10) {
      return '[REDACTED]';
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

// Singleton instance
let clientInstance = null;

function getQuickNodeClient() {
  if (!clientInstance) {
    clientInstance = new QuickNodeClient();
  }
  return clientInstance;
}

module.exports = {
  QuickNodeClient,
  getQuickNodeClient
};

