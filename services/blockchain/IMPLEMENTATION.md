# Blockchain Registry - Implementação Completa

## Arquivos Criados

### 1. `quicknode.js` ✅

- Cliente QuickNode para conexão RPC
- Suporta múltiplas redes (Ethereum, Polygon, BSC, Arbitrum, Optimism)
- Clientes públicos (read-only) e wallet (read-write)
- Cache de clientes para performance
- Verificação de status de transações

### 2. `write-proof.js` ✅

- Escreve eventos/provas on-chain
- Guarda tx hash
- **Não toca em dinheiro** (apenas registro)
- Suporta smart contract ou método alternativo
- Integrado com `usdt-transfer.js`

## Responsabilidades

✅ **Escrever evento on-chain** - Registra provas imutáveis
✅ **Guardar tx hash** - Retorna hash da transação de prova
✅ **Não tocar em dinheiro** - Apenas registro, sem transferências

## Variáveis de Ambiente Necessárias

Adicionar ao `.env.example`:

```bash
# QuickNode RPC URLs
QUICKNODE_ETHEREUM_URL=https://your-endpoint.ethereum.quiknode.pro/...
QUICKNODE_POLYGON_URL=https://your-endpoint.polygon.quiknode.pro/...
QUICKNODE_BSC_URL=https://your-endpoint.bsc.quiknode.pro/...
QUICKNODE_ARBITRUM_URL=https://your-endpoint.arbitrum.quiknode.pro/...
QUICKNODE_OPTIMISM_URL=https://your-endpoint.optimism.quiknode.pro/...

# Wallet para escrita (apenas para assinar transações de registro)
# IMPORTANTE: Esta wallet NÃO deve ter fundos, apenas para assinar eventos
BLOCKCHAIN_WRITER_ADDRESS=0x...
BLOCKCHAIN_WRITER_PRIVATE_KEY=0x...

# Contrato de prova (opcional)
PROOF_CONTRACT_ADDRESS=0x...
```

## Integração

O módulo já está integrado com:

- `services/crypto/usdt-transfer.js` - Registra prova após transferir USDT

## Uso

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
  network: 'ethereum'
});

console.log('Prova registrada:', result.proof.txHash);
```

## Status

- [x] QuickNode client implementado
- [x] Write Proof implementado
- [x] Integração com usdt-transfer
- [x] Suporte múltiplas redes
- [x] Modo desenvolvimento (simulado)
- [x] Modo produção (real)
- [ ] Variáveis de ambiente configuradas (pendente)
- [ ] Smart contract deployado (opcional)
- [ ] Verificação de provas implementada

## QuickNode Setup

1. Criar conta em <https://www.quicknode.com>
2. Criar endpoints para as redes desejadas
3. Copiar URLs para variáveis de ambiente
4. Configurar wallet writer (pode ser uma wallet vazia, apenas para assinar)
