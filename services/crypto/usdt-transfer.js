// FLOWPay - USDT Transfer Service
// Envia USDT para wallets cadastradas dos usuários
// Usa QuickNode Settlement endpoint (Polygon OU BSC) - função: liquidação USDT

const crypto = require('crypto');
const { secureLog, logAPIError } = require('../../src/services/api/config.mjs');
const { getWalletRegistry } = require('./wallet-registry');
const { getQuickNodeSettlement } = require('../blockchain/quicknode-settlement');

class USDTTransfer {
  constructor() {
    // QuickNode Settlement endpoint (Polygon OU BSC)
    this.quicknodeSettlement = getQuickNodeSettlement();

    // Rede de liquidação (configurada via USDT_SETTLEMENT_NETWORK)
    this.settlementNetwork = this.quicknodeSettlement.getNetwork();

    // Configurações de rede USDT (apenas para referência)
    this.networks = {
      polygon: {
        name: 'Polygon',
        chainId: 137,
        contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
        decimals: 6
      },
      bsc: {
        name: 'BSC',
        chainId: 56,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
        decimals: 18
      }
    };

    // Wallet do serviço (hot wallet para envios)
    this.serviceWallet = {
      address: process.env.SERVICE_WALLET_ADDRESS || '',
      privateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || ''
    };

    // Validar formato do endereço da wallet do serviço (se configurado)
    if (this.serviceWallet.address) {
      const walletRegistry = getWalletRegistry();
      if (!walletRegistry.isValidAddress(this.serviceWallet.address)) {
        secureLog('warn', 'Endereço da wallet do serviço inválido. Verifique SERVICE_WALLET_ADDRESS');
      }
    }
  }

