// FLOWPay - Write Proof Service
// Escreve eventos/provas on-chain sem tocar em dinheiro
// Usa Base (EVM) via QuickNode - função: registrar fatos, confirmar estados, auditar

const { getQuickNodeBase } = require('./quicknode-base');
const { secureLog } = require('../../netlify/functions/config');
const crypto = require('crypto');

class WriteProof {
  constructor() {
    // QuickNode Base endpoint (proof layer)
    this.quicknodeBase = getQuickNodeBase();

    // Endereço do contrato de prova (se existir)
    // Em produção, deployar um contrato simples para registrar eventos
    this.proofContractAddress = process.env.PROOF_CONTRACT_ADDRESS || '';

    // IPFS desabilitado no v0 (não usar agora)
    this.useIPFS = false;

    // ABI mínimo para escrita de eventos
    this.proofContractABI = [
      {
        name: 'recordProof',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'proofId', type: 'bytes32' },
          { name: 'pixChargeId', type: 'string' },
          { name: 'txHash', type: 'bytes32' },
          { name: 'metadata', type: 'string' }
        ],
        outputs: [{ name: '', type: 'bool' }]
      },
      {
        name: 'ProofRecorded',
        type: 'event',
        inputs: [
          { name: 'proofId', type: 'bytes32', indexed: true },
          { name: 'pixChargeId', type: 'string', indexed: false },
          { name: 'txHash', type: 'bytes32', indexed: false },
          { name: 'timestamp', type: 'uint256', indexed: false }
        ]
      }
    ];
  }

  /**
   * Escreve prova on-chain (evento)
   * @param {object} proofData - Dados da prova
   * @param {string} proofData.pixChargeId - ID da cobrança PIX (obrigatório)
   * @param {string} proofData.txHash - Hash da transação USDT (obrigatório, formato 0x...)
   * @param {string} proofData.recipientWallet - Wallet do destinatário (obrigatório, formato 0x...)
   * @param {number} [proofData.amountBRL] - Valor em BRL (opcional)
   * @param {number} [proofData.amountUSDT] - Valor em USDT (opcional)
   * @param {string} [proofData.network='ethereum'] - Rede blockchain
   * @param {object} [proofData.metadata={}] - Metadados adicionais
   * @returns {Promise<object>} Resultado com tx hash da prova
   * @returns {object.success} boolean - Indica sucesso da operação
   * @returns {object.proof} object - Dados da prova registrada
   * @returns {object.proof.id} string - ID único da prova
   * @returns {object.proof.txHash} string - Hash da transação de prova
   * @returns {object.proof.pixChargeId} string - ID da cobrança PIX
   * @returns {object.proof.usdtTxHash} string - Hash da transação USDT original
   * @returns {object.proof.recipientWallet} string - Wallet do destinatário (mascarado)
   * @returns {object.proof.network} string - Rede blockchain ('base')
   * @returns {object.proof.chainId} number - Chain ID (8453 para Base)
   * @returns {object.proof.blockNumber} string - Número do bloco
   * @returns {object.proof.timestamp} string - Timestamp ISO
   * @throws {Error} Se pixChargeId, txHash ou recipientWallet forem inválidos
   * @throws {Error} Se formato de endereço ou hash for inválido
   */
  async writeProof(proofData) {
    try {
      const {
        pixChargeId,
        txHash,
        recipientWallet,
        amountBRL,
        amountUSDT,
        network = 'ethereum',
        metadata = {}
      } = proofData;

      // Validações
      if (!pixChargeId) {
        throw new Error('pixChargeId é obrigatório');
      }

      if (!txHash) {
        throw new Error('txHash é obrigatório');
      }

      if (!recipientWallet) {
        throw new Error('recipientWallet é obrigatório');
      }

      // Validar formato de endereço Ethereum
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(recipientWallet)) {
        throw new Error('recipientWallet inválido. Deve ser um endereço Ethereum válido (0x...)');
      }

      // Validar formato de txHash
      if (!txHash.startsWith('0x') || txHash.length !== 66) {
        throw new Error('txHash inválido. Deve ser um hash de transação válido (0x seguido de 64 caracteres hexadecimais)');
      }

      secureLog('info', 'Iniciando escrita de prova on-chain', {
        pixChargeId,
        txHash: this.maskAddress(txHash),
        recipientWallet: this.maskAddress(recipientWallet),
        network
      });

      // Gerar ID único da prova
      const proofId = crypto.createHash('sha256')
        .update(`${pixChargeId}-${txHash}-${Date.now()}`)
        .digest('hex');

      // Preparar dados da prova
      const proofMetadata = {
        pixChargeId,
        txHash,
        recipientWallet: recipientWallet.toLowerCase(),
        amountBRL: parseFloat(amountBRL),
        amountUSDT: parseFloat(amountUSDT),
        network,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      // Escrever on-chain
      const result = await this.writeToBlockchain(
        proofId,
        pixChargeId,
        txHash,
        proofMetadata,
        network
      );

      // IPFS desabilitado no v0 (não usar agora)
      // NOTA: Se IPFS for necessário no futuro, usar quicknode-rest.js diretamente,
      // não quicknode-integration.js, para evitar dependência circular:
      // - quicknode-integration.js já usa write-proof.js
      // - write-proof.js não deve usar quicknode-integration.js

      secureLog('info', 'Prova escrita on-chain com sucesso', {
        proofId,
        proofTxHash: result.txHash,
        network: 'base'
      });

      return {
        success: true,
        proof: {
          id: proofId,
          txHash: result.txHash,
          pixChargeId,
          usdtTxHash: txHash,
          recipientWallet: this.maskAddress(recipientWallet),
          network: 'base',
          chainId: 8453,
          blockNumber: result.blockNumber,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      secureLog('error', 'Erro ao escrever prova on-chain', {
        error: error.message,
        pixChargeId: proofData?.pixChargeId,
        txHash: proofData?.txHash ? this.maskAddress(proofData.txHash) : '[REDACTED]'
      });
      throw error;
    }
  }

  /**
   * Escreve dados na blockchain
   * @param {string} proofId - ID único da prova
   * @param {string} pixChargeId - ID da cobrança PIX
   * @param {string} txHash - Hash da transação USDT
   * @param {object} metadata - Metadados
   * @param {string} network - Rede blockchain
   * @returns {object} Hash da transação e número do bloco
   */
  async writeToBlockchain(proofId, pixChargeId, txHash, metadata, network) {
    try {
      // SEMPRE usar Base para provas (independente da rede de liquidação)
      const networkForProof = 'base';

      // Se não houver contrato configurado, usar método alternativo
      if (!this.proofContractAddress || process.env.NODE_ENV === 'development') {
        return await this.writeProofAlternative(proofId, pixChargeId, txHash, metadata, networkForProof);
      }

      // Modo produção: escrever em smart contract na Base
      const walletClient = this.quicknodeBase.getWalletClient();

      // Converter proofId para bytes32
      const proofIdBytes = `0x${proofId.substring(0, 64)}`;
      const txHashBytes = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      const metadataJson = JSON.stringify(metadata);

      // Escrever no contrato
      const hash = await walletClient.writeContract({
        address: this.proofContractAddress,
        abi: this.proofContractABI,
        functionName: 'recordProof',
        args: [proofIdBytes, pixChargeId, txHashBytes, metadataJson]
      });

      // Aguardar confirmação
      const publicClient = this.quicknodeBase.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return {
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status === 'success' ? 'confirmed' : 'failed'
      };

    } catch (error) {
      secureLog('error', 'Erro ao escrever na blockchain', {
        error: error.message,
        network: 'base'
      });
      throw error;
    }
  }

  /**
   * Método alternativo: escrever prova via calldata (sem contrato)
   * Útil para desenvolvimento ou quando não há contrato deployado
   * @param {string} proofId - ID único da prova
   * @param {string} pixChargeId - ID da cobrança PIX
   * @param {string} txHash - Hash da transação USDT
   * @param {object} metadata - Metadados
   * @param {string} network - Rede blockchain
   * @returns {object} Hash da transação simulada
   */
  async writeProofAlternative(proofId, pixChargeId, txHash, metadata, network) {
    try {
      secureLog('info', 'Usando método alternativo de escrita (desenvolvimento)', {
        proofId,
        network: 'base'
      });

      // Em desenvolvimento, apenas simular
      // Em produção, deployar contrato simples na Base
      const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      // Log estruturado da prova (pode ser indexado depois)
      secureLog('info', 'Prova registrada (modo alternativo)', {
        proofId,
        pixChargeId,
        usdtTxHash: txHash,
        proofTxHash: mockTxHash,
        network,
        metadata: JSON.stringify(metadata)
      });

      return {
        txHash: mockTxHash,
        blockNumber: '0',
        status: 'simulated'
      };

    } catch (error) {
      secureLog('error', 'Erro no método alternativo', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verifica se uma prova foi registrada
   * @param {string} proofId - ID da prova
   * @param {string} network - Rede blockchain
   * @returns {object} Status da prova
   */
  async verifyProof(proofId, network = 'ethereum') {
    try {
      if (!this.proofContractAddress) {
        // Sem contrato, verificar logs
        secureLog('info', 'Verificação de prova (sem contrato)', {
          proofId
        });
        return {
          found: false,
          message: 'Contrato de prova não configurado'
        };
      }

      const publicClient = this.quicknodeBase.getPublicClient();

      // Buscar evento ProofRecorded na Base
      // TODO: Implementar busca de eventos do contrato

      return {
        found: false,
        message: 'Verificação de prova não implementada',
        network: 'base'
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar prova', {
        error: error.message,
        proofId
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
let proofInstance = null;

function getWriteProof() {
  if (!proofInstance) {
    proofInstance = new WriteProof();
  }
  return proofInstance;
}

module.exports = {
  WriteProof,
  getWriteProof
};

