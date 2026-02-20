# NEXTSTEPS — FlowPay

Atualizado em: 2026-02-20. Ordenado de **crítico → moderado**.

---

## 🔴 CRÍTICO — Segurança financeira e integridade de dados

### 1. Autenticação do Dashboard do Vendedor — sem assinatura real

O token atual é `btoa(email:timestamp)` — não tem verificação criptográfica.
Qualquer pessoa que saiba o email de um usuário aprovado consegue forjar o header `x-user-token` e acessar o dashboard.

**Arquivos:** `src/pages/api/user/buttons.js:5-12`, `src/pages/dashboard.astro:717-724`

**Fix:** Substituir por cookie de sessão assinado (igual ao admin) ou JWT com `DASHBOARD_SECRET`.

---

### 2. Testes — Webhook financeiro (pagamento PIX confirmado)

O webhook da Woovi é o caminho crítico do dinheiro: recebe evento → valida HMAC → atualiza DB → dispara bridge cripto.
Não há testes para este fluxo.

**Arquivo a criar:** `tests/webhook.test.js`

Cobrir:
- Rejeição de requests sem assinatura HMAC
- Rejeição de assinatura inválida
- Aceitação de assinatura válida → status `PIX_PAID` no DB
- Idempotência: segundo webhook com mesmo `correlationID` não duplica registro
- Evento desconhecido (`CHARGE_EXPIRED`, etc.) retorna 200 sem efeito colateral
- `customerEmail` ausente → email não é disparado (sem crash)

---

### 3. Testes — Criação de cobrança PIX (`/api/create-charge.js`)

O endpoint que cria cobranças PIX não tem cobertura de testes.

**Arquivo a criar:** `tests/create-charge.test.js`

Cobrir:
- Valor mínimo/máximo válido
- Sanitização de `correlationID` (injeção SQL, caracteres especiais)
- Resposta da Woovi com erro → retorno correto ao cliente
- Rate limit por IP (`RATE_LIMIT_MAX`)
- Validação de `customer_cpf` (formato, dígito verificador)
- Criação bem-sucedida → linha inserida no DB com status `PENDING`

---

### 4. Testes — Banco de dados SQLite (funções críticas)

As funções financeiras do DB não têm testes isolados.

**Arquivo a criar:** `tests/database.test.js`

Cobrir:
- `createOrder` → verifica inserção e campos obrigatórios
- `updateOrderStatus` → transição de estados válida (`PENDING → PIX_PAID → COMPLETED`)
- `updateOrderStatus` com status inválido → lança erro ou ignora
- `getOrder` com `charge_id` inexistente → retorna `null`
- `logAudit` → registro correto de evento
- `createUser` com email duplicado → retorna erro UNIQUE
- `approveUser` → `status = APPROVED`, `approved_at` preenchido
- `rejectUser` → `status = REJECTED`, `rejected_reason` gravado
- `createPaymentButton` + `getPaymentButton` round-trip
- `cleanupExpiredAuthTokens` → remove apenas tokens expirados

---

### 5. Testes — Validação de webhook HMAC (isolado)

A função de validação de assinatura HMAC do webhook deve ser testada em isolamento.

**Arquivo a criar:** `tests/hmac-validation.test.js`

Cobrir:
- HMAC correto com secret real → válido
- HMAC correto com secret errado → inválido
- Payload alterado → inválido
- Timing-safe comparison (uso de `crypto.timingSafeEqual`)
- Header ausente → inválido (não lança exceção)

---

### 6. Migração de banco para Neon (PostgreSQL)

O sistema usa SQLite em Railway Volume. Para produção escalável e backup automático, migrar para **Neon** (PostgreSQL serverless).

**Sequência de migrations a criar em `migrations/`:**

