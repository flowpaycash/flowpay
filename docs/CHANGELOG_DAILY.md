# 📊 FLOWPay - Diário de Bordo NΞØ

```text
========================================
       F L O W P A Y - STATUS
========================================
      DIÁRIO DE BORDO NΞØ
========================================
```

## ▓▓▓ CHANGELOG: 08-FEB-2026

────────────────────────────────────────
**"SANDBOX COMPATIBILITY & AUTH BUNDLING OPTIMIZATION"**

### └─ Agent Sandbox Standards (Critical Discovery)
- **Problem**: Claude Code sandbox reads `.gitignore` and blocks writes to all listed paths (e.g., `.astro/`), causing build failures (`EPERM`).
- **Solution**: Creation of `.agyignore` to override behavior, allowing writes to build artifacts while protecting sensitive secrets.
- **Automation**: Updated `package.json` with `prebuild` scripts to ensure a clean state before every compilation.

### └─ Auth Logic & UX
- **Refactor**: Optimized dynamic script loading in `login.astro`.
- **Race Condition Prevention**: Implemented `loadScriptOnce` to prevent duplicate provider injections.
- **UX Feedback**: Added `loading-spinner` and disabled button states during authentication module fetching.

### └─ Type Safety & Code Quality
- **TS Fixes**: Removed unused variables (`addressDisplay` in Navbar) and cleaned parameters in Checkout to eliminate `ts(6133)` warnings.
- **Engine Consistency**: Updated Node.js requirement to `>=20.x` in `package.json` for environment alignment.

────────────────────────────────────────

## ▓▓▓ CHANGELOG: 05-FEB-2026


────────────────────────────────────────
**"PROOF-OF-EXECUTION & AUTONOMOUS AUTHENTICATION"**

### └─ Proof-of-Execution (PoE)
- **Engine**: Implementação de Merkle Tree SHA-256 (`merkle.js`).
- **Service**: `poe-service.js` orquestrando batches criptográficos.
- **Persistence**: Tabela `poe_batches` integrada e migrada.
- **Evidence**: Ordens agora são vinculadas a raízes Merkle ancoradas em Base L2.

### └─ Auth & Security
- **Magic Link**: Login passwordless completo (API + DB + Token logic).
- **Security Audit Suite**: Novo diretório `scripts/tests/` com auditoria de headers, segurança de webhook e integridade de DB.
- **Global Middleware**: Header protection (HSTS, CSP, X-Frame) forçado em todas as rotas via Astro middleware.
- **CSP Upgrade**: Suporte oficial para Cloudflare Insights beacon.

### └─ UI/UX Refinement
- **Branding**: Logo oficial integrada no Checkout e Navbar com efeitos neon.
- **Modernization**: Remoção de APIs legadas (`execCommand`) em favor de `navigator.clipboard`.

## ▓▓▓ CHANGELOG: 02-FEB-2026

────────────────────────────────────────
**"AESTHETIC & SECURITY CORE + DEPLOYMENT RESILIENCE"**

### └─ UI/UX Rebirth

- Hero: Logo ampliada (200px) + glow.
- Theme: Dark Glassmorphism global.
- Components: Navbar/Features/Footer.

### └─ Autonomous Engine

- Fix: SQLite local persistence.
- Refactor: README/ROADMAP (NEO Std).

### └─ Phase 2 (Initiated)

- CSP Hardening: Meta tags aplicadas.
- SEO: OpenGraph & Twitter Cards.
- Robots: Optimized Disallow rules.

### └─ Infrastructure & Stability

- Railway: Custom `railway.toml` com healthcheck tuning (300s).
- Server: Ajuste de porta SSR (4321) e rota de health para deploy estável.
- DevOps: Fluxo de build otimizado para Railway.

### └─ Repository

- Tag: `v2.0.0-soberania` pushed.

## ▓▓▓ NEXT STEPS: O CAMINHO NΞØ

────────────────────────────────────────
**"DA BLINDAGEM À SOBERANIA TOTAL"**

### └─ [CURTO PRAZO] Fase 2 - Hardening

- Finalizar self-host de Web3Auth.
- Eliminar `unsafe-eval` residuais.
- Validação final de CSP no Checkout.

### └─ [MÉDIO PRAZO] Fase 3 & 4

- Modularização: Adapter Pix/USDT.
- Rota `/transparency` (Observabilidade).
- Verificação de assinatura (Proof).

### └─ [LONGO PRAZO] Fase 7 & 10

- Settlement Engine (Set-and-forget).
- Lançamento do Manifesto Open NΞØ.

## ▓▓▓ PLANO DE CONCLUSÃO (D+15)

────────────────────────────────────────
D+1: Blindagem CSP/SRI concluída.
D+3: Checkout 100% modular (Drivers).
D+5: UX de Auto-custódia (Wizard).
D+10: SDK & DevEx (Open Integration).
D+15: Protocolo Público & Governável.

────────────────────────────────────────
STATUS: SOBERANO & PROTEGIDO
────────────────────────────────────────

## ▓▓▓ NΞØ MELLØ

────────────────────────────────────────
Core Architect · NΞØ Protocol
<neo@neoprotocol.space>

"Code is law. Expand until
 chaos becomes protocol."
────────────────────────────────────────
