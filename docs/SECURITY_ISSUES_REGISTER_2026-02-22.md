# Registro de Problemas de Segurança e Confiabilidade

Data: 2026-02-22
Projeto: FlowPay
Origem: revisão estática do código (API, auth, webhooks, rate limit, sessão)

## Ordem mandatória de correção

Corrigir em ordem crescente dos números, sem pular etapa:

1. Rate limiting inativo em quase toda API
2. QuickNode webhook aceita payload sem assinatura
3. Exposição pública de status e identidade por e-mail
4. Segredo de sessão admin com fallback para senha admin
5. Webhook Woovi responde 200 em erro fatal
6. SIWE consome nonce antes de validar assinatura
7. Incompatibilidade de payload de sessão (wallet vs email)
8. Magic link sinaliza envio sem enviar

## Achados detalhados

### 1) Crítico - Rate limiting inativo

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Inclusão de `await` em todos os handlers com `applyRateLimit()`

Sintoma:

- `applyRateLimit()` retorna Promise, porém handlers tratam como valor síncrono.

Impacto:

- Brute force, spam, enumeração e flood sem contenção efetiva.

Evidências:

- `src/services/api/rate-limiter.mjs:212`
- `src/services/api/rate-limiter.mjs:216`
- `src/pages/api/create-charge.js:30`
- `src/pages/api/create-charge-landing.js:80`
- `src/pages/api/webhook.js:17`
- `src/pages/api/webhook/nexus.js:35`
- `src/pages/api/auth/magic-start.js:13`
- `src/pages/api/auth/siwe-challenge.js:11`
- `src/pages/api/auth/siwe-verify.js:12`
- `src/pages/api/charge/[id].js:21`
- `src/pages/api/auth/registro.js:11`

### 2) Crítico - QuickNode sem assinatura obrigatória

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Assinatura HMAC passou a ser obrigatória
- `QUICKNODE_WEBHOOK_SECRET` ausente agora bloqueia processamento
- Comparação de assinatura migrada para `crypto.timingSafeEqual`

Sintoma:

- Verificação HMAC só roda quando `secret && signature`; sem assinatura, fluxo segue.

Impacto:

- Forja de evento e possibilidade de liquidação fraudulenta.

Evidências:

- `src/pages/api/webhooks/quicknode.js:18`
- `src/pages/api/webhooks/quicknode.js:23`
- `src/pages/api/webhooks/quicknode.js:201`

### 3) Alto - Enumeração e vazamento de identidade

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Endpoint `/api/user/status` agora exige sessão válida (cookie/token assinado)
- Consulta por e-mail arbitrário removida
- Resposta com `name` e `userId` eliminada
- Rate limit dedicado adicionado (`user-status`)

Sintoma:

- Endpoint público retorna status, nome e ID por e-mail sem autenticação.

Impacto:

- Enumeração de base, vazamento de PII e engenharia social.

Evidências:

- `src/pages/api/user/status.js:4`
- `src/pages/api/user/status.js:25`

### 4) Alto - Fallback inseguro do segredo admin

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Fallback de `getSessionSecret()` para `ADMIN_PASSWORD` removido
- Assinatura de sessão admin agora depende apenas de segredos dedicados de token/sessão

Sintoma:

- Segredo de assinatura admin cai para `ADMIN_PASSWORD` se outros segredos não existem.

Impacto:

- Mistura de fronteiras entre autenticação e assinatura de sessão.

Evidências:

- `src/services/api/admin-auth.mjs:7`
- `src/services/api/admin-auth.mjs:12`

### 5) Alto - Webhook Woovi com ACK indevido em erro fatal

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Bloco de erro crítico em `src/pages/api/webhook.js` alterado para retorno `500`
- ACK falso positivo removido para preservar semântica de retry do provedor

Sintoma:

- Em erro crítico, endpoint retorna 200.

Impacto:

- Provedor pode não retentar; eventos válidos podem se perder.

Evidências:

- `src/pages/api/webhook.js:341`
- `src/pages/api/webhook.js:352`

### 6) Médio - SIWE com consumo prematuro de nonce

Status: `CONCLUÍDO`
Concluído em: 2026-02-22

Ação aplicada:

- Verificação criptográfica da assinatura SIWE passou a ocorrer antes do consumo de nonce
- Consumo de nonce movido para após assinatura válida, reduzindo vetor de nonce-burn DoS

Sintoma:

- Nonce é consumido antes da verificação criptográfica da assinatura.

Impacto:

- DoS de nonce (queima de nonce legítimo por tentativa inválida).

Evidências:

- `src/pages/api/auth/siwe-verify.js:45`
- `src/pages/api/auth/siwe-verify.js:55`

### 7) Médio - Sessão de wallet quebra rotas que exigem e-mail

Status: `PENDENTE`

Sintoma:

- SIWE salva `wallet`, mas endpoints de botões esperam `email`.

Impacto:

- Sessão válida pode falhar com erro de execução.

Evidências:

- `src/pages/api/auth/siwe-verify.js:80`
- `src/pages/api/user/buttons.js:27`
- `src/pages/api/user/buttons/[id].js:36`

### 8) Médio - Magic start não envia e-mail de fato

Status: `PENDENTE`

Sintoma:

- Fluxo sinaliza envio, mas não executa envio real do link.

Impacto:

- Quebra de autenticação por magic link na prática.

Evidências:

- `src/pages/api/auth/magic-start.js:38`
- `src/pages/api/auth/magic-start.js:41`

## Plano de execução objetivo

Fase 1 (bloqueio imediato de abuso):

- Item 1
- Item 2

Fase 2 (redução de superfície de ataque):

- Item 3
- Item 4
- Item 5

Fase 3 (robustez de autenticação e UX):

- Item 6
- Item 7
- Item 8

## Critério de avanço

Só avançar para o próximo número quando:

- Código ajustado
- Teste mínimo do fluxo alterado executado
- Status deste arquivo atualizado de `PENDENTE` para `CONCLUÍDO`
