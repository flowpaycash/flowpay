// 💸 FLOWPay - USDT Transfer Service
// Envia USDT para wallets cadastradas dos usuários

const { secureLog, logAPIError } = require('../../netlify/functions/config');
const { getWalletRegistry } = require('./wallet-registry');

class USDTTransfer {
  constructor() {
    // Configurações de rede USDT
    this.networks = {
      ethereum: {
        name: 'Ethereum',
        chainId: 1,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
        decimals: 6,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/' + (process.env.INFURA_KEY || '')
      },
      polygon: {
        name: 'Polygon',
        chainId: 137,
        contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
        decimals: 6,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
      },
      bsc: {
        name: 'BSC',
        chainId: 56,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
        decimals: 18,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
      }
    };

    // Wallet do serviço (hot wallet para envios)
    this.serviceWallet = {
      address: process.env.SERVICE_WALLET_ADDRESS || '',
      privateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || '' // Em produção, usar gerenciamento seguro
    };
  }

  /**
   * Transfere USDT para wallet do usuário
   * @param {string} userId - ID do usuário
   * @param {string} toAddress - Endereço de destino
   * @param {number} amountUSDT - Quantidade de USDT
   * @param {string} network - Rede blockchain (ethereum, polygon, bsc)
   * @param {string} correlationId - ID de correlação da transação
   * @returns {object} Resultado da transferência
   */
  async transferUSDT(userId, toAddress, amountUSDT, network = 'ethereum', correlationId = null) {
    try {
      // Validações
      if (!userId) {
        throw new Error('userId é obrigatório');
      }

      if (!toAddress) {
        throw new Error('Endereço de destino é obrigatório');
      }

      if (!amountUSDT || amountUSDT <= 0) {
        throw new Error('Quantidade de USDT deve ser maior que zero');
      }

      // Validar rede
      const networkConfig = this.networks[network.toLowerCase()];
      if (!networkConfig) {
        throw new Error(`Rede não suportada: ${network}. Suportadas: ${Object.keys(this.networks).join(', ')}`);
      }

      // Validar wallet do usuário
      const walletRegistry = getWalletRegistry();
      const isValidWallet = await walletRegistry.validateUserWallet(userId, toAddress);
      
      if (!isValidWallet) {
        throw new Error('Wallet não registrada ou não pertence ao usuário');
      }

      // Validar wallet do serviço
      if (!this.serviceWallet.address || !this.serviceWallet.privateKey) {
        throw new Error('Wallet do serviço não configurada');
      }

      secureLog('info', 'Iniciando transferência USDT', {
        userId: '[REDACTED]',
        toAddress: this.maskAddress(toAddress),
        amountUSDT,
        network,
        correlationId
      });

      // Executar transferência
      const transferResult = await this.executeTransfer(
        toAddress,
        amountUSDT,
        networkConfig,
        correlationId
      );

      // Atualizar registro da wallet
      await walletRegistry.updateLastUsed(toAddress);

      // Registrar prova on-chain (opcional, não bloqueia)
      try {
        const { getWriteProof } = require('../blockchain/write-proof');
        const writeProof = getWriteProof();
        
        await writeProof.writeProof({
          pixChargeId: correlationId || `transfer_${Date.now()}`,
          txHash: transferResult.txHash,
          recipientWallet: toAddress,
          amountBRL: null, // Não disponível neste contexto
          amountUSDT: amountUSDT,
          network,
          metadata: {
            userId: '[REDACTED]',
            type: 'usdt_transfer'
          }
        });
      } catch (proofError) {
        // Não falhar a transferência se o registro de prova falhar
        secureLog('warn', 'Erro ao registrar prova on-chain (não crítico)', {
          error: proofError.message,
          txHash: transferResult.txHash
        });
      }

      secureLog('info', 'Transferência USDT concluída', {
        transactionHash: transferResult.txHash,
        toAddress: this.maskAddress(toAddress),
        amountUSDT,
        network,
        correlationId
      });

      return {
        success: true,
        transaction: {
          hash: transferResult.txHash,
          from: this.maskAddress(this.serviceWallet.address),
          to: this.maskAddress(toAddress),
          amount: amountUSDT,
          currency: 'USDT',
          network,
          status: 'completed',
          timestamp: new Date().toISOString(),
          correlationId
        }
      };

    } catch (error) {
      secureLog('error', 'Erro ao transferir USDT', {
        error: error.message,
        userId: '[REDACTED]',
        toAddress: toAddress ? this.maskAddress(toAddress) : '[REDACTED]',
        amountUSDT,
        network,
        correlationId
      });
      throw error;
    }
  }