  /**
   * Transfere USDT para wallet do usuário
   * @param {string} userId - ID do usuário
   * @param {string} toAddress - Endereço Ethereum de destino (0x...)
   * @param {number} amountUSDT - Quantidade de USDT (deve ser > 0)
   * @param {string} [network='ethereum'] - Rede blockchain (ethereum, polygon, bsc)
   * @param {string} [correlationId] - ID de correlação da transação PIX
   * @returns {Promise<object>} Resultado da transferência
   * @returns {object.success} boolean - Indica sucesso da operação
   * @returns {object.transaction} object - Dados da transação
   * @returns {object.transaction.hash} string - Hash da transação
   * @returns {object.transaction.from} string - Endereço de origem (mascarado)
   * @returns {object.transaction.to} string - Endereço de destino (mascarado)
   * @returns {object.transaction.amount} number - Quantidade de USDT
   * @returns {object.transaction.currency} string - Moeda ('USDT')
   * @returns {object.transaction.network} string - Rede blockchain
   * @returns {object.transaction.status} string - Status da transação
   * @returns {object.transaction.timestamp} string - Timestamp ISO
   * @returns {object.transaction.correlationId} string - ID de correlação
   * @throws {Error} Se validações falharem (userId, endereço, quantidade, rede)
   * @throws {Error} Se wallet não estiver registrada ou não pertencer ao usuário
   * @throws {Error} Se wallet do serviço não estiver configurada
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

      // Validar formato de endereço Ethereum
      const walletRegistry = getWalletRegistry();
      if (!walletRegistry.isValidAddress(toAddress)) {
        throw new Error('Endereço de destino inválido. Deve ser um endereço Ethereum válido (0x...)');
      }

      if (!amountUSDT || amountUSDT <= 0) {
        throw new Error('Quantidade de USDT deve ser maior que zero');
      }

      // Validar rede (deve ser a rede de liquidação configurada)
      const requestedNetwork = network.toLowerCase();
      if (requestedNetwork !== this.settlementNetwork) {
        throw new Error(`Rede de liquidação configurada é ${this.settlementNetwork}, mas foi solicitado ${network}`);
      }

      const networkConfig = this.networks[this.settlementNetwork];
      if (!networkConfig) {
        throw new Error(`Rede de liquidação não suportada: ${this.settlementNetwork}`);
      }

      // Validar wallet do usuário
      const isValidWallet = await walletRegistry.validateUserWallet(userId, toAddress);

      if (!isValidWallet) {
        throw new Error('Wallet não registrada ou não pertence ao usuário');
      }

      // Validar wallet do serviço
      if (!this.serviceWallet.address || !this.serviceWallet.privateKey) {
        throw new Error('Wallet do serviço não configurada');
      }

      // Validar formato do endereço da wallet do serviço
      if (!walletRegistry.isValidAddress(this.serviceWallet.address)) {
        throw new Error('Endereço da wallet do serviço inválido');
      }

      secureLog('info', 'Iniciando transferência USDT', {
        userId: '[REDACTED]',
        toAddress: this.maskAddress(toAddress),
        amountUSDT,
        network,
        correlationId
      });

      // Executar transferência usando QuickNode Settlement
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

        // 🚀 Add to PoE Batch
        try {
          const { getPOEService } = require('./poe-service');
          const poeService = getPOEService();
          await poeService.addOrderToBatch(correlationId);
        } catch (poeError) {
          secureLog('warn', 'Erro ao adicionar ao batch PoE (não crítico)', {
            error: poeError.message,
            correlationId
          });
        }
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
      const isDev = process.env.NODE_ENV === 'development';
      const hasKey = !!this.serviceWallet.privateKey;

      if (isDev && !hasKey) {
        // Modo desenvolvimento sem chave: simular transferência
        secureLog('info', 'Simulando transferência USDT (modo desenvolvimento)', {
          toAddress: this.maskAddress(toAddress),
          amountUSDT,
          network: this.settlementNetwork
        });

        const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        return { txHash: mockTxHash, status: 'simulated' };
      }

      if (!hasKey) {
        throw new Error('SERVICE_WALLET_PRIVATE_KEY não configurada para ambiente de produção');
      }

      // Modo produção ou dev com chave: executar transferência real
      const { createPublicClient, createWalletClient, http, parseUnits } = require('viem');
      const { privateKeyToAccount } = require('viem/accounts');
      const { polygon, bsc } = require('viem/chains');

      const chain = this.settlementNetwork === 'polygon' ? polygon : bsc;
      const rpcUrl = this.quicknodeSettlement.rpcUrls[this.settlementNetwork];

      const account = privateKeyToAccount(this.serviceWallet.privateKey);

      const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
      const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

      const usdtContract = networkConfig.contractAddress;
      const decimals = networkConfig.decimals;
      const amountWei = parseUnits(amountUSDT.toString(), decimals);

      // ABI mínimo para transferência
      const abi = [{
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ name: '', type: 'bool' }],
      }];

      // 1. Verificar saldo
      const balance = await publicClient.readContract({
        address: usdtContract,
        abi,
        functionName: 'balanceOf',
        args: [account.address]
      });

      if (BigInt(balance) < amountWei) {
        throw new Error(`Saldo insuficiente na wallet de serviço. Necessário: ${amountUSDT}, Disponível: ${balance}`);
      }

      // 2. Enviar transferência
      secureLog('info', 'Enviando transação real de USDT', {
        to: this.maskAddress(toAddress),
        amount: amountUSDT,
        network: this.settlementNetwork
      });

      const hash = await walletClient.writeContract({
        address: usdtContract,
        abi,
        functionName: 'transfer',
        args: [toAddress, amountWei],
      });

      // 3. Aguardar confirmação (não bloqueamos muito tempo, mas o suficiente para garantir submissão)
      // Em contextos serverless (Netlify), temos limite de tempo, então usamos um timeout razoável
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 30000 // 30 segundos
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transação falhou na blockchain: ${hash}`);
      }

      return {
        txHash: hash,
        status: 'confirmed',
        blockNumber: receipt.blockNumber.toString()
      };

    } catch (error) {
      logAPIError('error', 'Falha crítica na execução da transferência blockchain', {
        service: 'usdt-transfer',
        network: networkConfig.name,
        error: error.message,
        correlationId
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
  async getTransactionStatus(txHash, network = null) {
    try {
      // Usar rede de liquidação configurada
      const checkNetwork = network || this.settlementNetwork;

      if (checkNetwork !== this.settlementNetwork) {
        throw new Error(`Rede de liquidação configurada é ${this.settlementNetwork}, mas foi solicitado ${checkNetwork}`);
      }

      // Consultar status via QuickNode Settlement
      const status = await this.quicknodeSettlement.getTransactionStatus(txHash);

      secureLog('info', 'Status da transação verificado', {
        txHash: this.maskAddress(txHash),
        network: this.settlementNetwork,
        status: status.status
      });

      return status;

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

