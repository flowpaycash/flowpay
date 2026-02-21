<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
       FLOWPAY · SETUP GUIDE
========================================
```

Technical Configuration and Operational Manual.
Sovereign Node: mio-flowpay (Settlement).

────────────────────────────────────────

## 🏗️ System Requirements

- **Node.js:** v22.x (Sovereign Environment)
- **Database:** SQLite (Temporary) / Neon PostgreSQL (Production)
- **Infrastructure:** Railway CLI
- **Network:** NΞØ Tunnel for local webhook exposure

────────────────────────────────────────

## 🛡️ Security Gates (Conditional Execution)

The engine enforces absolute validation gates. Failure in any gate results in immediate execution block:

1.  **HMAC GATE:** Validates the WooVi webhook signature. Prevents replay attacks and payload forgery.
2.  **TUNNEL GATE:** Layer 4/7 handshake using `TUNNEL_SECRET`. Ensures only authorized tunnels touch the Nexus.
3.  **FINALITY GATE:** On-chain state verification via **RPC Adapter**. Receipts are only issued after block confirmation and **Proof of Integrity (PoI)** generation.

────────────────────────────────────────

## 🔑 Environment Variables (.env)

| Variable | Technical Function | Severity |
| :--- | :--- | :--- |
| `TUNNEL_SECRET` | Tunnel authentication token | **CRITICAL** |
| `WOOVI_API_KEY` | PIX API communication key | **CRITICAL** |
| `WOOVI_WEBHOOK_SECRET` | HMAC validation secret | **CRITICAL** |
| `NEXUS_WEBHOOK_URL` | Nexus Core endpoint via Tunnel | **SYSTEM** |
| `QUICKNODE_RPC_URL` | On-chain monitoring endpoint | **SYSTEM** |

────────────────────────────────────────

## 🚀 Operational Workflow

### 1. Bootstrap
```bash
# Clean ecosystem installation
npm run setup
```

### 2. Sovereign Provisioning
```bash
# Generate local NΞØ assets and configurations
npm run neo:cfg
```

### 3. Local Development (with Tunnel)
```bash
# Start Railway local environment exposing endpoints
railway run npm run dev
```

### 4. Production Build
```bash
# Astro compilation for server mode
npm run build
```

────────────────────────────────────────

## 📊 Verification & Audit

FlowPay operates in a **Closed Loop**. To validate node health, use the integrated tools:

| Command | Action |
|---------|--------|
| `npm run test` | Run financial integrity test suite |
| `make check` | Execute health check for API, Tunnel, and RPC |
| `make logs` | Stream structured audit logs from DB |

────────────────────────────────────────

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol

"Infrastructure finalized. Flow established."
────────────────────────────────────────
