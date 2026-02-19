<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
```text
========================================
     FLOWPay - SYSTEM OVERVIEW
========================================
Audit Phase: JAN/2026
Status: SECURE & STABLE
========================================
```

Este documento detalha o ecossistema
FLOWPay, auditoria de segurança e
o roadmap de evolução técnica.

▓▓▓ ARQUITETURA & FLOW
────────────────────────────────────────
O FLOWPay atua como bridge entre
BRL (PIX) e ativos digitais (USDT).

└─ Money Flow:
   └─ Frontend (Astro) coleta wallet
   └─ Woovi gera cobrança PIX
   └─ Webhook confirma recebimento
   └─ Liquidação assistida (USDT)
   └─ Execução On-chain via Viem

▓▓▓ SECURITY AUDIT (JAN/2026)
────────────────────────────────────────
[####] Precisão BigInt ............ OK
[####] Timing Attacks Shield ....... OK
[####] XSS Toast Protection ....... OK
[####] Prod Debug Disabled ......... OK
[####] Wallet Checksum ............ OK
[####] Real USDT Transfer ......... OK

────────────────────────────────────────
REVISÃO TÉCNICA
────────────────────────────────────────
- Aritmética baseada em centavos
  evita erros de rounding em BRL.
- Assinaturas HMAC validadas com
  timingSafeEqual no Webhook.
- Implementação real de transferência
  substitui placeholders/mocks.

▓▓▓ STATUS DO SISTEMA
────────────────────────────────────────
[####] Checkout UI ................ OK
[####] Woovi Integration .......... OK
[####] Webhook Security ........... OK
[####] USDT Transfer .............. OK
[####] Logs & Debug ............... OK

▓▓▓ TECH DEBT & FAILURES
────────────────────────────────────────
└─ O que falta:
   └─ Banco de Dados (PostgreSQL)
      Ciclo de vida de ordens.
   └─ Admin Dashboard
      Interface de aprovação.
   └─ Liquidity API
      Taxas em tempo real.
   └─ Retry System
      Fila de retentativas.
   └─ Liquidity Monitor
      Alertas de saldo baixo.

REXOMENDAÇÃO: O sistema é estável p/
transações baixas (manual). Escala
exige Persistência e Dashboard.

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────
