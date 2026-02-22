# FLOWPAY ⟁ CRITICAL ROADMAP

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
.   S Y S T E M   F L O W   O V E R V I E W               .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
.   ⦿ WOOVI API (PIX) ....... Webhook Ingress             .
.   ⍟ FLOWPAY ENGINE ........ HMAC Validation             .
.   ⧉ NΞØ TUNNEL ............ State Sync                  .
.   ◱ SMART FACTORY ......... Asset Minting               .
.   ⟠ PROOF OF INTEGRITY .... Settlement                  .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

Priority-ordered execution plan for security and scalability.

**Status**: Phase Transition (v1.2.0) — Sprint 4 Concluído ⦿

────────────────────────────────────────

## SPRINT 01 - SEGURANÇA FINANCEIRA

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. ITEM ................. DESCRIPTION ........... STATUS . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Auth Session ......... HMAC-SHA256 Cookies .... [ ⦿ ]   .
. Webhook Tests ........ HMAC/Idempotency ....... [ ⦿ ]   .
. DB Migration ......... SQLite -> Neon ......... [ ⦿ ]   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

## SPRINT 02 - FUNCIONALIDADES

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. ITEM ................. DESCRIPTION ........... STATUS . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Admin Trans .......... Listagem/Stats ......... [ ⦿ ]   .
. Admin Settings ....... Health/Env Check ....... [ ⦿ ]   .
. Admin Logs ........... Audit Log / Search ..... [ ⦿ ]   .
. Admin API ............ Server-side Logs ....... [ ⦿ ]   .
. Seller Actions ....... Delete/Edit Buttons .... [ ⦿ ]   .
. QuickNode ............ ERC-20 Processing ...... [ ⦿ ]   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

## SPRINT 03 - QUALIDADE

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. ITEM ................. DESCRIPTION ........... STATUS . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Service Tests ........ Email/DB/Config Suite .. [ ⦿ ]   .
. CSP Middleware ....... HTTP Header Auth ....... [ ⦿ ]   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

## SPRINT 04 - OTIMIZAÇÃO (LEVEL 4)

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. ITEM ................. DESCRIPTION ........... STATUS . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Perf LCP ............. Preload/DNS Prefetch ... [ ⦿ ]   .
. HTTP Caching ......... Immutable (1 Year) ..... [ ⦿ ]   .
. E2E Playwright ....... 18 User Journeys ....... [ ⦿ ]   .
. CI/CD Config ......... WebServer/Viewports .... [ ⦿ ]   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

## RESOLVIDO RECENTEMENTE

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. EVENT ................ DESCRIPTION ........... STATUS . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Magic Link ........... Ativação real Resend ... [ ⦿ ]   .
. Admin Panel .......... Interface /users ....... [ ⦿ ]   .
. CSP Refactor ......... Sentry Unblocked ....... [ ⦿ ]   .
. CSS Preload .......... Render-blocking Fix .... [ ⦿ ]   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

## PRÓXIMOS PASSOS ⟁ BACKLOG

```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
. TASK ................. STATUS ................ ACTION . .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
. Sessão Híbrida ....... [ PEND ] .............. Fix Log  .
. Fase 03 Checkout ..... [ PLAN ] .............. Architect.
. Fase 04 Transparên ... [ PLAN ] .............. Design   .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```

────────────────────────────────────────

▓▓▓ NΞØ MELLØ

────────────────────────────────────────
Core Architect · NΞØ Protocol

"Focus on the critical path. Security is non-negotiable."
────────────────────────────────────────
