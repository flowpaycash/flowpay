// FLOWPay - Chain Scanner (redundancia de verificacao)
// Origem: web_apps/projetos_flowpay/FlowPAY/crypto.py (check_erc20_token_payment)
// Adaptado: viem getLogs com topico Transfer(address,address,uint256); sem Python/db.

let secureLog = () => {};
try {
  const config = require('../../netlify/functions/config');
  secureLog = config.secureLog || secureLog;
} catch {
  secureLog = (level, msg, meta) => console[level]?.({ msg, meta }) || console.log(msg, meta);
}

const { createPublicClient, http } = require('viem');
const { polygon } = require('viem/chains');

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DEFAULT_BLOCKS_TO_SCAN = 200;
const AMOUNT_TOLERANCE_PERCENT = 0.01;

const transferEventAbi = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false }
  ]
};

/**
 * Scanner de blocos para pagamentos ERC-20 (USDT/USDC).
 * Portado de: crypto.py check_erc20_token_payment (Transfer event filter, tolerance, block range).
 * Usa eth_getLogs com topico Transfer; nao itera tx por tx.
 */
class ChainScanner {
  constructor() {
    this.rpcUrl =
      process.env.QUICKNODE_POLYGON_RPC ||
      process.env.QUICKNODE_ETHEREUM_RPC ||
      (process.env.INFURA_API_KEY
        ? `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
        : '');
    this.merchantWallet =
      process.env.MERCHANT_WALLET_ADDRESS || process.env.SERVICE_WALLET_ADDRESS || '';
    this.usdtContract =
      process.env.USDT_CONTRACT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    this.usdcContract =
      process.env.USDC_CONTRACT_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    this.lastScannedBlock = 0;
    this._client = null;
    if (!this.rpcUrl) {
      secureLog('warn', 'ChainScanner: RPC nao configurado');
    }
  }

  _getClient() {
    if (this._client) return this._client;
    if (!this.rpcUrl) throw new Error('ChainScanner: configure QUICKNODE_POLYGON_RPC ou INFURA_API_KEY');
    this._client = createPublicClient({
      chain: polygon,
      transport: http(this.rpcUrl)
    });
    return this._client;
  }

  _getContractAddresses(tokenFilter) {
    const list = [];
    if (!tokenFilter || tokenFilter === 'USDT') list.push(this.usdtContract);
    if (!tokenFilter || tokenFilter === 'USDC') list.push(this.usdcContract);
    return list;
  }

  _tokenName(address) {
    const a = (address || '').toLowerCase();
    if (a === this.usdtContract.toLowerCase()) return 'USDT';
    if (a === this.usdcContract.toLowerCase()) return 'USDC';
    return 'ERC20';
  }

  /**
   * Varre os ultimos N blocos em busca de eventos Transfer para a carteira do merchant.
   * Portado de: crypto.py check_erc20_token_payment (create_filter fromBlock toBlock argument_filters to=merchant).
   *
   * @param {object} options - { fromBlock?, toBlock?, blocksToScan?: number, merchantAddress?, token?: 'USDT'|'USDC'|null }
   * @returns {Promise<Array<{ txHash: string, from: string, to: string, value: string, token: string, blockNumber: number }>>}
   */
  async scanTransfers(options = {}) {
    const {
      fromBlock,
      toBlock,
      blocksToScan = DEFAULT_BLOCKS_TO_SCAN,
      merchantAddress,
      token = null
    } = options;

    const merchant = (merchantAddress || this.merchantWallet).toLowerCase();
    if (!merchant) {
      throw new Error(
        'ChainScanner: configure MERCHANT_WALLET_ADDRESS ou SERVICE_WALLET_ADDRESS, ou passe merchantAddress.'
      );
    }

    const client = this._getClient();
    const toBlockNum = toBlock != null ? BigInt(toBlock) : await client.getBlockNumber();
    const fromBlockNum =
      fromBlock != null ? BigInt(fromBlock) : toBlockNum - BigInt(blocksToScan);
    const contracts = this._getContractAddresses(token);

    const results = [];
    for (const contractAddress of contracts) {
      const logs = await client.getLogs({
        address: contractAddress,
        fromBlock: fromBlockNum > 0n ? fromBlockNum : 0n,
        toBlock: toBlockNum,
        event: transferEventAbi,
        args: { to: merchant }
      });

      for (const log of logs) {
        results.push({
          txHash: log.transactionHash,
          from: log.args.from,
          to: log.args.to,
          value: String(log.args.value),
          token: this._tokenName(contractAddress),
          blockNumber: Number(log.blockNumber)
        });
      }
    }

    this.lastScannedBlock = Number(toBlockNum);
    secureLog('info', 'ChainScanner.scanTransfers', {
      fromBlock: String(fromBlockNum),
      toBlock: String(toBlockNum),
      count: results.length,
      merchant: `${merchant.slice(0, 10)}...`
    });

    return results.sort((a, b) => a.blockNumber - b.blockNumber);
  }

  /**
   * Verifica se um pagamento (valor esperado) foi recebido pela carteira do merchant nos ultimos blocos.
   * Portado de: crypto.py check_erc20_token_payment (expected_amount_raw, tolerance, existing_tx check).
   *
   * @param {object} options - { expectedAmountRaw: string|number, merchantAddress?, token?: 'USDT'|'USDC', blocksToScan?: number }
   * @returns {Promise<{ confirmed: boolean, txHash?: string, amount?: string, token?: string, blockNumber?: number }>}
   */
  async checkPaymentReceived(options = {}) {
    const {
      expectedAmountRaw,
      merchantAddress,
      token = null,
      blocksToScan = DEFAULT_BLOCKS_TO_SCAN
    } = options;

    const expected = BigInt(expectedAmountRaw);
    const tolerance = (Number(expected) * AMOUNT_TOLERANCE_PERCENT) | 0;

    const transfers = await this.scanTransfers({
      merchantAddress,
      token,
      blocksToScan
    });

    for (const t of transfers) {
      const value = BigInt(t.value);
      if (value >= expected - BigInt(tolerance) && value <= expected + BigInt(tolerance)) {
        return {
          confirmed: true,
          txHash: t.txHash,
          amount: t.value,
          token: t.token,
          blockNumber: t.blockNumber
        };
      }
    }

    return { confirmed: false };
  }

  /**
   * Confirma se um txHash corresponde a um Transfer para o merchant (por receipt + logs).
   * Redundancia: chamar apos webhook ou quando webhook falhar.
   *
   * @param {string} txHash - Hash da transacao
   * @param {string} [merchantAddress] - Carteira que deve ter recebido
   * @returns {Promise<{ confirmed: boolean, amount?: string, token?: string }>}
   */
  async confirmPayment(txHash, merchantAddress) {
    const merchant = (merchantAddress || this.merchantWallet).toLowerCase();
    if (!merchant) {
      throw new Error('ChainScanner.confirmPayment: configure MERCHANT_WALLET_ADDRESS ou passe merchantAddress.');
    }

    const client = this._getClient();
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== 'success') {
      return { confirmed: false };
    }

    const contractAddresses = [this.usdtContract, this.usdcContract];
    for (const addr of contractAddresses) {
      const logs = await client.getLogs({
        address: addr,
        blockNumber: receipt.blockNumber,
        event: transferEventAbi,
        args: { to: merchant }
      });
      const fromTx = logs.filter((l) => l.transactionHash === txHash);
      if (fromTx.length > 0) {
        const log = fromTx[0];
        return {
          confirmed: true,
          amount: String(log.args.value),
          token: this._tokenName(addr)
        };
      }
    }

    return { confirmed: false };
  }

  getLastScannedBlock() {
    return this.lastScannedBlock;
  }

  isConfigured() {
    return Boolean(this.rpcUrl && this.merchantWallet);
  }
}

let instance = null;

function getChainScanner() {
  if (!instance) {
    instance = new ChainScanner();
  }
  return instance;
}

module.exports = {
  ChainScanner,
  getChainScanner,
  TRANSFER_TOPIC,
  DEFAULT_BLOCKS_TO_SCAN
};
