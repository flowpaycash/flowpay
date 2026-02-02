# Smart Wallet Service (Pilar 1)

Account Abstraction (ERC-4337) para FlowPay Sovereign v3.

**Origem legada:** `/Users/nettomello/CODIGOS/delegation-toolkit/integrate-token-smart-accounts.ts`

**Arquivo:** `smart-account.js` – `SmartWalletService` com `createWallet()` e `executeTransaction()`.

**Status:** Portado e adaptado. Lógica de:

- `toMetaMaskSmartAccount` + `createInfuraBundlerClient` (import dinâmico de `@metamask/smart-accounts-kit`)
- `sendUserOperation` (gasless) ou `sendTransaction` (fallback)
- ERC-20 transfer via encodeCalls/encodeFunctionData

**Dependência opcional:** `npm install @metamask/smart-accounts-kit` (sem ela, createWallet/executeTransaction indicam instalação).

**Variaveis:** `BUNDLER_URL` ou `INFURA_API_KEY`, `PRIVATE_KEY` ou `SERVICE_WALLET_PRIVATE_KEY`, `QUICKNODE_POLYGON_RPC` (ver `.env.example`).

**Docs:** `docs/TASK-001-sovereign-integration.md`, `extensions/flowpay/legacy-audit-report.json`.