```sql
-- migrations/001_initial_schema.sql
CREATE TABLE orders (
    id            SERIAL PRIMARY KEY,
    charge_id     TEXT NOT NULL UNIQUE,
    product_ref   TEXT,
    amount        NUMERIC(12,2) NOT NULL,
    status        TEXT NOT NULL DEFAULT 'PENDING',
    customer_name TEXT,
    customer_email TEXT,
    customer_cpf  TEXT,
    bridge_status TEXT DEFAULT 'PENDING',
    bridge_attempts INTEGER DEFAULT 0,
    bridge_last_error TEXT,
    poe_batch_id  INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_orders_charge_id ON orders(charge_id);
CREATE INDEX idx_orders_status ON orders(status);

-- migrations/002_receipts.sql
CREATE TABLE receipts (
    id          SERIAL PRIMARY KEY,
    receipt_id  TEXT NOT NULL UNIQUE,
    charge_id   TEXT NOT NULL REFERENCES orders(charge_id),
    ipfs_cid    TEXT,
    ipfs_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- migrations/003_poe_batches.sql
CREATE TABLE poe_batches (
    id            SERIAL PRIMARY KEY,
    merkle_root   TEXT NOT NULL,
    batch_size    INTEGER NOT NULL,
    anchor_tx_hash TEXT,
    network       TEXT DEFAULT 'base',
    checkpoint_hash TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    anchored_at   TIMESTAMPTZ,
    metadata      JSONB
);
CREATE INDEX idx_poe_batches_root ON poe_batches(merkle_root);

-- migrations/004_auth_tokens.sql
CREATE TABLE auth_tokens (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    used        BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_email ON auth_tokens(email);

-- migrations/005_users.sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    cpf           TEXT,
    phone         TEXT,
    business_type TEXT,
    status        TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    -- PENDING_APPROVAL | APPROVED | REJECTED
    approved_at   TIMESTAMPTZ,
    approved_by   TEXT,
    rejected_reason TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- migrations/006_payment_buttons.sql
CREATE TABLE payment_buttons (
    id              SERIAL PRIMARY KEY,
    button_id       TEXT NOT NULL UNIQUE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    title           TEXT NOT NULL,
    description     TEXT,
    amount_brl      NUMERIC(12,2),
    amount_fixed    BOOLEAN DEFAULT TRUE,
    payment_methods JSONB NOT NULL DEFAULT '["pix"]',
    crypto_address  TEXT,
    crypto_network  TEXT DEFAULT 'polygon',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payment_buttons_user ON payment_buttons(user_id);

-- migrations/007_audit_log.sql
CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    event_type  TEXT NOT NULL,
    actor       TEXT,
    action      TEXT NOT NULL,
    details     JSONB,
    order_id    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_log_order ON audit_log(order_id);
CREATE INDEX idx_audit_log_event ON audit_log(event_type);

-- migrations/008_siwe_nonces.sql
CREATE TABLE siwe_nonces (
    nonce       TEXT PRIMARY KEY,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- migrations/009_wallet_sessions.sql
CREATE TABLE wallet_sessions (
    address     TEXT PRIMARY KEY,
    chain_id    INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Variáveis de ambiente necessárias:**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

**Arquivo a criar:** `src/services/database/postgres.mjs` — wrapper usando `@neondatabase/serverless` ou `postgres` (npm).

---

### 7. Testes — Admin endpoints (approve/reject)

**Arquivo a criar:** `tests/admin-users.test.js`

Cobrir:
- `GET /api/admin/users` sem cookie de sessão → 401
- `GET /api/admin/users` com sessão válida → retorna array de usuários
- `POST /api/admin/users` approve → email de aprovação enviado, status no DB = `APPROVED`
- `POST /api/admin/users` reject com motivo → email de rejeição com motivo, status = `REJECTED`
- Approve de usuário já aprovado → idempotente ou erro claro
- `userId` inexistente → 404

---

## 🟠 ALTO — Funcionalidade incompleta

### 8. QuickNode Webhook — sem processamento de eventos cripto

Recebe chamadas mas não processa.

**Arquivo:** `src/pages/api/webhooks/quicknode.js:63`

Implementar:
- Confirmar recebimento de USDT/USDC → atualizar `bridge_status = CONFIRMED` no DB
- Notificar vendedor por email
- Adicionar ao batch PoE

---

### 9. Admin — páginas ausentes (4 rotas são 404)

| Rota | O que criar |
|------|-------------|
| `/admin/transactions` | Tabela com filtros de data, status, busca por `charge_id` |
| `/admin/settings` | Exibir variáveis de ambiente mascaradas, toggle de modo sandbox |
| `/admin/logs` | Stream de logs estruturados (últimas N entradas do DB `audit_log`) |

---

### 10. Dashboard do Vendedor — funcionalidades ausentes

- **Deletar link** — sem API endpoint (`DELETE /api/user/buttons/:id`)
- **Histórico de pagamentos por link** — vendedor não vê quem pagou
- **Estatísticas** — total recebido, número de pagamentos por link
- **Editar link** — não é possível alterar título/valor após criação

---

## 🟡 MÉDIO — Qualidade e manutenibilidade

### 11. Testes — Serviço de email (Resend)

**Arquivo a criar:** `tests/email-service.test.js`

Cobrir:
- `sendEmail` com `RESEND_API_KEY` ausente → retorna `{ success: false }` sem lançar
- `sendEmail` com API retornando 4xx → retorna `{ success: false, error }`
- `sendEmail` com API retornando 200 → retorna `{ success: true, id }`
- Campos `to` como string e como array → ambos funcionam
- Template `paymentConfirmedTemplate` → gera HTML com `orderId` e `amount` corretos

---

### 12. Testes — Rate limiter Redis

**Arquivo a criar:** `tests/rate-limiter.test.js`

Cobrir:
- Primeira request → permitida
- N requests dentro da janela → permitidas até o limite
- N+1 request → bloqueada (429)
- Após expiração da janela → liberada novamente
- Redis indisponível → fallback gracioso (não derruba a API)

---

### 13. Testes — Configuração e validação de ambiente

**Arquivo a criar:** `tests/config.test.js`

Cobrir:
- `validateConfig()` com todas as vars → passa
- `validateConfig()` sem `WOOVI_API_KEY` → lança erro
- `validateConfig()` em produção sem `ADMIN_PASSWORD` → lança erro
- `redactSensitiveData` → redige `password`, `token`, `secret`, `api_key`
- `redactSensitiveData` com objeto circular → retorna `[CIRCULAR]` sem crash

---

### 14. CSP via middleware server-side

Atualmente o CSP está em meta tags HTML (menos seguro, não cobre todas as rotas).

**Fix:** Mover para `src/middleware.js` como header HTTP.
**Arquivos:** `src/layouts/Layout.astro:152`, `src/layouts/CheckoutLayout.astro:24`

---

### 15. Email — templates inline no código

Os emails de aprovação/rejeição estão como HTML inline em `src/pages/api/admin/users.js:131-200`.

**Fix:** Mover para `src/services/api/email/templates/` (seguir padrão do `payment-confirmed.mjs`).

---

### 16. `public/csp-config.js` — arquivo legado

Tenta aplicar CSP via JS no browser (ineficaz em produção pois já tem CSP no header).
Pode ser removido após o item 14.

---

## 🟢 BAIXO — Melhorias e polimento

### 17. Lighthouse — itens pendentes

- **LCP request discovery** — preload do LCP image não configurado
- **Cache lifetimes** — `/public/css/` sem `Cache-Control` longo (63 KiB desperdício por request)
- **Network dependency tree** — `neo.config.js` e `web3auth.smart.js` ainda são blocking

### 18. Sentry — monitorar Session Replay pós-deploy

O worker blob pode ser bloqueado em browsers com extensões de segurança.
Acompanhar `worker-src blob:` no próximo ciclo de logs.

### 19. Testes de integração E2E (Playwright)

Para serviço financeiro, cobrir o fluxo completo:
- Usuário acessa `/pay/:id` → seleciona PIX → recebe QR code → simula webhook → vê confirmação
- Admin aprova cadastro → email disparado → usuário acessa dashboard

**Instalar:** `npm install -D @playwright/test`
**Arquivo a criar:** `tests/e2e/checkout.spec.ts`, `tests/e2e/admin.spec.ts`

---

## ✅ Resolvido recentemente

| Data | Descrição | Commit |
|------|-----------|--------|
| 20/02/2026 | CSP bloqueando Sentry (`connect-src` + `worker-src blob:`) | `4fa51de` |
| 20/02/2026 | `@sentry/core` bare import no browser (`noExternal` Vite) | `4fa51de` |
| 20/02/2026 | Render blocking CSS → preload async | `d636d61` |
| 20/02/2026 | Legacy JS `Array.from` → `build.target: es2020` | `d636d61` |
| 20/02/2026 | Admin `/admin/users` com listagem + approve/reject | este commit |
