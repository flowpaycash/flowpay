<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
```text
========================================
       FLOWPay - TECHNICAL SETUP
========================================
Environment: Node.js / Astro
Deploy: Netlify Functions (Astro)
========================================
```

▓▓▓ REQUIREMENTS
────────────────────────────────────────
└─ Node.js >= 18.0.0
└─ Netlify CLI (for local functions)
└─ API Keys (WooVi, QuickNode)

▓▓▓ QUICK START
────────────────────────────────────────
1. Install dependencies:

   ```bash
   npm run setup
   ```

2. Generate local config:

   ```bash
   npm run neo:cfg
   ```

3. Run in Dev Mode:

   ```bash
   # Full stack (Frontend + Functions)
   netlify dev

   # Pure Frontend (Astro only)
   npm run dev
   ```

▓▓▓ COMMAND REFERENCE
────────────────────────────────────────
[####] npm run build ......... Build app
[####] npm run test .......... Run tests
[####] npm run neo:build ..... NEO Assets
[####] npm run preview ....... Local preview

▓▓▓ ENVIRONMENT VARIABLES (.env)
────────────────────────────────────────
└─ WOOVI_API_KEY
└─ WOOVI_WEBHOOK_SECRET
└─ QUICKNODE_POLYGON_RPC
└─ SERVICE_WALLET_PRIVATE_KEY
└─ ADMIN_PASSWORD

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────
