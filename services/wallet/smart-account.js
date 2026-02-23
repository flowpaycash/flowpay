// FLOWPay - Smart Wallet Service (Account Abstraction)
// Origem: delegation-toolkit / integrate-token-smart-accounts.ts
// Adaptado para FlowPay: viem + MetaMask Smart Accounts Kit (opcional).

let secureLog = () => {};
try {
  const config = require('../utils/config');
  secureLog = config.secureLog || secureLog;
} catch {
  secureLog = (level, msg, meta) => console[level]?.({ msg, meta }) || console.log(msg, meta);
}

const { createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { polygon } = require('viem/chains');

const POLYGON_CHAIN_ID = 137;
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
];

/**
 * Normaliza private key para 0x + 64 hex.
 * @param {string} raw - PRIVATE_KEY ou SERVICE_WALLET_PRIVATE_KEY
 * @returns {string|undefined}
 */
function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== 'string') return undefined;
  const without = raw.startsWith('0x') ? raw.slice(2) : raw;
  const padded = without.padStart(64, '0');
  if (padded.length !== 64 || !/^[0-9a-fA-F]+$/.test(padded)) return undefined;
  return '0x' + padded;
}

/**
 * Servico de carteiras inteligentes (Smart Accounts).
 * Portado de: delegation-toolkit/integrate-token-smart-accounts.ts
 * (toMetaMaskSmartAccount, createInfuraBundlerClient, sendUserOperation/sendTransaction).
 *
 * Requer opcionalmente: pnpm install @metamask/smart-accounts-kit
 * Variaveis: BUNDLER_URL ou INFURA_API_KEY, PRIVATE_KEY ou SERVICE_WALLET_PRIVATE_KEY.
 */
class SmartWalletService {
  constructor() {
    this.infuraApiKey = process.env.INFURA_API_KEY || '';
    this.bundlerUrl = process.env.BUNDLER_URL || '';
    this.privateKey = normalizePrivateKey(
      process.env.PRIVATE_KEY || process.env.SERVICE_WALLET_PRIVATE_KEY || ''
    );
    this.rpcUrl =
      process.env.QUICKNODE_POLYGON_RPC ||
      (this.infuraApiKey ? `https://polygon-mainnet.infura.io/v3/${this.infuraApiKey}` : '');
    if (!this.rpcUrl && !this.bundlerUrl) {
      secureLog('warn', 'SmartWalletService: RPC/BUNDLER nao configurado');
    }
  }

  /**
   * Cria cliente publico viem (Polygon) para uso pelo kit.
   * @private
   */
  _getPublicClient() {
    if (!this.rpcUrl) throw new Error('Configure QUICKNODE_POLYGON_RPC ou INFURA_API_KEY');
    return createPublicClient({
      chain: polygon,
      transport: http(this.rpcUrl)
    });
  }

  /**
   * Cria (ou recupera) Smart Account para o usuario.
   * Adaptado de integrate-token-smart-accounts.ts: toMetaMaskSmartAccount(client, implementation, address, signer).
   * Em FlowPay: address pode ser derivado ou fixo; signer vem de PRIVATE_KEY/SERVICE_WALLET_PRIVATE_KEY.
   *
   * @param {string} userId - ID do usuario FlowPay (usado como referencia/salt)
   * @param {object} [options] - { address?: string, network?: 'polygon' }
   * @returns {Promise<{ address: string, salt: string }>}
   */
  async createWallet(userId, options = {}) {
    if (!this.privateKey) {
      throw new Error(
        'SmartWalletService: configure PRIVATE_KEY ou SERVICE_WALLET_PRIVATE_KEY no .env'
      );
    }

    let smartAccountAddress;
    try {
      const { toMetaMaskSmartAccount, Implementation } = await import(
        '@metamask/smart-accounts-kit'
      );
      const publicClient = this._getPublicClient();
      const account = privateKeyToAccount(this.privateKey);
      const address = options.address || account.address;

      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        address,
        signer: { account }
      });

