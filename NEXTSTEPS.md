<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
       FLOWPAY · CRITICAL ROADMAP
             NEXT STEPS
========================================
```

Priority-ordered execution plan for security and scalability.
**Status:** Phase Transition (v1.0.1)

────────────────────────────────────────

## 🔴 CRITICAL (Level 1)
*Financial Security & Data Integrity*

### 1. Dashboard Authentication Fix (URGENT)
Current implementation uses unauthenticated base64 encoding `btoa(email:timestamp)`.
- **Vulnerability:** Trivial to forge `x-user-token` headers.
- **Fix:** Implement signed session cookies or JWT with a secure `DASHBOARD_SECRET`.
- **Files:** `src/pages/api/user/buttons.js`, `src/pages/dashboard.astro`.

### 2. Financial Webhook Testing suite
Zero coverage for the PIX payment confirmation flow (Woovi → HMAC → DB → Bridge).
- **Target:** Create `tests/webhook.test.js`.
- **Must cover:** HMAC validation, Idempotency, Status transitions.

### 3. Database Migration: Neon PostgreSQL
Move from local SQLite (Railway Volume) to **Neon PostgreSQL** for production-grade backups and scalability.
- **Status:** Schema definition complete in `NEXTSTEPS.md`.
- **Action:** Create migration scripts in `migrations/`.

────────────────────────────────────────

## 🟠 HIGH (Level 2)
*Incomplete Functionality*

### 4. Admin Dashboard Completion
Several administrative routes are currently returning 404.
- **Routes to build:** `/admin/transactions`, `/admin/settings`, `/admin/logs`.

### 5. Seller Dashboard Features
- **Integrate:** Delete/Edit links (`DELETE /api/user/buttons/:id`).
- **Stats:** View payment history and total received per link.

### 6. QuickNode Event Processing
Incoming crypto events are received but not processed.
- **Action:** Update `src/pages/api/webhooks/quicknode.js` to confirm USDT/USDC arrivals.

────────────────────────────────────────

## 🟡 MEDIUM (Level 3)
*Maintainability & Quality*

### 7. Global Service Testing
Lack of isolated tests for critical services:
- **Email (Resend):** Test template rendering and API failover.
- **Rate Limiter (Redis):** Validate windows and fallback logic.
- **Config Validator:** Ensure all critical ENV vars are present at startup.

### 8. Content Security Policy (Middleware)
Move CSP from HTML meta tags to server-side `src/middleware.js` as an HTTP header.

────────────────────────────────────────

## 🟢 LOW (Level 4)
*Optimization & Polishing*

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

────────────────────────────────────────

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol

"Focus on the critical path. Security is non-negotiable."
────────────────────────────────────────
