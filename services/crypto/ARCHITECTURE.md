# FLOWPay - Arquitetura do Núcleo Cripto

## Princípios Arquiteturais

### 1. Bounded Context Isolado

O módulo `services/crypto/` é um **bounded context** completo:

- Responsabilidades claras e delimitadas
- Pode evoluir sem contaminar o gateway PIX
- Interface bem definida com o resto do sistema
- Testável de forma independente

**Isso não é hype. É arquitetura adulta.**

---

### 2. Ordem Lógica do Fluxo

O fluxo está correto **do ponto de vista lógico**:

```text
PIX confirmado → liquidação → transferência → prova → retorno
```

**Não misturamos:**

- Prova com liquidação
- Identidade com UX
- Regras de negócio com detalhes técnicos

Cada coisa no seu lugar. Isso evita bugs jurídicos e bugs mentais.

---

### 3. Wallet Registry como Entidade de Primeira Classe

Tratar wallet como entidade própria (não detalhe técnico) é essencial para:

- Recorrência
- Contratos
- Rastreabilidade
- Prova posterior

Isso casa perfeitamente com a ideia de **pagamento como assinatura**.

---

## 💡 Conceito Central: Liquidação Programável

### O que NÃO é

❌ **"Conversão automática"** - Implica automação perfeita e risco regulatório

### O que É

✅ **"Liquidação programável"** - Pagamentos liquidados em USDT conforme regras claras e auditáveis

### Diferença Fundamental

| Conversão Automática | Liquidação Programável |
| -------------------- | ---------------------- |
| Implica automação perfeita | Admite estratégias flexíveis |
| Risco regulatório alto | Regras claras e auditáveis |
| Dependência de liquidez perfeita | Suporta janelas e delegação |
| "Mágico" e não vendável | Transparente e vendável |

---

## Estratégias de Liquidação

O sistema suporta três estratégias:

### 1. `auto` (Automática)

- Liquidação imediata
- Requer liquidez disponível
- Para volumes pequenos/médios
- Risco: Dependência de provedor

### 2. `manual` (Manual)

- Aguarda aprovação humana
- Para volumes maiores
- Controle de compliance
- Risco: Latência operacional

### 3. `deferred` (Agendada)

- Liquidação em janelas específicas
- Otimização de custos
- Batching de transações
- Risco: Complexidade de agendamento

---

## Ponto Único de Integração

Tudo entra em um único lugar:

`netlify/functions/webhook-handler.js`

### Fluxo Realista

```javascript
if (pix.status === 'CONFIRMED') {
  // 1. Resolver wallet do usuário
  const wallet = walletRegistry.resolve(pix.userId);

  // 2. Liquidar pagamento (não "converter")
  const settlement = await liquidityProvider.settle({
    amountBRL: pix.amount,
    target: 'USDT',
    strategy: 'auto|manual|deferred', // Configurável
    correlationId: pix.correlationID
  });

  // 3. Executar transferência (se liquidação estiver pronta)
  if (settlement.ready) {
    await usdtTransfer.execute({
      wallet,
      amount: settlement.amountUSDT,
      network: settlement.network,
      correlationId: pix.correlationID
    });
  }

  // 4. Registrar prova on-chain
  await proofRegistry.write({
    pix,
    settlement,
    txHash
  });
}
```

### Detalhe Importante

**`settle ≠ transfer`**

Isso te salva em 100 cenários futuros:

- Liquidação pode estar pronta mas transferência aguardar
- Transferência pode falhar mas liquidação estar registrada
- Prova pode ser escrita independente do status da transferência

---

## ⚠️ Riscos Reais (Não Técnicos, Estruturais)

### 1. Liquidação não é "detalhe"

A frase "Liquida BRL → USDT" não é apenas código. É:

- ⚠️ Risco regulatório
- ⚠️ Risco de liquidez
- ⚠️ Risco de custódia temporária
- ⚠️ Risco de responsabilidade fiduciária

**Isso não invalida o projeto. Mas define como ele deve nascer.**

### 2. Primeiro Corte não pode depender de automação perfeita

O v0 do FlowPay **não pode depender de liquidação automática perfeita**.

Deve suportar:

- Liquidação assistida
- Liquidação em janelas
- Liquidação delegada

**O código já está preparado. A narrativa precisa refletir.**

### 3. Chave privada em env é aceitável só no v0

```bash
SERVICE_WALLET_PRIVATE_KEY=0x...
```

Aceitável apenas como:

- Protótipo controlado
- Volume baixo
- Wallet de serviço isolada
- Limites rígidos

**Arquiteturalmente, você já fez o certo ao centralizar isso num módulo.**

Depois troca por:

- HSM
- Custodian
- MPC
- Smart contract wallet

**Sem refatorar o sistema inteiro.**

---

## O que você tem agora (Verdade Objetiva)

### Você TEM


- Gateway PIX funcional
- Núcleo cripto coerente
- Manifesto alinhado com execução
- Arquitetura que pode operar em silêncio
- Separação de domínios madura
- Fluxo lógico correto

### Você NÃO TEM ainda


- Escala
- Automação total
- Blindagem regulatória completa

**E isso é absolutamente normal para um v0 real.**

---

## Próximos Passos Arquiteturais

1. **Implementar estratégias de liquidação** (auto/manual/deferred)
2. **Adicionar janelas de liquidação** (batching)
3. **Implementar retry logic** com backoff exponencial
4. **Adicionar monitoramento** de liquidez disponível
5. **Criar dashboard** de liquidações pendentes
6. **Implementar HSM/custodian** para chaves privadas
7. **Adicionar compliance checks** antes de liquidação

---

*Arquitetura que nasce para evoluir, não para travar.*

