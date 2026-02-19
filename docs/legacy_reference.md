# Legacy Reference: FLOWPay (Python/Flask)

Este documento contém a "inteligência de negócio" extraída do repositório legado `neomello/flowpaycash` antes de sua deleção. Estas informações servem como blueprint para funcionalidades futuras no novo FLOWPay (Astro/Node).

---

## 🤖 AI Assistant System Prompt
O assistente utilizava a API da Perplexity (`sonar-medium-online`) com o seguinte prompt de sistema:

### Core Identity & Rules
> Você é o FlowPay AI Assistant, um assistente inteligente, seguro e alinhado com os princípios da Web3. Seu papel é ajudar usuários, lojistas e desenvolvedores a usarem a plataforma FlowPay de maneira eficiente e segura. Seja direto, amigável e, quando necessário, técnico. Utilize exemplos simples para explicar conceitos complexos. Jamais invente dados sensíveis e, caso necessário, direcione o usuário para suporte humano.

### Detalhes Técnicos (Contexto)
- **Blockchains:** Ethereum, Polygon, Linea, Base, Mantle, OpBNB, e Unichain.
- **Ativos:** USDT, ETH, USDC, DAI, MATIC.
- **Taxas Dinâmicas:** 0.8% a 2.5% (ver seção de taxas abaixo).
- **Funcionalidades:** Gateway fiat/crypto, botões de pagamento customizáveis, painel administrativo, webhooks e APIs REST.
- **Segurança:** Descentralizado, autocustodial, focado em auditoria.

---

## 💰 Estrutura de Taxas Dinâmicas (Legacy)
Implementado originalmente no `utils.py`:

| Valor da Transação | Taxa (%) |
| :--- | :--- |
| R$ 0,01 – R$ 99,99 | 2.5% |
| R$ 100,00 – R$ 294,99 | 1.5% |
| R$ 295,00 – R$ 999,99 | 0.5% |
| R$ 1.000,00+ | 0.25% (Base/Negociável) |

---

## 🏛️ Modelagem de Dados (Blueprints)

### PaymentButton
Modelo para botões de checkout que podem ser incorporados em sites terceiros.
- `external_id`: UUID para identificação pública.
- `name`: Nome interno do botão.
- `product_name`: Nome exibido ao cliente.
- `button_text`: Texto do CTA (default: "Pagar com FlowPay").
- `amount` & `currency`: Valor e moeda (default: BRL).
- `success_url` / `cancel_url` / `callback_url`: Redirecionamentos e webhooks.
- `allowed_payment_methods`: String separada por vírgula (pix, usdt, etc).
- `allowed_blockchain_networks`: Redes habilitadas para este botão.
- `connect_wallet`: Booleano para forçar conexão de carteira.

### Transaction
Registro de todas as tentativas e conclusões de pagamento.
- `status`: `pending`, `completed`, `failed`, `expired`.
- `fee_percentage`: Taxa aplicada no momento da criação.
- `fee_amount`: Valor da taxa em BRL.
- `merchant_amount`: Valor líquido a ser repassado ao lojista.
- `crypto_transaction_hash`: Hash on-chain (se aplicável).
- `wallet_connection_used`: Qual provider de carteira foi usado.

---

## 🔗 Fluxo de Webhook & Callbacks
O sistema legado enviava um POST JSON para a `callback_url` do lojista quando o status mudava para `completed`.
**Payload sugerido:**
```json
{
  "transaction_id": "uuid-aqui",
  "status": "completed",
  "amount": 100.00,
  "currency": "BRL",
  "product_name": "Produto Exemplo",
  "timestamp": "2024-..."
}
```

---

*Documento gerado em 03/02/2026 para preservação histórica e técnica.*
