# 🔗 FLOWPay - Blockchain Registry

Módulo para registro de eventos/provas on-chain usando QuickNode.

## 📦 Estrutura

```
services/blockchain/
├── quicknode.js              # Cliente QuickNode RPC
├── quicknode-rest.js         # Cliente QuickNode REST APIs
├── quicknode-integration.js  # Serviço de integração (alto nível)
├── write-proof.js            # Escrita de provas on-chain
├── README.md                 # Esta documentação
├── QUICKNODE_APIS.md         # Guia das APIs REST
└── USAGE_EXAMPLES.md         # Exemplos práticos
```

## 🎯 Responsabilidades

### 1. QuickNode Client (`quicknode.js`)
- Conexão com blockchains via QuickNode RPC
- Clientes públicos (read-only)
- Clientes de wallet (read-write)
- Suporta múltiplas redes (Ethereum, Polygon, BSC, Arbitrum, Optimism)
- Verificação de status de transações

### 2. QuickNode REST (`quicknode-rest.js`)
- **IPFS_REST**: Armazenamento descentralizado de provas
- **KV_REST**: Cache e estado temporário
- **STREAMS_REST**: Monitoramento de eventos em tempo real
- **WEBHOOKS_REST**: Notificações de eventos blockchain

### 3. QuickNode Integration (`quicknode-integration.js`)
- Serviço de alto nível que combina APIs
- `storeProofWithIPFS()`: IPFS + on-chain
- `cacheSettlementOrder()`: Cache de ordens
- `setupUSDTMonitoring()`: Monitoramento USDT
- `archiveTransactions()`: Backup no IPFS

### 4. Write Proof (`write-proof.js`)
- Escreve eventos/provas on-chain
- Guarda tx hash
- **Não toca em dinheiro** (apenas registro)
- Suporta smart contract ou método alternativo
- Integrado com IPFS (armazena provas completas)

## 🔒 Princípios

- ✅ **Apenas registro**: Não transfere tokens ou valores
- ✅ **Imutável**: Provas registradas na blockchain
- ✅ **Verificável**: Qualquer um pode verificar
- ✅ **Transparente**: Dados públicos e auditáveis

## 📝 Uso

### Escrever Prova On-Chain

```javascript
const { getWriteProof } = require('./write-proof');

const writeProof = getWriteProof();

const result = await writeProof.writeProof({
  pixChargeId: 'pix_123456',
  txHash: '0x...', // Hash da transação USDT
  recipientWallet: '0x...',
  amountBRL: 100.00,
  amountUSDT: 18.18,
  network: 'ethereum',
  metadata: {
    userId: 'user_123',
    conversionRate: 5.50
  }
});

console.log('Prova registrada:', result.proof.txHash);
```

### Verificar Status de Transação

```javascript
const { getQuickNodeClient } = require('./quicknode');

const quicknode = getQuickNodeClient();

const status = await quicknode.getTransactionStatus(
  '0x...', // tx hash
  'ethereum'
);

console.log('Status:', status);
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# QuickNode RPC URLs
QUICKNODE_ETHEREUM_URL=https://your-endpoint.ethereum.quiknode.pro/...
QUICKNODE_POLYGON_URL=https://your-endpoint.polygon.quiknode.pro/...
QUICKNODE_BSC_URL=https://your-endpoint.bsc.quiknode.pro/...
QUICKNODE_ARBITRUM_URL=https://your-endpoint.arbitrum.quiknode.pro/...
QUICKNODE_OPTIMISM_URL=https://your-endpoint.optimism.quiknode.pro/...

# QuickNode REST APIs (opcional mas recomendado)
QUICKNODE_API_KEY=your_quicknode_api_key_here
QUICKNODE_IPFS_REST=https://api.quicknode.com/ipfs/v1
QUICKNODE_KV_REST=https://api.quicknode.com/kv/v1
QUICKNODE_STREAMS_REST=https://api.quicknode.com/streams/v1
QUICKNODE_WEBHOOKS_REST=https://api.quicknode.com/webhooks/v1

# Wallet para escrita (apenas para assinar transações de registro)
BLOCKCHAIN_WRITER_ADDRESS=0x...
BLOCKCHAIN_WRITER_PRIVATE_KEY=0x...

# Contrato de prova (opcional)
PROOF_CONTRACT_ADDRESS=0x...
```

## 🔄 Fluxo de Registro

```
1. Transação USDT executada
   ↓
2. Recebe tx hash da transação USDT
   ↓
3. Write Proof: Cria prova on-chain
   ↓
4. QuickNode: Escreve evento/transação
   ↓
5. Retorna tx hash da prova
   ↓
6. Prova imutável e verificável
```

## 🏗️ Smart Contract (Opcional)

Para produção, pode deployar um contrato simples:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FlowPayProof {
    event ProofRecorded(
        bytes32 indexed proofId,
        string pixChargeId,
        bytes32 txHash,
        uint256 timestamp
    );

    function recordProof(
        bytes32 proofId,
        string memory pixChargeId,
        bytes32 txHash
    ) public returns (bool) {
        emit ProofRecorded(
            proofId,
            pixChargeId,
            txHash,
            block.timestamp
        );
        return true;
    }
}
```

## ✅ Status

- [x] QuickNode client implementado
- [x] Write Proof implementado
- [x] Suporte múltiplas redes
- [x] Modo desenvolvimento (simulado)
- [x] Modo produção (real)
- [ ] Smart contract deployado (opcional)
- [ ] Verificação de provas implementada
- [ ] Indexação de eventos

## 🔗 Integração

Este módulo é usado por:
- `services/crypto/usdt-transfer.js` - Após transferir USDT, registra prova
- `netlify/functions/webhook-handler.js` - Após processar PIX, registra prova
- `netlify/functions/crypto-processor.js` - Após conversão, registra prova

