# FLOWPay v2.1.1

> Pix ⧉ Cripto — instantâneo, livre, sem intermediário.

---

## Protocolo NEØ

- Checkout Pix pronto (Woovi/OpenPix)
- Webhook HMAC validado
- Painel Admin `/admin` (auth via `.env`)
- JSON local de cada transação Pix
- Deploy serverless (Netlify)
- PWA iOS-style + manifest pronto
- Integração opcional com Telegram

---

## Setup Rápido

```bash
make install-woovi   # instala dependências
make dev-woovi       # roda local com Netlify
make deploy-woovi    # deploy em 1 comando
```

---

## Variáveis .env

```env
WOOVI_API_KEY=xxxxxxx
WOOVI_API_URL=https://api.woovi.com
WOOVI_WEBHOOK_SECRET=flowpay-secret
ADMIN_PASSWORD=flowpay2024

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## Rotas

| Path               | Função                |
| ------------------ | --------------------- |
| `/`                | Landing principal     |
| `/checkout`        | Checkout Pix          |
| `/admin`           | Painel admin          |
| `/pix_orders.json` | Histórico de Pix JSON |

---

## Funções Serverless

| Endpoint                                | Função             |
| --------------------------------------- | ------------------ |
| `/.netlify/functions/env`               | Exibe variáveis    |
| `/.netlify/functions/create-pix-charge` | Cria cobrança Pix  |
| `/.netlify/functions/webhook-handler`   | Webhook Pix + HMAC |
| `/.netlify/functions/pix-orders`        | Lista JSON         |
| `/.netlify/functions/send-test-telegram`| Teste Telegram dev |

---

## Estrutura

```
flowpay/
├── public/               # Frontend PWA
├── .netlify/functions/   # Funções serverless
├── docs/                 # Guias / protocolo
├── netlify.toml          # Deploy config
└── Makefile              # Automação
```

---

## Testes

- `/checkout` → checkout real
- webhook → evento `OPENPIX:CHARGE_COMPLETED`
- `/admin` → senha via `.env`
- `send-test-telegram` → ping bot

---

## Filosofia

> "Fluxo sem servidor. Checkout sem permissão. Deploy sem dono."

---

## Deploy

Netlify → [flowpaypix.netlify.app](https://flowpaypix.netlify.app)

---

## Dev Mode

```bash
npx serve public   # frontend puro
netlify dev        # full stack local
```

---

## Autor

**MELLØ**  
[@flowpay](https://t.me/flowpay) // [@kauntdewn](https://t.me/neomello)  
GitHub → [nettomello](https://github.com/neoomello)

---

> ⧉ **FLOWPay = NEØ Protocol**

---

Author: MELLØ // POST-HUMAN

This project follows my personal working standards.
Changes are allowed, inconsistency is not.