      smartAccountAddress = smartAccount.address;
      secureLog('info', 'SmartWalletService.createWallet', {
        userId,
        address: smartAccountAddress ? `${String(smartAccountAddress).slice(0, 10)}...` : undefined
      });
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('smart-accounts-kit')) {
        throw new Error(
          'SmartWalletService: instale @metamask/smart-accounts-kit (pnpm install @metamask/smart-accounts-kit) e configure INFURA_API_KEY ou BUNDLER_URL.'
        );
      }
      throw e;
    }

    return {
      address: smartAccountAddress,
      salt: String(userId)
    };
  }

  /**
   * Executa transacao: gasless (UserOperation) se bundler configurado, senao transacao normal.
   * Portado de: transferTokens() / sendUserOperation({ calls, bundlerClient }) ou sendTransaction().
   *
   * @param {object} params - { from?: string, to: string, value?: bigint, data?: string, tokenAddress?: string, amountWei?: bigint, gasless?: boolean }
   * @returns {Promise<{ hash: string, success: boolean }>}
   */
  async executeTransaction(params) {
    if (!this.privateKey) {
      throw new Error(
        'SmartWalletService: configure PRIVATE_KEY ou SERVICE_WALLET_PRIVATE_KEY no .env'
      );
    }

    const { tokenAddress, amountWei, to, gasless = true } = params || {};
    const publicClient = this._getPublicClient();
    const account = privateKeyToAccount(this.privateKey);

    try {
      const { toMetaMaskSmartAccount, createInfuraBundlerClient, Implementation } = await import(
        '@metamask/smart-accounts-kit'
      );

      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        address: params.from || account.address,
        signer: { account }
      });

      let bundlerClient;
      if (this.infuraApiKey && gasless) {
        try {
          bundlerClient = createInfuraBundlerClient({
            chainId: POLYGON_CHAIN_ID,
            apiKey: this.infuraApiKey
          });
        } catch (err) {
          secureLog('warn', 'Bundler nao disponivel, usando transacao normal', {
            error: err.message
          });
        }
      }

      const targetToken = tokenAddress || params.tokenAddress;
      const amount = amountWei != null ? BigInt(amountWei) : params.value;

      if (targetToken && to && amount != null) {
        const calls = [
          {
            to: targetToken,
            data: smartAccount.encodeCalls([
              {
                to: targetToken,
                data: smartAccount.encodeFunctionData({
                  abi: ERC20_ABI,
                  functionName: 'transfer',
                  args: [to, amount]
                })
              }
            ])
          }
        ];

        if (bundlerClient) {
          const userOpHash = await smartAccount.sendUserOperation({
            calls,
            bundlerClient
          });
          secureLog('info', 'UserOperation enviada', { userOpHash });
          return { hash: userOpHash, success: true };
        }

        const hash = await smartAccount.sendTransaction({
          to: targetToken,
          data: smartAccount.encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, amount]
          })
        });
        return { hash, success: true };
      }

      if (params.to && (params.data || params.value != null)) {
        if (bundlerClient) {
          const userOpHash = await smartAccount.sendUserOperation({
            calls: [{ to: params.to, data: params.data || '0x', value: params.value || 0n }],
            bundlerClient
          });
          return { hash: userOpHash, success: true };
        }
        const hash = await smartAccount.sendTransaction({
          to: params.to,
          data: params.data || '0x',
          value: params.value || 0n
        });
        return { hash, success: true };
      }

      throw new Error(
        'SmartWalletService.executeTransaction: informe to + (tokenAddress + amountWei) ou (to + data/value).'
      );
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('smart-accounts-kit')) {
        throw new Error(
          'SmartWalletService: instale @metamask/smart-accounts-kit e configure INFURA_API_KEY para gasless.'
        );
      }
      throw e;
    }
  }

  isConfigured() {
    return Boolean(
      (this.bundlerUrl || this.infuraApiKey) &&
        this.rpcUrl &&
        this.privateKey
    );
  }
}

let instance = null;

function getSmartWalletService() {
  if (!instance) {
    instance = new SmartWalletService();
  }
  return instance;
}

module.exports = {
  SmartWalletService,
  getSmartWalletService,
  normalizePrivateKey
};
