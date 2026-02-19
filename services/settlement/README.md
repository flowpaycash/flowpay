# Settlement Engine (Pilar 2)

Motor de liquidacao ERC-20 (USDT/USDC) com suporte gasless.

**Origem legada:** `/Users/nettomello/CODIGOS/neo_systems/neo_one/src/executors/neoflow-executor.js` + `neoflow-contract.js`

**Arquivo:** `engine.js` – `SettlementEngine` integrado a `quicknode-settlement.js`.

**Status:** Portado e adaptado. Transferencia direta (viem `writeContract`) + gasless: quando `gasless=true`, delega a `getSmartWalletService().executeTransaction()` (Bundler/UserOps). Equivalente ao `transfer_neoflow` com flag gasless e ao `contract.call('transfer', ..., { gasless: true })` do neo_one (no FlowPay gasless = SmartWalletService, nao Thirdweb).

**Uso:** `getSettlementEngine().transfer({ to, amountWei, token, gasless })`, `balanceOf(address, token)`.

**Variaveis:** `SERVICE_WALLET_*`, `QUICKNODE_POLYGON_RPC` / `QUICKNODE_BSC_RPC`, `USDT_SETTLEMENT_NETWORK` (ver `.env.example`).

**Docs:** `docs/TASK-001-autonomous-integration.md`, `extensions/flowpay/legacy-audit-report.json`.
