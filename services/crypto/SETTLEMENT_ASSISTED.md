# 💼 FLOWPay - Liquidação Assistida

##  Conceito

**Liquidação assistida não é gambiarra. É controle consciente do risco no momento certo do projeto.**

### O que significa

- PIX entra automaticamente
- Pagamento confirmado automaticamente
- **Intenção de liquidação** registrada automaticamente
- **Execução da conversão e envio** acontece com validação humana

**O sistema decide quando pode decidir sozinho.**

---

##  Fluxo Real

```
1. PIX confirmado (webhook)
   ↓
2. Criar ordem de liquidação (PENDING_REVIEW)
   ├─ amountBRL
   ├─ estimatedAmount (USDT)
   ├─ estimatedRate
   ├─ walletAddress
   └─ network
   ↓
3. Admin Panel: Ver ordens pendentes
   ↓
4. Admin: Clicar "Liquidar Agora"
   ↓
5. Sistema executa:
   ├─ Liquidação (BRL → USDT)
   ├─ Transferência USDT
   └─ Registro de prova on-chain
   ↓
6. Ordem atualizada: EXECUTED
```

---

## 📋 API Endpoints

### Listar Ordens Pendentes
```
GET /.netlify/functions/settlement-orders
```

Retorna:
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "settle_...",
      "status": "PENDING_REVIEW",
      "amountBRL": 100.00,
      "estimatedAmount": 18.18,
      "estimatedRate": 5.50,
      "walletAddress": "0x...",
      "network": "ethereum",
      "correlationId": "pix_123",
      "createdAt": "2024-..."
    }
  ],
  "count": 1
}
```

### Executar Liquidação
```
POST /.netlify/functions/settlement-orders
```

Body:
```json
{
  "orderId": "settle_...",
  "walletAddress": "0x...",
  "network": "ethereum"
}
```

---

## 🎨 Admin Panel

### Seção: Liquidações Pendentes

- Lista todas as ordens com status `PENDING_REVIEW`
- Mostra:
  - Order ID
  - PIX ID (correlationId)
  - Valor BRL
  - Estimado USDT
  - Taxa estimada
  - Wallet destino
  - Rede blockchain
  - Data de criação

### Botão: "Liquidar Agora"

- Confirmação antes de executar
- Executa liquidação completa
- Atualiza status para `EXECUTED`
- Registra prova on-chain

---

##  Por que isso funciona

### 1. Não trava
- Sistema continua funcionando mesmo sem liquidação imediata
- PIX confirmado = ordem criada
- Nada fica pendente indefinidamente

### 2. Não mente
- Estimativas claras (não promessas)
- Status transparente
- Histórico completo

### 3. Não se expõe
- Controle humano no momento crítico
- Compliance facilitado
- Risco regulatório reduzido

---

## Próximos Passos

- [ ] Persistência em banco (atualmente em memória)
- [ ] Notificações quando nova ordem criada
- [ ] Histórico de liquidações executadas
- [ ] Dashboard de métricas
- [ ] Export de relatórios

---

*Liquidação assistida: nascer com coluna, não com hype.*
