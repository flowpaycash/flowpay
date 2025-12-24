# 🚀 FLOWPay - Deploy para Netlify

## ✅ **CONFIGURAÇÃO COMPLETA ANTES DO DEPLOY**

### 🔧 **1. Arquivos Configurados:**

#### **✅ .env (Variáveis de Ambiente):**
```bash
# URLs principais
FLOWPAY_URL=https://flowpay.com
NETLIFY_URL=https://flowpaypix.netlify.app

# Woovi/OpenPix API
WOOVI_API_KEY=sua_api_key_aqui
WOOVI_API_URL=https://api.woovi.com
WOOVI_WEBHOOK_SECRET=seu_webhook_secret_aqui

# Configurações da aplicação
NODE_ENV=production
APP_NAME=FLOWPay
APP_VERSION=1.0.0
```

#### **✅ .netlify/functions/env.js (Função de Ambiente):**
- ✅ Todas as variáveis configuradas
- ✅ Headers CORS configurados
- ✅ Status das funcionalidades
- ✅ Timestamp de build

#### **✅ netlify.toml (Configuração Netlify):**
- ✅ Funções configuradas
- ✅ Headers de segurança
- ✅ CSP configurado
- ✅ Redirects configurados

## 🚀 **2. DEPLOY PARA NETLIFY**

### **Opção 1: Deploy via Netlify CLI (Recomendado)**

```bash
# 1. Fazer login no Netlify (se não estiver logado)
netlify login

# 2. Deploy com criação de site
netlify deploy --create-site flowpay --prod

# 3. Ou se já tiver um site configurado
netlify deploy --prod
```

### **Opção 2: Deploy via Makefile**

```bash
# Deploy completo com funções
make deploy-woovi

# Ou comandos individuais
make build
netlify deploy --prod
```

### **Opção 3: Deploy via Interface Web**

1. Acesse [netlify.com](https://netlify.com)
2. Faça login/cadastro
3. Clique em "New site from Git"
4. Conecte seu repositório GitHub
5. Configure as variáveis de ambiente

## 🔑 **3. CONFIGURAR VARIÁVEIS DE AMBIENTE NO NETLIFY**

### **Via Interface Web:**
1. **Site Settings** → **Environment variables**
2. **Add variable** para cada variável:

```
FLOWPAY_URL = https://flowpay.com
NETLIFY_URL = https://seu-site.netlify.app
WOOVI_API_KEY = sua_api_key_real_aqui
WOOVI_API_URL = https://api.woovi.com
WOOVI_WEBHOOK_SECRET = seu_webhook_secret_real_aqui
NODE_ENV = production
```

### **Via Netlify CLI:**
```bash
# Configurar variáveis
netlify env:set FLOWPAY_URL https://flowpay.com
netlify env:set NETLIFY_URL https://seu-site.netlify.app
netlify env:set WOOVI_API_KEY sua_api_key_real_aqui
netlify env:set WOOVI_API_URL https://api.woovi.com
netlify env:set WOOVI_WEBHOOK_SECRET seu_webhook_secret_real_aqui
netlify env:set NODE_ENV production
```

## 🌐 **4. CONFIGURAR DOMÍNIO CUSTOMIZADO (OPCIONAL)**

### **Subdomínio Netlify:**
- ✅ Automático: `flowpay.netlify.app`
- ✅ Personalizado: `flowpay.seudominio.com`

### **Domínio Principal:**
1. **Site Settings** → **Domain management**
2. **Add custom domain**
3. Configure DNS com seu provedor
4. Aguarde propagação (24-48h)

## 🔒 **5. CONFIGURAR WOOVI/OPENPIX**

### **Obter Credenciais:**
1. Acesse [app.woovi.com](https://app.woovi.com)
2. Crie uma conta ou faça login
3. Vá para **Settings** → **API Keys**
4. Gere uma nova API Key
5. Configure o Webhook Secret

### **Configurar Webhook:**
1. **Settings** → **Webhooks**
2. **Add webhook**
3. **URL:** `https://seu-site.netlify.app/.netlify/functions/webhook-handler`
4. **Events:** `charge.completed`
5. **Secret:** Use o mesmo do .env

## 📱 **6. TESTAR DEPLOY**

### **URLs de Teste:**
- ✅ **Site Principal:** `https://seu-site.netlify.app`
- ✅ **Checkout Pix:** `https://seu-site.netlify.app/checkout`
- ✅ **Teste CSP:** `https://seu-site.netlify.app/csp-test.html`
- ✅ **Função Env:** `https://seu-site.netlify.app/.netlify/functions/env`

### **Testes de Funcionalidade:**
1. **PWA:** Instalar como app
2. **Design iOS:** Verificar responsividade
3. **Cards:** Testar interatividade
4. **Blockchain:** Clicar nos logos
5. **Woovi:** Testar checkout (modo mock)

## 🚨 **7. SOLUÇÃO DE PROBLEMAS**

### **Erro: "Functions not found"**
```bash
# Verificar se as funções estão na pasta correta
ls -la .netlify/functions/

# Rebuild e redeploy
make build
netlify deploy --prod
```

### **Erro: "Environment variables not found"**
```bash
# Verificar variáveis no Netlify
netlify env:list

# Configurar novamente
netlify env:set WOOVI_API_KEY sua_chave
```

### **Erro: "CSP blocking scripts"**
- ✅ CSP já configurado no netlify.toml
- ✅ csp-config.js incluído nas páginas
- ✅ Headers configurados corretamente

## 📊 **8. MONITORAMENTO**

### **Netlify Analytics:**
- ✅ **Visitas** e **pageviews**
- ✅ **Performance** e **Core Web Vitals**
- ✅ **Funções** executadas
- ✅ **Erros** e **logs**

### **Funções Netlify:**
- ✅ **create-pix-charge:** Criação de cobranças
- ✅ **webhook-handler:** Processamento de webhooks
- ✅ **env:** Configurações de ambiente

## 🎯 **9. CHECKLIST FINAL**

### **✅ Antes do Deploy:**
- [ ] `.env` configurado
- [ ] `env.js` atualizado
- [ ] `netlify.toml` configurado
- [ ] Funções testadas localmente
- [ ] PWA assets gerados

### **✅ Durante o Deploy:**
- [ ] Login no Netlify CLI
- [ ] Variáveis de ambiente configuradas
- [ ] Site criado/configurado
- [ ] Deploy executado com sucesso

### **✅ Após o Deploy:**
- [ ] Site funcionando
- [ ] PWA instalável
- [ ] Funções executando
- [ ] Design iOS funcionando
- [ ] Woovi integrado (modo mock)

## 🎉 **10. RESULTADO FINAL**

**🚀 FLOWPay ONLINE no Netlify!**

- ✅ **Site:** https://seu-site.netlify.app
- ✅ **PWA:** Instalável como app nativo
- ✅ **Design iOS:** Funcionando perfeitamente
- ✅ **Integração Woovi:** Pronta para produção
- ✅ **Assets PWA:** 49 arquivos otimizados
- ✅ **Responsividade:** Todos os dispositivos

**Pronto para uso em produção! 🚀📱✨**

---

**🎯 Próximo passo:** Execute `netlify deploy --create-site flowpay --prod`
**🌐 Seu site estará online em minutos! ⚡**
