#  QuickNode REST APIs - Exemplos de Uso

## 📋 Resumo das APIs

| API | Uso Principal | Status |
|-----|---------------|--------|
| **IPFS_REST** | Armazenar provas/metadados | ✅ Recomendado |
| **KV_REST** | Cache e estado temporário | ✅ Recomendado |
| **STREAMS_REST** | Monitorar eventos em tempo real | ✅ Recomendado |
| **WEBHOOKS_REST** | Receber notificações | ✅ Recomendado |
| **FUNCTIONS_REST** | Funções personalizadas | ⚠️ Descontinuado |

---

##  Casos de Uso Práticos

### 1. Armazenar Prova Completa no IPFS

```javascript
const { getQuickNodeIntegration } = require('./quicknode-integration');

const integration = getQuickNodeIntegration();

// Após liquidação executada
const result = await integration.storeProofWithIPFS({
  pixChargeId: 'pix_123456',
  txHash: '0x...',
  recipientWallet: '0x...',
  amountBRL: 100.00,
  amountUSDT: 18.18,
  network: 'ethereum',
  metadata: {
    orderId: 'settle_...',
    executedBy: 'admin'
  }
});

// Retorna:
// {
//   ipfs: {
//     ipfsHash: 'Qm...',
//     ipfsUrl: 'ipfs://Qm...',
//     gatewayUrl: 'https://ipfs.io/ipfs/Qm...'
//   },
//   onChain: {
//     txHash: '0x...',
//     blockNumber: '12345'
//   }
// }
```

**Benefício**: Prova imutável e acessível publicamente via IPFS gateway.

---

### 2. Cache de Ordens de Liquidação

```javascript
// Armazenar ordem no cache (24 horas)
await integration.cacheSettlementOrder('settle_abc123', {
  orderId: 'settle_abc123',
  amountBRL: 100.00,
  estimatedAmount: 18.18,
  walletAddress: '0x...',
  status: 'PENDING_REVIEW'
}, 86400);

// Recuperar ordem
const cached = await integration.getCachedSettlementOrder('settle_abc123');
if (cached) {
  console.log('Ordem encontrada:', cached);
}
```

**Benefício**: Acesso rápido sem consultar banco de dados.

---

### 3. Monitorar Transferências USDT em Tempo Real

```javascript
const { getQuickNodeREST } = require('./quicknode-rest');

const rest = getQuickNodeREST();

// Configurar monitoramento
await rest.monitorUSDTTransfers(
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Ethereum
  'ethereum',
  'https://flowpaypix.netlify.app/.netlify/functions/quicknode-webhook'
);

// Webhook receberá eventos automaticamente quando:
// - Transferência USDT detectada
// - Transação confirmada
// - Novo bloco minerado
```

**Benefício**: Confirmações automáticas sem polling.

---

### 4. Backup e Auditoria

```javascript
// Arquivar histórico de transações
const transactions = [
  { id: 'tx1', amount: 100, status: 'completed' },
  { id: 'tx2', amount: 50, status: 'completed' }
];

const archive = await integration.archiveTransactions(transactions);

// Hash IPFS pode ser:
// - Registrado on-chain como referência
// - Compartilhado para auditoria
// - Usado para backup
console.log('Arquivo IPFS:', archive.gatewayUrl);
```

**Benefício**: Backup descentralizado e imutável.

---

##  Integração com Fluxo Existente

### No settlement-orders.js

```javascript
// Após criar ordem
const { getQuickNodeIntegration } = require('../../services/blockchain/quicknode-integration');
const integration = getQuickNodeIntegration();

// Cache da ordem
await integration.cacheSettlementOrder(orderId, orderData, 86400);
```

### No write-proof.js

```javascript
// Já integrado! Prova automaticamente armazenada no IPFS se configurado
// Retorna: { ipfs: {...}, onChain: {...} }
```

### No webhook-handler.js

```javascript
// Após PIX confirmado, pode armazenar no IPFS
const integration = getQuickNodeIntegration();
await integration.storeProofWithIPFS({
  pixChargeId: charge.correlationID,
  // ... outros dados
});
```

---

##  Configuração Mínima

Para começar, configure apenas:

```bash
QUICKNODE_API_KEY=your_key
QUICKNODE_IPFS_REST=https://api.quicknode.com/ipfs/v1
```

Isso já habilita armazenamento de provas no IPFS.

---

## Próximos Passos

1. **Configurar API Key** no QuickNode Dashboard
2. **Testar IPFS** com uma prova simples
3. **Configurar Streams** para monitorar USDT
4. **Integrar cache KV** nas ordens de liquidação
5. **Testar webhook** de eventos blockchain

---

*QuickNode REST APIs: infraestrutura pronta para produção.*
