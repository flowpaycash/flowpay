// FLOWPay - Wallet Registry Service
// Gerencia o registro e validação de wallets de usuários

const crypto = require('crypto');
const { secureLog, redactSensitiveData } = require('../../netlify/functions/config');

class WalletRegistry {
  constructor() {
    // Em produção, usar banco de dados
    // Por enquanto, armazenamento em memória (será substituído)
    this.wallets = new Map();
    this.userWallets = new Map(); // userId -> [wallets]
  }

  /**
   * Registra uma nova wallet para um usuário
   * @param {string} userId - ID do usuário
   * @param {string} address - Endereço da wallet (0x...)
   * @param {string} network - Rede blockchain (ethereum, polygon, bsc, etc)
   * @param {object} metadata - Metadados opcionais (label, verified, etc)
   * @returns {object} Wallet registrada
   */
  async registerWallet(userId, address, network = 'ethereum', metadata = {}) {
    try {
      // Validações
      if (!userId || typeof userId !== 'string') {
        throw new Error('userId é obrigatório e deve ser string');
      }

      if (!address || typeof address !== 'string') {
        throw new Error('address é obrigatório e deve ser string');
      }

      // Validar formato de endereço Ethereum
      if (!this.isValidAddress(address)) {
        throw new Error('Endereço de wallet inválido');
      }

      // Validar rede
      const supportedNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'];
      if (!supportedNetworks.includes(network.toLowerCase())) {
        throw new Error(`Rede não suportada: ${network}. Suportadas: ${supportedNetworks.join(', ')}`);
      }

      // Verificar se wallet já existe
      const existingWallet = this.getWalletByAddress(address);
      if (existingWallet && existingWallet.userId !== userId) {
        throw new Error('Wallet já registrada para outro usuário');
      }

      // Criar registro de wallet
      const walletId = crypto.randomBytes(16).toString('hex');
      const wallet = {
        id: walletId,
        userId,
        address: address.toLowerCase(),
        network: network.toLowerCase(),
        label: metadata.label || `Wallet ${network}`,
        verified: metadata.verified || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        transactionCount: 0
      };

      // Armazenar
      this.wallets.set(walletId, wallet);

      // Indexar por usuário
      if (!this.userWallets.has(userId)) {
        this.userWallets.set(userId, []);
      }
      this.userWallets.get(userId).push(walletId);

      secureLog('info', 'Wallet registrada com sucesso', {
        walletId,
        userId: '[REDACTED]',
        address: this.maskAddress(address),
        network
      });

      return {
        success: true,
        wallet: this.sanitizeWallet(wallet)
      };

    } catch (error) {
      secureLog('error', 'Erro ao registrar wallet', {
        error: error.message,
        userId: '[REDACTED]',
        address: address ? this.maskAddress(address) : '[REDACTED]'
      });
      throw error;
    }
  }

  /**
   * Busca wallets de um usuário
   * @param {string} userId - ID do usuário
   * @returns {array} Lista de wallets do usuário
   */
  async getUserWallets(userId) {
    try {
      if (!userId) {
        throw new Error('userId é obrigatório');
      }

      const walletIds = this.userWallets.get(userId) || [];
      const wallets = walletIds
        .map(id => this.wallets.get(id))
        .filter(w => w !== undefined)
        .map(w => this.sanitizeWallet(w));

      secureLog('info', 'Wallets do usuário recuperadas', {
        userId: '[REDACTED]',
        count: wallets.length
      });

      return {
        success: true,
        wallets,
        count: wallets.length
      };

    } catch (error) {
      secureLog('error', 'Erro ao buscar wallets do usuário', {
        error: error.message,
        userId: '[REDACTED]'
      });
      throw error;
    }
  }

  /**
   * Busca wallet por endereço
   * @param {string} address - Endereço da wallet
   * @returns {object|null} Wallet encontrada ou null
   */
  getWalletByAddress(address) {
    if (!address) return null;

    const normalizedAddress = address.toLowerCase();

    for (const [id, wallet] of this.wallets.entries()) {
      if (wallet.address === normalizedAddress) {
        return wallet;
      }
    }

    return null;
  }

