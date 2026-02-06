# ⛓️ Guia de Integração Blockchain

Este módulo gerencia o registro de provas on-chain e interações com criptomoedas usando **QuickNode**.

## 📁 Estrutura

```
services/blockchain/
├── quicknode.js              # Cliente RPC
├── quicknode-rest.js         # Cliente API REST
├── write-proof.js            # Lógica de escrita de provas
└── ...
```

## 🎯 Funcionalidades

### 1. Registro de Provas (Proof of Settlement)

Toda transação financeira (Pix -> Crypto ou Crypto -> Pix) gera uma prova imutável registrada na blockchain.

* **Não financeiro:** O registro da prova apenas *documenta* a transação, não movimenta fundos do usuário.
* **Dados:** Hash da transação original, IDs e Timestamp.

### 2. Monitoramento (QuickNode)

Utilizamos QuickNode para:

* Monitorar transações de USDT recebidas.
* Webhooks para notificação de eventos on-chain.
* RPC para leitura de estado.

## ⚙️ Configuração

As variáveis de ambiente devem estar configuradas no `.env` (Ver `BLOCKCHAIN_SERVICES.md` antigo ou código fonte para lista completa se necessário).

Principais variáveis:

* `QUICKNODE_ETHEREUM_URL`
* `QUICKNODE_POLYGON_URL`
* `BLOCKCHAIN_WRITER_ADDRESS` (Carteira que assina as provas)
