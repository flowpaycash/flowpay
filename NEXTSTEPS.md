# NEXTSTEPS.md · FLOWPAY
> Roadmap técnico priorizado — gerado pós-deploy `feat(auth)` + `fix(checkout)` + `fix(ui)`
> Baseado em gap analysis real da sessão de arquitetura.

---

## LEGENDA

```
🔴 CRÍTICO     · Risco em produção hoje
🟡 IMPORTANTE  · Risco em escala / experiência
🟢 EVOLUÇÃO    · Melhoria arquitetural planejada
⬜ BACKLOG     · Futuro, sem urgência
```

---

## SPRINT ATUAL · PÓS-DEPLOY IMEDIATO

### 🔴 S1 · Smoke Test de Produção
**Validar os três commits em ambiente real antes de liberar tráfego.**

```
[ ] Cadastro com @flowpay.cash → magic link chega via Resend
[ ] Log [AUTO-APPROVE] aparece no Railway Logs
[ ] Simular SETTLEMENT_FAILED → tela de erro aparece, QR permanece
[ ] Vendedor sem avatar → página /pay/[id] não quebra
```

**Critério de saída:** todos os quatro itens passando em produção.

---

### 🔴 S2 · Ativar AUTO_APPROVE em Produção
**Hoje está `false`. Só ativar após S1 confirmado.**

```
[ ] S1 concluído
[ ] Railway Variables → AUTO_APPROVE=true
[ ] Novo deploy de variável (sem código novo)
[ ] Confirmar que próximo cadastro real é aprovado automaticamente
```

**Risco se pular S1:** usuário real recebe magic link quebrado em prod.

---

## SPRINT 2 · ESTABILIZAÇÃO

### ✅ E1 · Mapear todos os estados de erro no frontend
**CONCLUÍDO (PR #18)**
- Estados de NETWORK_ERROR e TIMEOUT agora possuem UX dedicada.
- Implementado fallback de formulário local para evitar recarregamento de página.
- Adicionado CODEOWNERS para proteção de arquivos críticos.

**Prompt para o agente:**
```
Liste todos os status possíveis que uma order pode ter 
no sqlite.mjs. Para cada um, me diz se existe handler 
no frontend de pay/[id].astro. Formato: 
STATUS | EXISTE HANDLER | COMPORTAMENTO ATUAL
```

---

### ✅ E2 · Rate Limiting no Cadastro
**CONCLUÍDO (PR #19)**
- Implementado `rate-limiter-flexible` com Redis.
- Limites independentes por IP e Email.
- Fail-open garantido em caso de indisponibilidade do Redis.

---

### ✅ E3 · TTL do Magic Link visível pro usuário
**CONCLUÍDO (PR #19)**
- Template de e-mail atualizado para exibir expiração em minutos.
- `magic-verify.js` com mensagens de erro claras para tokens expirados.

---

### ✅ E4 · Verificar Redis como fonte primária no magic-verify.js
**CONCLUÍDO (PR #19)**
- `magic-verify.js` agora consulta o Redis antes do SQLite (Redis-First).
- TTL nativo do Redis gerencia expiração sem necessidade de cleanup manual.

---

## SPRINT 3 · ESCALA

### 🟢 A1 · Migrar Polling → Server-Sent Events (SSE)
**Polling a cada 3s funciona, mas não escala com volume.**

```
Threshold para migrar: ~50 checkouts simultâneos
Implementação: GET /api/charge/[id]/stream (SSE)
Frontend: EventSource API (nativo, sem lib)
Fallback: manter polling como fallback se SSE falhar
```

**Não é urgente. É o próximo salto de arquitetura.**

---

### 🟢 A2 · Dashboard de Métricas do Vendedor
**Hoje o vendedor não vê nada além dos botões criados.**

```
Métricas mínimas viáveis:
- Total recebido (BRL)
- Número de pagamentos confirmados
- Taxa de conversão (gerou PIX vs confirmou)
- Últimas transações com status
```

---

### 🟢 A3 · Webhook de Notificação para o Vendedor
**Hoje só o comprador recebe email. O vendedor não é notificado.**

```
[ ] Ao COMPLETED: disparar email ao vendedor via Resend
    template: "Novo pagamento recebido · R$ X"
[ ] Futuro: webhook configurável pelo vendedor (URL própria)
```

---

### 🟢 A4 · Auto-aprovação com KYC mínimo
**Hoje AUTO_APPROVE=true aprova qualquer email. Sem critério de confiança.**

```
Critérios possíveis (escolher um):
- Email verificado (clicou no link de confirmação)
- CPF válido no cadastro
- Allowlist de domínios corporativos
- Score baseado em comportamento (futuro)
```

---

## BACKLOG · SEM URGÊNCIA

### ⬜ B1 · Migração SQLite → Postgres
**Só faz sentido com múltiplas instâncias em paralelo.**
WAL + Railway NVMe aguenta o estágio atual.
Trigger: quando Railway precisar de múltiplos workers.

---

### ⬜ B2 · SDK FlowPay para desenvolvedores
**Hoje integração é via link ou API REST direta.**
SDK npm que abstrai create-charge + polling em uma chamada.

---

### ⬜ B3 · Página de status pública
**status.flowpay.cash mostrando uptime de Woovi, Redis, Railway.**
Reduz suporte quando há incidente externo.

---

## MAPA DE DEPENDÊNCIAS

```
S1 (smoke test)
  └→ S2 (ativar auto-approve)
       └→ E2 (rate limit cadastro)

E4 (Redis no verify)
  └→ A1 (SSE)

E1 (mapear erros)
  └→ A3 (notificação vendedor)
       └→ A2 (dashboard)
```

---

## RESUMO EXECUTIVO

```
HOJE        → ✅ S1 + S2 (smoke test + ativar auto-approve)
ESTA SEMANA → ✅ E1 + E2 + E3 + E4 (erros, rate limit, TTL, Redis-verify)
PRÓXIMAS    → 🟡 A3 (email vendedor) + 🟢 A2 (dashboard métricas)
TRIMESTRE   → 🟢 A1 (SSE)
```
