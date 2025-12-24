// FLOWPay - USDT Service
// Serviço para conversão de PIX para USDT e envio para wallets

const { createWalletClient, createPublicClient, http, formatUnits, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { mainnet, polygon } = require('viem/chains');

// Endereços dos contratos USDT
const USDT_CONTRACTS = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon
};

// Endereço da wallet do FLOWPay (server wallet)
// Deve ser configurado via variável de ambiente
const SERVER_WALLET_PRIVATE_KEY = process.env.SERVER_WALLET_PRIVATE_KEY;

// ABI mínimo para transferência ERC20
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
];

/**
 * Converte valor em BRL para USDT
 * @param {number} brlValue - Valor em reais (BRL)
 * @param {string} chainId - Chain ID (1 para Ethereum, 137 para Polygon)
 * @returns {Promise<object>} Objeto com valor em USDT e taxa de conversão
 */
async function convertToUSDT(brlValue, chainId = '137') {
  try {
    console.log('Convertendo BRL para USDT:', { brlValue, chainId });

    // TODO: Integrar com API de conversão real (CoinGecko, Binance, etc)
    // Por enquanto, usando taxa fixa para desenvolvimento
    const BRL_TO_USD_RATE = parseFloat(process.env.BRL_TO_USD_RATE || '5.0');
    const usdValue = brlValue / BRL_TO_USD_RATE;

    // USDT tem 6 decimais na maioria das chains
    const decimals = 6; // Ethereum e Polygon USDT têm 6 decimais
    const usdtAmount = parseUnits(usdValue.toFixed(decimals), decimals);

    console.log('Conversão realizada:', {
      brlValue,
      usdValue,
      usdtAmount: formatUnits(usdtAmount, decimals),
      rate: BRL_TO_USD_RATE
    });

    return {
      success: true,
      brlValue,
      usdValue,
      usdtAmount: usdtAmount.toString(),
      usdtAmountFormatted: formatUnits(usdtAmount, decimals),
      rate: BRL_TO_USD_RATE,
      chainId
    };

  } catch (error) {
    console.error('Erro ao converter BRL para USDT:', error);
    throw new Error(`Falha na conversão: ${error.message}`);
  }
}

/**
 * Envia USDT para a wallet do usuário
 * @param {string} recipientWallet - Endereço da wallet do destinatário
 * @param {string} usdtAmount - Quantidade de USDT em wei (string)
 * @param {string} chainId - Chain ID (1 para Ethereum, 137 para Polygon)
 * @returns {Promise<object>} Objeto com hash da transação
 */
async function sendUSDT(recipientWallet, usdtAmount, chainId = '137') {
  try {
    console.log('Enviando USDT:', {
      recipient: recipientWallet,
      amount: usdtAmount,
      chainId
    });

    if (!SERVER_WALLET_PRIVATE_KEY) {
      throw new Error('SERVER_WALLET_PRIVATE_KEY não configurada');
    }

    // Selecionar chain (converter chainId para número)
    const chainIdNum = parseInt(chainId, 10);
    const chain = chainIdNum === 1 ? mainnet : polygon;
    const usdtContract = USDT_CONTRACTS[chainIdNum];

    if (!usdtContract) {
      throw new Error(`Chain ID ${chainIdNum} não suportada`);
    }

    // Criar conta a partir da chave privada
    const account = privateKeyToAccount(SERVER_WALLET_PRIVATE_KEY);

    // Criar clientes
    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    });

    // Verificar saldo antes de enviar
    const balance = await publicClient.readContract({
      address: usdtContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    console.log('Saldo disponível:', formatUnits(balance, 6));

    if (BigInt(balance) < BigInt(usdtAmount)) {
      throw new Error('Saldo insuficiente na wallet do servidor');
    }

    // Enviar USDT
    const hash = await walletClient.writeContract({
      address: usdtContract,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipientWallet, usdtAmount]
    });

    console.log('USDT enviado com sucesso:', { hash });

    // Aguardar confirmação
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('Transação confirmada:', {
      hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status
    });

    return {
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      status: receipt.status,
      recipient: recipientWallet,
      amount: usdtAmount
    };

  } catch (error) {
    console.error('Erro ao enviar USDT:', error);
    throw new Error(`Falha no envio de USDT: ${error.message}`);
  }
}

/**
 * Registra prova da transação no blockchain
 * @param {string} transactionHash - Hash da transação de envio de USDT
 * @param {string} pixChargeId - ID da cobrança PIX (correlationID)
 * @param {string} brlValue - Valor original em BRL
 * @param {string} usdtAmount - Quantidade de USDT enviada
 * @param {string} recipientWallet - Wallet do destinatário
 * @param {string} chainId - Chain ID
 * @returns {Promise<object>} Objeto com dados da prova registrada
 */
async function writeOnChainProof(transactionHash, pixChargeId, brlValue, usdtAmount, recipientWallet, chainId = '137') {
  try {
    console.log('Registrando prova on-chain:', {
      transactionHash,
      pixChargeId,
      brlValue,
      usdtAmount,
      recipientWallet,
      chainId
    });

    // Criar objeto de prova
    const proof = {
      pixChargeId,
      transactionHash,
      brlValue: parseFloat(brlValue),
      usdtAmount: usdtAmount.toString(),
      recipientWallet: recipientWallet.toLowerCase(),
      chainId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // TODO: Em produção, salvar em banco de dados ou registrar em smart contract
    // Por enquanto, apenas log estruturado
    console.log('Prova registrada:', JSON.stringify(proof, null, 2));

    return {
      success: true,
      proof,
      message: 'Prova registrada com sucesso'
    };

  } catch (error) {
    console.error('Erro ao registrar prova on-chain:', error);
    throw new Error(`Falha no registro da prova: ${error.message}`);
  }
}

module.exports = {
  convertToUSDT,
  sendUSDT,
  writeOnChainProof,
  USDT_CONTRACTS
};

