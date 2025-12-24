#  FLOWPay - QuickNode v0 Setup Guide

## Passo a Passo no Dashboard QuickNode

### 1. Criar Endpoint Base (Proof Layer)

1. Acesse: https://www.quicknode.com/dashboard
2. Clique em **"Create Endpoint"**
3. Selecione:
   - **Chain:** Base
   - **Network:** Mainnet
   - **Plan:** Core (suficiente para v0)
4. Nome: `flowpay-proof-base`
5. Copie a **HTTP URL**
6. Adicione ao `.env`:
   ```bash
   QUICKNODE_BASE_RPC=https://xxx.base.quiknode.pro/xxx/
   ```

---

### 2. Criar Endpoint Settlement (USDT)

**Escolha UMA rede:**

#### Opção A: Polygon (Recomendado para v0)
1. **Chain:** Polygon
2. **Network:** Mainnet
3. **Plan:** Core
4. Nome: `flowpay-usdt-settlement`
5. Copie a **HTTP URL**
6. Adicione ao `.env`:
   ```bash
   USDT_SETTLEMENT_NETWORK=polygon
   QUICKNODE_POLYGON_RPC=https://xxx.polygon.quiknode.pro/xxx/
   ```

#### Opção B: BSC
1. **Chain:** BNB Smart Chain
2. **Network:** Mainnet
3. **Plan:** Core
4. Nome: `flowpay-usdt-settlement`
5. Copie a **HTTP URL**
6. Adicione ao `.env`:
   ```bash
   USDT_SETTLEMENT_NETWORK=bsc
   QUICKNODE_BSC_RPC=https://xxx.bsc.quiknode.pro/xxx/
   ```

---

### 3. Criar Endpoint Ethereum (Opcional - Read-Only)

1. **Chain:** Ethereum
2. **Network:** Mainnet
3. **Plan:** Core
4. Nome: `flowpay-eth-read`
5. Copie a **HTTP URL**
6. Adicione ao `.env`:
   ```bash
   QUICKNODE_ETHEREUM_RPC=https://xxx.ethereum.quiknode.pro/xxx/
   ```

---

##  Verificação

Após configurar, teste:

```bash
# Testar Base (proof)
node -e "
const { getQuickNodeBase } = require('./services/blockchain/quicknode-base');
const base = getQuickNodeBase();
const client = base.getPublicClient();
console.log('✅ Base conectado');
"

# Testar Settlement
node -e "
const { getQuickNodeSettlement } = require('./services/blockchain/quicknode-settlement');
const settlement = getQuickNodeSettlement();
const client = settlement.getPublicClient();
console.log('✅ Settlement conectado:', settlement.getNetwork());
"
```

---

## 🚫 NÃO Criar Agora

- Streams
- Webhooks
- IPFS
- Solana
- Outras chains

**Foco:** Proof (Base) + Settlement (Polygon/BSC)

---

*Simples. Focado. Funcional.*
