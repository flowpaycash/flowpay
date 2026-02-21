<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
       FLOWPAY · SETTLEMENT ENGINE
========================================
```

Autonomous Settlement Gateway for the NΞØ Protocol.
Converting Web2 liquidity into Web3 sovereignty.

> **Node:** mio-flowpay  
> **Infrastructure:** Railway + NΞØ Tunnel + NΞØ Nexus  
> **Version:** v1.0.1  

────────────────────────────────────────

## 🛰️ Architectural Vision

**FlowPay** is the deterministic settlement engine of the NΞØ ecosystem. 
It orchestrates the conversion of Web2 capital (PIX/WooVi) into Web3 assets, 
utilizing an isolated **Relayer Proxy** architecture to ensure the 
sovereignty of private keys.

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ SYSTEM FLOW
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ 🟢 WOOVI API (PIX)
┃    └─ Webhook Ingress
┃
┃ 🛡️ FLOWPAY ENGINE
┃    └─ HMAC-SHA256 Validation
┃    └─ SQL Alchemy (SQLite/Neon)
┃
┃ 🔗 NΞØ TUNNEL / NEXUS
┃    └─ State Synchronization
┃
┃ 🏭 SMART FACTORY
┃    └─ Digital Asset Minting
┃
┃ 💎 PROOF OF INTEGRITY (PoI)
┃    └─ Blockchain Settlement
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

────────────────────────────────────────

## 🛡️ Triple Blinded Security

FlowPay's defense is built on three sovereign pillars:

1.  **Segregation:** FlowPay does NOT store `MINTING_KEYS`. It only requests executions to the Factory via secure, encrypted channels.
2.  **Auditability:** Every transaction is accompanied by a **Proof of Integrity (PoI)** signed by Neobot.
3.  **Network Isolation:** Communication via **NΞØ Tunnel** with mandatory `TUNNEL_SECRET` handshake.

────────────────────────────────────────

## 📂 Project Structure

```text
flowpay/
├── src/
│   ├── pages/api/      Serverless endpoints (Astro)
│   ├── services/       Core business logic
│   └── layouts/        Checkout & Admin UI
├── docs/               Sovereign documentation library
├── tests/              Financial integrity test suite
├── tools/              Ecosystem config generators
└── schemas/            Data integrity definitions
```

────────────────────────────────────────

## 🚀 Navigation

| Guide | Purpose | Link |
|-------|---------|------|
| **[SETUP.md](./SETUP.md)** | Technical setup & operation | [View](./SETUP.md) |
| **[NEXTSTEPS.md](./NEXTSTEPS.md)** | Critical roadmap & pending fixes | [View](./NEXTSTEPS.md) |
| **[DOCS INDEX](./docs/README.md)** | Complete technical documentation | [View](./docs/README.md) |

────────────────────────────────────────

## ⚖️ Legal Status & IP

- **Lead Architect:** Eurycles Ramos Neto / NODE NEØ
- **Sovereignty:** All architecture is sealed and timestamped.
- **Licenses:** MIT (Engine) / CC BY 4.0 (Docs).

---

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Settlement finalized. Sovereign assets unlocked."
────────────────────────────────────────
