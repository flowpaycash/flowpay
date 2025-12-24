# 🔗 FLOWPay - QuickNode REST APIs Integration

## 📦 APIs Disponíveis

### 1. IPFS_REST
**Uso**: Armazenamento descentralizado de metadados e provas

**Aplicações no FlowPay:**
- ✅ Armazenar provas completas de forma imutável
- ✅ Backup de transações
- ✅ Metadados de liquidações
- ✅ Histórico auditável

**Exemplo:**
```javascript
const { getQuickNodeREST } = require('./quicknode-rest');

const rest = getQuickNodeREST();
const result = await rest.storeInIPFS({
  pixChargeId: 'pix_123',
  txHash: '0x...',
  amountBRL: 100.00,
  amountUSDT: 18.18
}, 'proof_pix_123.json');

// Retorna: { ipfsHash, ipfsUrl, gatewayUrl }
```

---

### 2. KV_REST
**Uso**: Key-Value storage para cache e estado temporário

**Aplicações no FlowPay:**
- ✅ Cache de ordens de liquidação
- ✅ Estado temporário de transações
- ✅ Configurações por usuário
- ✅ Rate limiting data

**Exemplo:**
```javascript
// Armazenar
await rest.setKV('settlement_order:abc123', orderData, 86400); // 24h TTL

// Recuperar
const order = await rest.getKV('settlement_order:abc123');
```

---

### 3. STREAMS_REST
**Uso**: Monitorar eventos blockchain em tempo real

**Aplicações no FlowPay:**
- ✅ Monitorar transferências USDT
- ✅ Confirmar transações automaticamente
- ✅ Detectar eventos de contratos
- ✅ Atualizar status em tempo real

**Exemplo:**
```javascript
// Monitorar transferências USDT
await rest.monitorUSDTTransfers(
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT contract
  'ethereum',
  'https://flowpaypix.netlify.app/.netlify/functions/quicknode-webhook'
);
```

---

### 4. WEBHOOKS_REST
**Uso**: Receber notificações de eventos blockchain

**Aplicações no FlowPay:**
- ✅ Notificar quando transação confirmada
- ✅ Alertar sobre falhas
- ✅ Atualizar status de ordens
- ✅ Sincronizar estado

**Exemplo:**
```javascript
// Criar webhook para eventos de transferência
await rest.createWebhook({
  network: 'ethereum',
  url: 'https://flowpaypix.netlify.app/.netlify/functions/quicknode-webhook',
  events: ['transfer', 'transaction_confirmed'],
  description: 'FLOWPay USDT transfers'
});
```

---

### 5. FUNCTIONS_REST
**Uso**: Funções personalizadas (⚠️ Descontinuado em breve)

**Nota**: Esta API está sendo descontinuada. Não recomendado para novos projetos.

---

## 🎯 Casos de Uso no FlowPay

### Caso 1: Prova Completa com IPFS

```javascript
const { getQuickNodeIntegration } = require('./quicknode-integration');

const integration = getQuickNodeIntegration();

// Armazenar prova completa (IPFS + on-chain)
const result = await integration.storeProofWithIPFS({
  pixChargeId: 'pix_123',
  txHash: '0x...',
  recipientWallet: '0x...',
  amountBRL: 100.00,
  amountUSDT: 18.18,
  network: 'ethereum'
});

// Retorna:
// {
//   ipfs: { ipfsHash, ipfsUrl, gatewayUrl },
//   onChain: { txHash, blockNumber }
// }
```

### Caso 2: Cache de Ordens de Liquidação

```javascript
// Armazenar ordem no cache
await integration.cacheSettlementOrder(orderId, orderData, 86400);

// Recuperar ordem
const cached = await integration.getCachedSettlementOrder(orderId);
```

### Caso 3: Monitoramento em Tempo Real

```javascript
// Configurar monitoramento de USDT
await integration.setupUSDTMonitoring('ethereum');

// Webhook receberá eventos automaticamente em:
// /.netlify/functions/quicknode-webhook
```

### Caso 4: Backup e Auditoria

```javascript
// Arquivar transações no IPFS
await integration.archiveTransactions(transactions);

// Hash IPFS pode ser registrado on-chain como referência
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# API Key (obrigatória para todas as APIs REST)
QUICKNODE_API_KEY=your_api_key_here

# Base URLs das APIs REST
QUICKNODE_IPFS_REST=https://api.quicknode.com/ipfs/v1
QUICKNODE_KV_REST=https://api.quicknode.com/kv/v1
QUICKNODE_STREAMS_REST=https://api.quicknode.com/streams/v1
QUICKNODE_WEBHOOKS_REST=https://api.quicknode.com/webhooks/v1

# URL base do projeto (para webhooks)
URL=https://flowpaypix.netlify.app
```

---

## 🔄 Fluxo Integrado

```
1. PIX confirmado
   ↓
2. Criar ordem de liquidação
   ├─ Armazenar no KV (cache)
   └─ Status: PENDING_REVIEW
   ↓
3. Admin aprova liquidação
   ↓
4. Executar liquidação
   ├─ Transferir USDT
   └─ Registrar prova on-chain
   ↓
5. Armazenar prova completa
   ├─ IPFS: Metadados completos
   └─ On-chain: Hash IPFS + referência
   ↓
6. Monitorar confirmação
   ├─ Stream: Detecta confirmação
   └─ Webhook: Atualiza status
```

---

## ✅ Benefícios

### IPFS
- ✅ Provas imutáveis e descentralizadas
- ✅ Backup automático
- ✅ Acesso via gateway público
- ✅ Histórico completo

### KV
- ✅ Cache rápido
- ✅ Estado temporário
- ✅ TTL automático
- ✅ Baixa latência

### Streams
- ✅ Monitoramento em tempo real
- ✅ Confirmações automáticas
- ✅ Sem polling
- ✅ Eficiente

### Webhooks
- ✅ Notificações instantâneas
- ✅ Atualização automática
- ✅ Sincronização de estado
- ✅ Reduz carga no servidor

---

## 🚀 Próximos Passos

- [ ] Configurar variáveis de ambiente
- [ ] Testar armazenamento IPFS
- [ ] Configurar monitoramento USDT
- [ ] Integrar cache KV nas ordens
- [ ] Criar webhook handler
- [ ] Testar fluxo completo

---

*QuickNode REST APIs: poder além do RPC básico.*

