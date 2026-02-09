# Chain Monitor (Pilar 3)

Scanner de blocos para pagamentos ERC-20 (redundancia ao webhook).

**Origem legada:** `/Users/nettomello/CODIGOS/web_apps/projetos_flowpay/FlowPAY/crypto.py` (`check_erc20_token_payment`)

**Arquivo:** `chain-scanner.js` – `ChainScanner` com `scanTransfers()`, `checkPaymentReceived()` e `confirmPayment()`.

**Status:** Portado e adaptado. Lógica de:

- Varredura dos ultimos N blocos (default 200) via viem `getLogs`
- Evento `Transfer(address,address,uint256)` filtrado por `to = merchant`
- Tolerancia de valor (1%) e confirmacao por txHash (receipt + logs)

**Uso:** `getChainScanner().scanTransfers({ merchantAddress, blocksToScan })`, `checkPaymentReceived({ expectedAmountRaw, merchantAddress })`, `confirmPayment(txHash)`.

**Variaveis:** `QUICKNODE_POLYGON_RPC` (ou `QUICKNODE_ETHEREUM_RPC` ou `INFURA_API_KEY`), `MERCHANT_WALLET_ADDRESS` (ou `SERVICE_WALLET_ADDRESS`), `USDT_CONTRACT_ADDRESS`, `USDC_CONTRACT_ADDRESS`.

**Docs:** `docs/TASK-001-autonomous-integration.md`, `extensions/flowpay/legacy-audit-report.json`.