  /**
   * Verifica se uma wallet está registrada e pertence ao usuário
   * @param {string} userId - ID do usuário
   * @param {string} address - Endereço da wallet
   * @returns {boolean} True se wallet é válida para o usuário
   */
  async validateUserWallet(userId, address) {
    try {
      if (!userId || !address) {
        return false;
      }

      const wallet = this.getWalletByAddress(address);

      if (!wallet) {
        secureLog('warn', 'Wallet não encontrada', {
          userId: '[REDACTED]',
          address: this.maskAddress(address)
        });
        return false;
      }

      if (wallet.userId !== userId) {
        secureLog('warn', 'Wallet não pertence ao usuário', {
          userId: '[REDACTED]',
          address: this.maskAddress(address)
        });
        return false;
      }

      return true;

    } catch (error) {
      secureLog('error', 'Erro ao validar wallet do usuário', {
        error: error.message,
        userId: '[REDACTED]',
        address: address ? this.maskAddress(address) : '[REDACTED]'
      });
      return false;
    }
  }

  /**
   * Atualiza última utilização da wallet
   * @param {string} address - Endereço da wallet
   */
  async updateLastUsed(address) {
    try {
      const wallet = this.getWalletByAddress(address);
      if (wallet) {
        wallet.lastUsedAt = new Date().toISOString();
        wallet.transactionCount = (wallet.transactionCount || 0) + 1;
        wallet.updatedAt = new Date().toISOString();

        secureLog('info', 'Wallet atualizada', {
          address: this.maskAddress(address),
          transactionCount: wallet.transactionCount
        });
      }
    } catch (error) {
      secureLog('error', 'Erro ao atualizar wallet', {
        error: error.message,
        address: address ? this.maskAddress(address) : '[REDACTED]'
      });
    }
  }

  /**
   * Remove wallet do registro
   * @param {string} userId - ID do usuário
   * @param {string} address - Endereço da wallet
   * @returns {boolean} True se removida com sucesso
   */
  async removeWallet(userId, address) {
    try {
      const wallet = this.getWalletByAddress(address);

      if (!wallet || wallet.userId !== userId) {
        return false;
      }

      // Remover do índice de usuário
      const userWalletIds = this.userWallets.get(userId) || [];
      const filtered = userWalletIds.filter(id => id !== wallet.id);
      this.userWallets.set(userId, filtered);

      // Remover do registro principal
      this.wallets.delete(wallet.id);

      secureLog('info', 'Wallet removida', {
        userId: '[REDACTED]',
        address: this.maskAddress(address)
      });

      return true;

    } catch (error) {
      secureLog('error', 'Erro ao remover wallet', {
        error: error.message,
        userId: '[REDACTED]',
        address: address ? this.maskAddress(address) : '[REDACTED]'
      });
      return false;
    }
  }

  /**
   * Valida formato de endereço Ethereum
   * @param {string} address - Endereço para validar
   * @returns {boolean} True se válido
   */
  isValidAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }

    try {
      // Usar viem para validação robusta (incluindo checksum)
      const { isAddress } = require('viem');
      return isAddress(address);
    } catch (e) {
      // Fallback para regex básico se viem falhar
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      return ethAddressRegex.test(address);
    }
  }

  /**
   * Mascara endereço para logs (mostra apenas primeiros e últimos caracteres)
   * @param {string} address - Endereço completo
   * @returns {string} Endereço mascarado
   */
  maskAddress(address) {
    if (!address || address.length < 10) {
      return '[REDACTED]';
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Remove dados sensíveis da wallet antes de retornar
   * @param {object} wallet - Wallet completa
   * @returns {object} Wallet sanitizada
   */
  sanitizeWallet(wallet) {
    if (!wallet) return null;

    return {
      id: wallet.id,
      address: wallet.address,
      network: wallet.network,
      label: wallet.label,
      verified: wallet.verified,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      lastUsedAt: wallet.lastUsedAt,
      transactionCount: wallet.transactionCount
      // Não incluir userId em respostas públicas
    };
  }
}

// Singleton instance
let registryInstance = null;

function getWalletRegistry() {
  if (!registryInstance) {
    registryInstance = new WalletRegistry();
  }
  return registryInstance;
}

module.exports = {
  WalletRegistry,
  getWalletRegistry
};

