<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
```text
========================================
         F L O W P A Y - ROADMAP
========================================
     PROTOCOLO NΞØ - FASES 2 A 12
========================================
```

▓▓▓ FASE 2: BLINDAGEM & HARDENING
────────────────────────────────────────
Objetivo: Matar o erro do checkout
e elevar o padrão de segurança.

└─ Self-host de libs críticas
└─ CSP fechada (nonce/sha256)
└─ SRI em assets externos
└─ 0 uso de unsafe-eval

Metas: Sem bloqueios CSP, TTI < 2s.
Prazo: D+1.

▓▓▓ FASE 3: CHECKOUT MODULAR
────────────────────────────────────────
Objetivo: Desacoplar meios de pagto.

└─ Adapter pattern (Pix/Cripto)
└─ Interface única PaymentProvider
└─ Webhook idempotente c/ retries
└─ Verificação de assinaturas

Metas: 99.9% de sucesso no fluxo.
Prazo: D+2 ~ D+3.

▓▓▓ FASE 4: TRANSPARÊNCIA VIVA
────────────────────────────────────────
Objetivo: Confiança por auditoria.

└─ Log público (redigido) de txs
└─ Playground de webhooks
└─ Status de serviços & RPCs
└─ Latência em real-time

Metas: 0 dúvidas de suporte.
Prazo: D+4.

▓▓▓ FASE 5: AUTO-CUSTÓDIA UX
────────────────────────────────────────
Objetivo: Usuário é dono da chave.

└─ Wizard "Sua chave, sua regra"
└─ Carteira seed fora do app
└─ Copy educativa in-product
└─ Bloqueio de capturas/prints

Metas: >70% entendem auto-custódia.
Prazo: D+5.

▓▓▓ FASE 6: SPEC PÚBLICA & OPEN
────────────────────────────────────────
Objetivo: Ecossistema replicável.

└─ SPEC.md (fluxos e eventos)
└─ SECURITY.md & CONTRIBUTING.md
└─ Licença permissiva (MIT)
└─ No keys, no data policy

Metas: Primeiro PR externo.
Prazo: D+6.

▓▓▓ FASE 7: RESILIÊNCIA
────────────────────────────────────────
Objetivo: Melhora sob stress.

└─ Fila de reconciliação (jobs)
└─ Circuit breaker p/ providers
└─ Chaos tests automatizados
└─ Fallback Pix/Cripto

Metas: MTTR < 10min.
Prazo: D+7 ~ D+8.

▓▓▓ FASE 8: PERF & CUSTOS
────────────────────────────────────────
Objetivo: Rápido e barato.

└─ Edge cache & bundle splitting
└─ Métrica de custo por tx
└─ Alertas de custos anômalos

Metas: p95 < 2.5s.
Prazo: D+9.

▓▓▓ FASE 9: DEVEX & SDKS
────────────────────────────────────────
Objetivo: Integração em minutos.

└─ SDK JS (@flowpay/sdk)
└─ Exemplos Next.js & Vanilla
└─ CLI: flowpay init/verify

Metas: Tempo integração < 30min.
Prazo: D+10 ~ D+12.

▓▓▓ FASE 10: LANÇAMENTO NΞØ
────────────────────────────────────────
Objetivo: Protocolo, não produto.

└─ VSL curta (60-90s)
└─ Página Manifesto
└─ Post técnico "Start Here"

Metas: 1º cohort de integração.
Prazo: D+13 ~ D+14.

▓▓▓ FASE 11: GOVERNANÇA MÍNIMA
────────────────────────────────────────
Objetivo: Decisões transparentes.

└─ RFCs leves via issues
└─ Roadmap público (Kanban)
└─ Policy de divulgação coordenada

Metas: Time de review < 72h.
Prazo: D+15.

▓▓▓ FASE 12: EXPANSÕES
────────────────────────────────────────
Objetivo: Satélites, não monólitos.

└─ Novos On-ramps & Stablecoins
└─ Plugins No-code (Embeds)
└─ Badge de verificação cripto

Metas: Adoção cross-stack.
Prazo: Contínuo.

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Explits find no refuge here.
────────────────────────────────────────
