# FLOWPay - QuickNode Integration Summary

## O Que Foi Implementado

### 1. API REST Client (`quicknode-rest.js`)

✅ **IPFS_REST**

- Upload de arquivos para IPFS
- Armazenamento de provas imutáveis
- Integração com `write-proof.js`

✅ **KV_REST**

- Cache key-value
- TTL automático
- Estado temporário de ordens

✅ **STREAMS_REST**

- Monitoramento em tempo real
- Filtros customizados
- Webhooks automáticos

✅ **WEBHOOKS_REST** (NOVO)

- Templates pré-configurados:
  - `evmWalletFilter`: Monitora wallets específicas
  - `evmContractEvents`: Monitora eventos de contratos
  - `evmAbiFilter`: Monitora usando ABI
- Criação, listagem e deleção de webhooks
- Métodos helper:
  - `monitorUSDTTransfers()`: Monitora USDT automaticamente
  - `monitorWallets()`: Monitora wallets registradas

---

### 2. Webhook Handler (`quicknode-webhook.js`)

✅ **Processamento de Eventos**

- Suporta formato QuickNode (`data` + `metadata`)
- Processa eventos de contratos (Transfer USDT)
- Processa transações de wallets
- Integração com wallet registry
- Registro automático de provas on-chain

---

### 3. Scripts de Teste

✅ **test-quicknode-api.sh**

```bash
./tools/test-quicknode-api.sh <QUICKNODE_API_KEY>
```

✅ **setup-quicknode-webhooks.js**

```bash
node tools/setup-quicknode-webhooks.js
```

---

## 📋 Templates QuickNode

### evmContractEvents

**Uso:** Monitorar transferências USDT

```javascript
await rest.monitorUSDTTransfers(
  null, // Usa endereço padrão USDT
  'ethereum'
);
```

**Event Hash:**

- Transfer: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`

---

### evmWalletFilter

**Uso:** Monitorar wallets de usuários

```javascript
await rest.monitorWallets(
  ['0x1111111111111111111111111111111111111111'],
  'ethereum'
);
```

---

## Fluxo Completo

```
1. PIX confirmado (Woovi webhook)
   ↓
2. Ordem de liquidação criada (PENDING_REVIEW)
   ↓
3. Admin aprova liquidação
   ↓
4. Conversão Fiat → USDT
   ↓
5. Transferência USDT para wallet do usuário
   ↓
6. QuickNode webhook detecta transferência
   ↓
7. Sistema atualiza status automaticamente
   ↓
8. Prova registrada on-chain (IPFS + blockchain)
```

---

## Variáveis de Ambiente

```bash
# QuickNode API Key (obrigatório)
QUICKNODE_API_KEY=<QUICKNODE_API_KEY>

# REST API URLs (opcional, usa padrão se não configurado)
QUICKNODE_IPFS_REST=https://api.quicknode.com/ipfs/v1
QUICKNODE_KV_REST=https://api.quicknode.com/kv/v1
QUICKNODE_STREAMS_REST=https://api.quicknode.com/streams/v1
QUICKNODE_WEBHOOKS_REST=https://api.quicknode.com/webhooks/v1

# Webhook Security Token (opcional)
QUICKNODE_WEBHOOK_SECRET=your_secret_token_here

# URL do webhook (Railway)
URL=https://flowpay.cash
```

---

## 🧪 Testes

### 1. Testar API Key

```bash
./tools/test-quicknode-api.sh <QUICKNODE_API_KEY>
```

### 2. Criar Webhook USDT

```javascript
const { getQuickNodeREST } = require('./services/blockchain/quicknode-rest');
const rest = getQuickNodeREST();

await rest.monitorUSDTTransfers(null, 'ethereum');
```

### 3. Listar Webhooks

```javascript
const webhooks = await rest.listWebhooks();
console.log(webhooks);
```

### 4. Testar Webhook Handler

```bash
curl -X POST https://flowpay.cash/api/webhooks/quicknode \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "event": "Transfer",
      "logs": [{
        "topics": [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000from_address",
          "0x000000000000000000000000to_address"
        ],
        "data": "0x0000000000000000000000000000000000000000000000000000000000000064",
        "transactionHash": "0x...",
        "blockNumber": 12345678
      }]
    }],
    "metadata": {
      "webhookId": "test",
      "network": "ethereum"
    }
  }'
```

---

## 📚 Documentação

- `QUICKNODE_APIS.md` - Guia completo das APIs REST
- `WEBHOOKS_SETUP.md` - Setup de webhooks
- `README.md` - Visão geral do módulo blockchain

---

## Checklist de Implementação

- [x] Cliente REST para todas as APIs
- [x] Templates de webhooks implementados
- [x] Handler de webhook atualizado
- [x] Scripts de teste criados
- [x] Documentação completa
- [ ] Testar API Key (aguardando configuração)
- [ ] Criar webhook USDT (aguardando URL de produção)
- [ ] Testar recebimento de eventos
- [ ] Integrar com atualização de status de ordens

---

*QuickNode: infraestrutura blockchain escalável e confiável.*
