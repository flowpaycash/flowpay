// FLOWPay - Settlement Engine
// Origem: neo_systems/neo_one src/executors/neoflow-executor.js + neoflow-contract.js
// Adaptado: transfer com flag gasless delega ao SmartWalletService (Bundler/UserOps) ou usa QuickNode.

const { getQuickNodeSettlement } = require('../blockchain/quicknode-settlement');

let secureLog = () => {};
try {
  const config = require('../../netlify/functions/config');
  secureLog = config.secureLog || secureLog;
} catch {
  secureLog = (level, msg, meta) => console[level]?.({ msg, meta }) || console.log(msg, meta);
}

/**
 * Motor de liquidacao: transfere tokens (USDT/USDC) via QuickNode; se gasless=true,
 * tenta SmartWalletService.executeTransaction (Bundler), senao transacao normal com signer.
 * Portado de: neoflow-executor.transfer(params, auth) + neoflow-contract.transfer(..., { gasless }).
 */
class SettlementEngine {
  constructor() {
    this.quicknode = getQuickNodeSettlement();
    this.network = this.quicknode.getNetwork();
    this.usdtContract = this.quicknode.getUSDTContractAddress();
  }

  /**
   * Transfere USDT (ou USDC) para o endereco de destino.
   * gasless=true: delega a getSmartWalletService().executeTransaction (requer @metamask/smart-accounts-kit).
   *
   * @param {object} params - { to: string, amountWei: string|bigint, token?: 'USDT'|'USDC', gasless?: boolean }
   * @returns {Promise<{ hash: string, success: boolean, network: string }>}
   */
  async transfer(params) {
    const { to, amountWei, token = 'USDT', gasless = false } = params || {};
    secureLog('info', 'SettlementEngine.transfer', {
      to: to ? `${String(to).slice(0, 10)}...` : undefined,
      token,
      gasless
    });

    if (gasless) {
      const smartWallet = require('../wallet/smart-account').getSmartWalletService();
      if (smartWallet.isConfigured()) {
        const contractAddress = token === 'USDC' ? this._getUSDCAddress() : this.usdtContract;
        const result = await smartWallet.executeTransaction({
          tokenAddress: contractAddress,
          to,
          amountWei: BigInt(amountWei),
          gasless: true
        });
        return {
          hash: result.hash,
          success: result.success,
          network: this.network
        };
      }
      throw new Error(
        'SettlementEngine.transfer(gasless): configure SmartWalletService (BUNDLER_URL ou INFURA_API_KEY + PRIVATE_KEY).'
      );
    }

    const publicClient = this.quicknode.getPublicClient();
    const walletClient = this.quicknode.getWalletClient();
    const contractAddress = token === 'USDC' ? this._getUSDCAddress() : this.usdtContract;

    const erc20TransferAbi = [
      {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
      }
    ];

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: erc20TransferAbi,
      functionName: 'transfer',
      args: [to, BigInt(amountWei)]
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 30000
    });
    return {
      hash: receipt.transactionHash,
      success: receipt.status === 'success',
      network: this.network
    };
  }

  _getUSDCAddress() {
    const usdc = {
      polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
    };
    return usdc[this.network] || this.usdtContract;
  }

  /**
   * Leitura de saldo ERC-20 (reutiliza QuickNode).
   * @param {string} address - Endereco da carteira
   * @param {string} [token='USDT'] - USDT ou USDC
   * @returns {Promise<string>} Saldo em wei (string)
   */
  async balanceOf(address, token = 'USDT') {
    const publicClient = this.quicknode.getPublicClient();
    const contractAddress = token === 'USDC' ? this._getUSDCAddress() : this.usdtContract;
    const balance = await publicClient.readContract({
      address: contractAddress,
      abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }],
      functionName: 'balanceOf',
      args: [address]
    });
    return String(balance);
  }

  getNetwork() {
    return this.network;
  }
}

let instance = null;

function getSettlementEngine() {
  if (!instance) {
    instance = new SettlementEngine();
  }
  return instance;
}

module.exports = {
  SettlementEngine,
  getSettlementEngine
};
