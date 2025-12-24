# 🔐 FLOWPay - Núcleo Cripto

**Liquidação programável de pagamentos em cripto.**

Serviços isolados para processar liquidação de pagamentos PIX em USDT conforme regras claras e auditáveis.

## 📦 Estrutura

```text
services/crypto/
├── wallet-registry.js      # Gerenciamento de wallets de usuários
├── liquidity-provider.js    # Conversão Fiat → USDT
├── usdt-transfer.js         # Transferência de USDT
└── README.md               # Esta documentação
```

## 🎯 Responsabilidades

### 1. Wallet Registry (`wallet-registry.js`)

- Registra wallets de usuários
- Valida endereços blockchain
- Gerencia múltiplas wallets por usuário
- Suporta múltiplas redes (Ethereum, Polygon, BSC)

### 2. Liquidity Provider (`liquidity-provider.js`)

- **Liquida pagamentos**: BRL → USDT conforme estratégia
- Suporta estratégias: `auto`, `manual`, `deferred`
- Obtém taxas de conversão em tempo real
- Integra com provedores OTC/exchanges
- Calcula taxas e spreads
- **Não é "conversão automática"**: É liquidação programável com regras auditáveis

### 3. USDT Transfer (`usdt-transfer.js`)

- Transfere USDT para wallets cadastradas
- Suporta múltiplas redes blockchain
- Valida wallets antes de transferir
- Rastreia status de transações

## 🔄 Fluxo Completo

```text
1. PIX confirmado
   ↓
2. Wallet Registry: Resolve/Registra wallet do usuário
   ↓
3. Liquidity Provider: Liquida pagamento (BRL → USDT)
   ├─ Estratégia: auto|manual|deferred
   └─ Retorna settlement.ready
   ↓
4. USDT Transfer: Envia USDT (se settlement.ready)
   ↓
5. Proof Registry: Registra prova on-chain
   ↓
6. Retorna resultado completo
```

**Importante**: `settle ≠ transfer`. Liquidação e transferência são etapas distintas.

## 📝 Uso

### Via Webhook (Liquidação Programável)

Quando um pagamento PIX é confirmado, o webhook handler:

1. Detecta wallet no `additionalInfo`
2. **Liquida pagamento** (BRL → USDT) conforme estratégia configurada
3. Transfere USDT para wallet (se liquidação estiver pronta)
4. Registra prova on-chain

### Via API (Manual)

```javascript
const { getLiquidityProvider } = require('./liquidity-provider');
const { getUSDTTransfer } = require('./usdt-transfer');
const { getWalletRegistry } = require('./wallet-registry');

// 1. Registrar wallet
const registry = getWalletRegistry();
await registry.registerWallet(userId, walletAddress, 'ethereum');

// 2. Liquidar pagamento (BRL → USDT)
const provider = getLiquidityProvider();
const settlement = await provider.settle({
  amountBRL: 100.00,
  userId,
  correlationId,
  target: 'USDT',
  strategy: 'auto' // ou 'manual', 'deferred'
});

// 3. Transferir USDT (se liquidação estiver pronta)
if (settlement.ready) {
  const transfer = getUSDTTransfer();
  const result = await transfer.transferUSDT(
    userId,
    walletAddress,
    settlement.to.amount,
    'ethereum',
    correlationId
  );
}
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Liquidity Provider
LIQUIDITY_PROVIDER_NAME=default
LIQUIDITY_PROVIDER_URL=https://api.provider.com
LIQUIDITY_PROVIDER_API_KEY=your_key
LIQUIDITY_PROVIDER_TYPE=otc
CONVERSION_FEE_PERCENT=0.5

# USDT Transfer
SERVICE_WALLET_ADDRESS=0x...
SERVICE_WALLET_PRIVATE_KEY=0x... # Em produção, usar gerenciamento seguro
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
```

## 🔒 Segurança

- Wallets e chaves privadas nunca são logadas
- Endereços são mascarados em logs
- Validação de assinaturas HMAC
- Rate limiting aplicado
- Dados sensíveis redatados

## 🚀 Próximos Passos

- [ ] Integração real com provedor de liquidez
- [ ] Implementação de transferências reais na blockchain
- [ ] Persistência de dados em banco (atualmente em memória)
- [ ] Retry logic para falhas
- [ ] Monitoramento e alertas
