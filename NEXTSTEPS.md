<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
       FLOWPAY · CRITICAL ROADMAP
             NEXT STEPS
========================================
```

Priority-ordered execution plan for security and scalability.
**Status:** Phase Transition (v1.1.0) — Sprint 1 & 2 concluídos ✅

────────────────────────────────────────

## 🟢 COMPLETED (Sprint 1 — Segurança Financeira)

| Item | Description | Status |
|------|-------------|--------|
| Auth Session | HMAC-SHA256 signed cookies + `verifySessionToken` | ✅ Done |
| Webhook Test Suite | `tests/webhook.test.js` — HMAC, idempotência, status transitions | ✅ Done |
| DB Migration Neon | `migrations/001_initial_schema.sql` + `002_migrate_sqlite_to_neon.js` | ✅ Done |

## 🟢 COMPLETED (Sprint 2 — Funcionalidades)

| Item | Description | Status |
|------|-------------|--------|
| Admin Transactions | `/admin/transactions` — listagem com stats + ação de conclusão | ✅ Done |
| Admin Settings | `/admin/settings` — health check + status das ENV vars | ✅ Done |
| Admin Logs | `/admin/logs` — audit log com busca, filtros e paginação | ✅ Done |
| Admin Logs API | `GET /api/admin/logs` — server-side com filtro por tipo | ✅ Done |
| Seller Delete/Edit | `DELETE /PATCH /api/user/buttons/[id]` com soft-delete + ownership | ✅ Done |
| QuickNode Processing | `quicknode.js` — processa USDT/USDC ERC-20, atualiza DB e notifica Nexus | ✅ Done |

## 🟢 COMPLETED (Sprint 3 — Qualidade)

| Item | Description | Status |
|------|-------------|--------|
| Service Tests | `tests/services/services.test.js` — Email, Rate Limiter, Config, DB | ✅ Done |
| CSP Middleware | `src/middleware.js` — CSP movido de meta tag para HTTP header | ✅ Done |

────────────────────────────────────────

## 🟡 PENDING (Level 4 — Otimização)

### 9. Performance & Lighthouse

- Configure LCP image discovery (preload).
- Implement long-lived caching for static assets in `/public/css/`.

### 10. E2E Testing (Playwright)

Simulate full user journeys: from PIX selection to QR code payment and bridge confirmation.

────────────────────────────────────────

## ✅ RECENTLY RESOLVED

| Event | Description | Status |
|-------|-------------|--------|
| CSP Refactor | Unblocked Sentry and Sentry Worker | ✅ Fixed |
| CSS Preload | Resolved render-blocking stylesheets | ✅ Fixed |
| Admin Panel | Initial `/admin/users` listing + Action buttons | ✅ Live |
| Auth Session | HMAC-SHA256 sessions (substituiu btoa inseguro) | ✅ Fixed |
| Webhook Tests | Suite completa PIX: HMAC + idempotência + status | ✅ Done |
| Neon Migration | Schema SQL + script de migração SQLite → PostgreSQL | ✅ Done |
| Admin Routes | `/transactions`, `/settings`, `/logs` — todas funcionais | ✅ Done |
| QuickNode | USDT/USDC ERC-20 settlement com Nexus Bridge | ✅ Done |
| CSP Header | Migrado de meta tag para HTTP header no middleware | ✅ Done |

────────────────────────────────────────

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol

"Focus on the critical path. Security is non-negotiable."
────────────────────────────────────────