  /**
   * Executa a transferência na blockchain
   * @param {string} toAddress - Endereço de destino
   * @param {number} amountUSDT - Quantidade de USDT
   * @param {object} networkConfig - Configuração da rede
   * @param {string} correlationId - ID de correlação
   * @returns {object} Hash da transação
   */
  async executeTransfer(toAddress, amountUSDT, networkConfig, correlationId) {
    try {
      // Em produção, usar biblioteca Web3 ou ethers.js
      // Por enquanto, simular transferência
      
      if (process.env.NODE_ENV === 'development' || !this.serviceWallet.privateKey) {
        // Modo desenvolvimento: simular transferência
        secureLog('info', 'Simulando transferência USDT (modo desenvolvimento)', {
          toAddress: this.maskAddress(toAddress),
          amountUSDT,
          network: networkConfig.name
        });

        // Gerar hash simulado
        const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;

        return {
          txHash: mockTxHash,
          status: 'simulated',
          network: networkConfig.name
        };
      }

      // Modo produção: executar transferência real
      // TODO: Implementar com Web3/ethers.js
      /*
      const Web3 = require('web3');
      const web3 = new Web3(networkConfig.rpcUrl);
      
      // Carregar contrato USDT (ERC-20)
      const contractABI = [/* ABI do contrato USDT */];
      const contract = new web3.eth.Contract(contractABI, networkConfig.contractAddress);
      
      // Converter amount para wei/smallest unit
      const amount = web3.utils.toBN(amountUSDT * Math.pow(10, networkConfig.decimals));
      
      // Criar transação
      const account = web3.eth.accounts.privateKeyToAccount(this.serviceWallet.privateKey);
      web3.eth.accounts.wallet.add(account);
      
      const tx = contract.methods.transfer(toAddress, amount);
      const gas = await tx.estimateGas({ from: account.address });
      const gasPrice = await web3.eth.getGasPrice();
      
      const txData = tx.encodeABI();
      const signedTx = await web3.eth.accounts.signTransaction({
        to: networkConfig.contractAddress,
        data: txData,
        gas,
        gasPrice,
        nonce: await web3.eth.getTransactionCount(account.address)
      }, this.serviceWallet.privateKey);
      
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      return {
        txHash: receipt.transactionHash,
        status: 'completed',
        network: networkConfig.name
      };
      */

      throw new Error('Transferência real não implementada. Configure SERVICE_WALLET_PRIVATE_KEY para produção.');

    } catch (error) {
      logAPIError('error', 'Erro ao executar transferência', {
        service: 'usdt-transfer',
        network: networkConfig.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verifica status de uma transação
   * @param {string} txHash - Hash da transação
   * @param {string} network - Rede blockchain
   * @returns {object} Status da transação
   */
  async getTransactionStatus(txHash, network = 'ethereum') {
    try {
      const networkConfig = this.networks[network.toLowerCase()];
      if (!networkConfig) {
        throw new Error(`Rede não suportada: ${network}`);
      }

      // Em produção, consultar blockchain
      // Por enquanto, retornar status mockado
      
      secureLog('info', 'Verificando status da transação', {
        txHash: this.maskAddress(txHash),
        network
      });

      // Mock: sempre confirmada em desenvolvimento
      return {
        hash: txHash,
        status: 'confirmed',
        confirmations: 12,
        network,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar status da transação', {
        error: error.message,
        txHash: txHash ? this.maskAddress(txHash) : '[REDACTED]',
        network
      });
      throw error;
    }
  }

  /**
   * Verifica saldo de USDT na wallet do serviço
   * @param {string} network - Rede blockchain
   * @returns {object} Saldo disponível
   */
  async getServiceWalletBalance(network = 'ethereum') {
    try {
      const networkConfig = this.networks[network.toLowerCase()];
      if (!networkConfig) {
        throw new Error(`Rede não suportada: ${network}`);
      }

      // Em produção, consultar blockchain
      // Por enquanto, retornar saldo mockado
      
      secureLog('info', 'Verificando saldo da wallet do serviço', {
        network,
        address: this.maskAddress(this.serviceWallet.address)
      });

      // Mock: saldo suficiente em desenvolvimento
      return {
        address: this.maskAddress(this.serviceWallet.address),
        balance: '10000.0',
        currency: 'USDT',
        network,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar saldo', {
        error: error.message,
        network
      });
      throw error;
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
let transferInstance = null;

function getUSDTTransfer() {
  if (!transferInstance) {
    transferInstance = new USDTTransfer();
  }
  return transferInstance;
}

module.exports = {
  USDTTransfer,
  getUSDTTransfer
};

