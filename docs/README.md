# 📚 FLOWPay - Documentação Completa

Bem-vindo à documentação completa do **FLOWPay** - sua solução PWA para pagamentos Pix e criptomoedas!

## 🚀 **Visão Geral**

O FLOWPay é uma aplicação web progressiva (PWA) que integra pagamentos Pix via Woovi/OpenPix com suporte a múltiplas blockchains, oferecendo uma experiência iOS-like moderna e responsiva.

## 📖 **Guias por Categoria**

### 🎨 **Design e Interface**
- **[IOS_DESIGN_GUIDE.md](./IOS_DESIGN_GUIDE.md)** - Implementação do design iOS-like para cards de navegação
- **[IOS_DESIGN_COMPLETE.md](./IOS_DESIGN_COMPLETE.md)** - Guia completo de design iOS para todo o projeto

### 📱 **PWA e Assets**
- **[PWA_ASSETS_GUIDE.md](./PWA_ASSETS_GUIDE.md)** - Geração automática de assets PWA (ícones, splash screens)
- **[PWA_TEST_GUIDE.md](./PWA_TEST_GUIDE.md)** - Como testar funcionalidades PWA

### 🔒 **Segurança e Configuração**
- **[CSP_RESOLUTION_GUIDE.md](./CSP_RESOLUTION_GUIDE.md)** - Resolução de problemas de Content Security Policy
- **[ADMIN_PANEL_GUIDE.md](./ADMIN_PANEL_GUIDE.md)** - Painel administrativo com autenticação

### 🚀 **Deploy e Infraestrutura**
- **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)** - Guia de deploy geral
- **[NETLIFY_DEPLOY_GUIDE.md](./NETLIFY_DEPLOY_GUIDE.md)** - Deploy específico para Netlify

### 🔧 **Integração e Testes**
- **[TESTE_WOOVI.md](./TESTE_WOOVI.md)** - Testes da integração com Woovi/OpenPix
- **[TELEGRAM_SETUP_GUIDE.md](./TELEGRAM_SETUP_GUIDE.md)** - Configuração de notificações Telegram

## 🏗️ **Arquitetura do Projeto**

```
flowpay/
├── docs/                    # 📚 Documentação (esta pasta)
├── public/                  # 🌐 Frontend PWA
│   ├── admin/              # 🧾 Painel administrativo
│   ├── css/                # 🎨 Estilos CSS
│   ├── img/                # 🖼️ Imagens e ícones
│   └── ...                 # 📱 Outros assets PWA
├── .netlify/functions/     # ⚡ Netlify Functions
├── Makefile                # 🔧 Automação do projeto
├── netlify.toml           # ⚙️ Configuração Netlify
└── package.json            # 📦 Dependências Node.js
```

## 🚀 **Começando Rápido**

### **1. Instalação**
```bash
make install-woovi
```

### **2. Desenvolvimento Local**
```bash
make dev-woovi
```

### **3. Build e Deploy**
```bash
make build
make deploy-woovi
```

## 🔑 **Funcionalidades Principais**

- ✅ **PWA Completa** com 49 assets iOS-like
- 🧾 **Painel Admin** com autenticação (/admin)
- 💰 **Integração Woovi/OpenPix** para Pix
- 🔒 **Webhook Handler** para confirmações
- 📱 **Notificações Telegram** em tempo real
- 🎨 **Design iOS Nativo** responsivo
- 📱 **Service Worker** para offline
- 🔐 **CSP Configurado** e seguro

## 🌐 **URLs Importantes**

- **Site Principal:** `/` - Landing page com design iOS
- **Painel Admin:** `/admin` - Gerenciamento de transações
- **Checkout Pix:** `/checkout` - Interface de pagamento
- **API Functions:** `/.netlify/functions/*` - Backend serverless

## 🔧 **Configuração de Ambiente**

### **Variáveis Necessárias:**
```bash
WOOVI_API_KEY=sua_chave_api
WOOVI_WEBHOOK_SECRET=secret_webhook
WOOVI_API_URL=https://api.woovi.com
NETLIFY_URL=https://seudominio.netlify.app
FLOWPAY_URL=https://seudominio.netlify.app
ADMIN_PASSWORD=senha_admin
```

### **Variáveis Opcionais (Telegram):**
```bash
TELEGRAM_BOT_TOKEN=seu_bot_token
TELEGRAM_CHAT_ID=seu_chat_id
```

## 📱 **Testando PWA**

1. **Local:** `npx serve public`
2. **Mobile:** Acesse no celular e adicione à tela inicial
3. **Admin:** Acesse `/admin` com senha `flowpay2024`

## 🆘 **Suporte**

- **Issues:** Abra no repositório GitHub
- **Documentação:** Consulte os guias específicos acima
- **Deploy:** Siga o [NETLIFY_DEPLOY_GUIDE.md](./NETLIFY_DEPLOY_GUIDE.md)
- **Telegram:** Configure seguindo o [TELEGRAM_SETUP_GUIDE.md](./TELEGRAM_SETUP_GUIDE.md)

## 📄 **Licença**

Este projeto é parte do ecossistema FLOWPay.

---

**🚀 FLOWPay - Transformando pagamentos em experiência!**

*Última atualização: Agosto 2024*
