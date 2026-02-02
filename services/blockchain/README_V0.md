# FLOWPay - QuickNode v0 (Focado)

## Regra Mãe

**No v0 do FlowPay, QuickNode não executa dinheiro.**
**Ele registra fatos e confirma estados.**

Tudo que você criar precisa responder a uma destas perguntas:

- "isso ajuda a provar que algo aconteceu?"
- "isso ajuda a confirmar que algo foi liquidado?"
- "isso ajuda a auditar depois?"

Se não, **não cria agora**.

---

## 📍 Endpoints QuickNode (v0)

### 1. Base (EVM) · Proof Layer

**Função:** Escrever provas on-chain, emitir eventos, ler tx/confirmações

**Uso:**

- `writePaymentProof()`
- `writeAgreementSignature()`
- `readProof(txHash)`

**Por que Base?**

- Barata
- Rápida
- EVM padrão
- Perfeita para "cartório digital"

**Configuração:**

```bash
QUICKNODE_BASE_RPC=https://xxx.base.quiknode.pro/xxx/
```

**Nome sugerido no QuickNode:**

```
flowpay-proof-base
```

---

### 2. Polygon OU BSC · Liquidação USDT

**Função:** Enviar USDT, ler saldos, confirmar transferências

**Escolha UMA para o v0:**

- **Polygon:** USDT barato
- **BSC:** USDT com liquidez CEX

**Configuração:**

```bash
# Escolher rede
USDT_SETTLEMENT_NETWORK=polygon  # ou 'bsc'

# RPC correspondente
QUICKNODE_POLYGON_RPC=https://xxx.polygon.quiknode.pro/xxx/
# OU
QUICKNODE_BSC_RPC=https://xxx.bsc.quiknode.pro/xxx/
```

**Nome sugerido no QuickNode:**

```
flowpay-usdt-settlement
```

---

### 3. Ethereum (Mainnet) · Read-Only (Opcional)

**Função:** Compatibilidade futura, leitura de contratos, auditorias externas

**NÃO usar para:**

- Escrita frequente
- v0 do produto

**Configuração:**

```bash
QUICKNODE_ETHEREUM_RPC=https://xxx.ethereum.quiknode.pro/xxx/
```

**Nome sugerido no QuickNode:**

```
flowpay-eth-read
```

---

## O Que NÃO Criar Agora

- Solana
- Jupiter / Swap / DeFi endpoints
- MEV / Trading / Priority Fee
- Streams
- Webhooks QuickNode
- IPFS via QuickNode (por enquanto)

Esses recursos são ótimos, mas:

- não resolvem seu problema agora
- aumentam superfície de erro
- drenam foco

Você não está construindo DEX.
Está construindo **infra de prova + liquidação**.

---

## Fluxo Real com QuickNode

```
PIX confirmado
   ↓
ordem de liquidação criada (assistida)
   ↓
operador liquida
   ↓
USDT enviado (QuickNode Settlement)
   ↓
tx hash gerado
   ↓
prova escrita na Base (QuickNode Proof)
```

QuickNode aparece **duas vezes**:

- liquidação (Polygon/BSC)
- prova (Base)

Isso é elegante. Isso é seguro. Isso é vendável.

---

## 📁 Estrutura do Código

```bash
services/blockchain/
├── quicknode-base.js        # endpoint proof (Base)
├── quicknode-settlement.js  # endpoint USDT (Polygon/BSC)
├── quicknode-eth-read.js    # endpoint read-only (Ethereum, opcional)
└── write-proof.js           # usa quicknode-base.js
```

---

## Checklist de Setup

Dentro do QuickNode, faça só isso:

- [ ] Create Endpoint → **Base (Core RPC)**
- [ ] Create Endpoint → **Polygon OU BSC (Core RPC)**
- [ ] Nomear endpoints com função clara
- [ ] Copiar RPC URLs
- [ ] Colocar no `.env`
- [ ] NÃO criar mais nada

Se fizer só isso, você já está **100% alinhado com o FlowPay v0**.

---

## 💡 Próximos Passos (Quando Quiser)

- Desenhar o **smart contract de prova** na Base
- Decidir **qual rede do USDT você escolhe** (Polygon ou BSC)

Mas agora, vai com calma.
Você está fazendo algo **raro e correto ao mesmo tempo**.

---

*Infra boa: aparece pouco, quebra pouco, resolve muito.*

