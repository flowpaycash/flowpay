# 🔔 FLOWPay - Setup QuickNode Webhooks

## 📋 Templates Disponíveis

### 1. evmWalletFilter
Monitora wallets específicas (EVM chains)

**Uso no FlowPay:**
- Monitorar wallets de usuários cadastrados
- Detectar recebimentos de USDT
- Atualizar status automaticamente

**Exemplo:**
```javascript
const { getQuickNodeREST } = require('./quicknode-rest');

const rest = getQuickNodeREST();

await rest.monitorWallets(
  ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '0x...'],
  'ethereum',
  'https://flowpaypix.netlify.app/.netlify/functions/quicknode-webhook'
);
```

---

### 2. evmContractEvents
Monitora eventos de contratos específicos

**Uso no FlowPay:**
- Monitorar transferências USDT
- Detectar eventos do contrato de prova
- Confirmar transações automaticamente

**Exemplo:**
```javascript
// Monitorar transferências USDT
await rest.monitorUSDTTransfers(
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Ethereum
  'ethereum'
);
```

**Event Hash:**
- Transfer: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`

---

### 3. evmAbiFilter
Monitora contratos usando ABI

**Uso no FlowPay:**
- Monitorar contrato de prova customizado
- Detectar eventos específicos do FlowPay

---

## Setup Rápido

### 1. Testar API Key

```bash
./tools/test-quicknode-api.sh QN_5c0bd5ebf5eb4319a5e3c7df48685f93
```

### 2. Configurar Webhooks

```bash
# Via script
node tools/setup-quicknode-webhooks.js

# Ou manualmente via código
const { getQuickNodeREST } = require('./services/blockchain/quicknode-rest');
const rest = getQuickNodeREST();

// Monitorar USDT
await rest.monitorUSDTTransfers(null, 'ethereum');
```

### 3. Verificar Webhooks Criados

```javascript
const webhooks = await rest.listWebhooks();
console.log(webhooks);
```

---

##  Endpoints da API

### Criar Webhook (Template)
```
POST https://api.quicknode.com/v0/webhooks/template/{templateId}
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "name": "FLOWPay USDT Monitor",
  "network": "ethereum",
  "templateArgs": {
    "contracts": ["0x..."],
    "eventHashes": ["0xddf252ad..."]
  },
  "destination": {
    "url": "https://flowpaypix.netlify.app/.netlify/functions/quicknode-webhook",
    "securityToken": "optional_token"
  }
}
```

### Listar Webhooks
```
GET https://api.quicknode.com/v0/webhooks
Headers:
  x-api-key: YOUR_API_KEY
```

### Deletar Webhook
```
DELETE https://api.quicknode.com/v0/webhooks/{webhookId}
Headers:
  x-api-key: YOUR_API_KEY
```

---

##  Fluxo de Eventos

```
1. Transferência USDT detectada na blockchain
   ↓
2. QuickNode webhook envia evento
   ↓
3. /.netlify/functions/quicknode-webhook recebe
   ↓
4. Sistema atualiza status da ordem
   ↓
5. Admin panel atualizado automaticamente
```

---

##  Checklist de Setup

- [ ] API Key configurada (`QUICKNODE_API_KEY`)
- [ ] URL do webhook configurada (`URL` no ambiente)
- [ ] Webhook handler criado (`quicknode-webhook.js`)
- [ ] Testar API Key
- [ ] Criar webhook para USDT
- [ ] Testar recebimento de eventos
- [ ] Integrar com atualização de status

---

*Webhooks QuickNode: monitoramento em tempo real sem polling.*
