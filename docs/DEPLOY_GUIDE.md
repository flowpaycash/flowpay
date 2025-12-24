# 🚀 Guia de Deploy - FLOWPay

## 📋 Pré-requisitos

- Conta no [Netlify](https://netlify.com)
- Repositório GitHub configurado
- Variável `FLOWPAY_URL` definida

## 🔧 Passo a Passo

### 1. Conectar ao Netlify

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em **"New site from Git"**
3. Escolha **GitHub** como provedor
4. Autorize o Netlify a acessar seus repositórios

### 2. Selecionar Repositório

1. Procure por `flowpaycash/flowpay`
2. Clique no repositório
3. Confirme a branch `main`

### 3. Configurar Build

**Build settings:**
- **Build command:** (deixe em branco - site estático)
- **Publish directory:** `public`
- **Functions directory:** `.netlify/functions`

### 4. Configurar Variáveis de Ambiente

1. Vá para **Site settings** > **Environment variables**
2. Adicione:
   ```
   FLOWPAY_URL = https://seuhub.com
   ```
3. Substitua `https://seuhub.com` pela URL real do seu Hub

### 5. Deploy

1. Clique em **"Deploy site"**
2. Aguarde o build (deve levar menos de 2 minutos)
3. Seu site estará disponível em `https://random-name.netlify.app`

### 6. Configurar Domínio Personalizado (Opcional)

1. Vá para **Domain management**
2. Clique em **"Add custom domain"**
3. Siga as instruções para configurar DNS

## ✅ Verificação

Após o deploy:

1. Acesse seu site
2. Verifique se o botão "Ir para o Hub" está funcionando
3. Teste em diferentes dispositivos
4. Verifique se as imagens estão carregando

## 🔍 Troubleshooting

### Botão não funciona
- Verifique se `FLOWPAY_URL` está configurada
- Abra o console do navegador para erros
- Teste a função Netlify em `/.netlify/functions/env`

### Imagens não carregam
- Verifique se os arquivos estão na pasta `public/img/`
- Confirme se os caminhos no HTML estão corretos

### Erro de build
- Verifique se a pasta `public` existe
- Confirme se o `netlify.toml` está correto

## 📱 Teste Local

Para testar antes do deploy:

### Opção 1: Netlify CLI (Recomendado)
```bash
# Instalar Netlify CLI globalmente
npm install -g netlify-cli

# Navegar para o projeto
cd flowpay

# Iniciar servidor local
netlify dev

# Acessar em http://localhost:8888
```

### Opção 2: Servidor HTTP simples
```bash
cd flowpay/public

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (com http-server)
npx http-server -p 8000

# Acessar em http://localhost:8000
```

## 🎯 Próximos Passos

- [ ] Configurar analytics
- [ ] Adicionar SEO meta tags
- [ ] Implementar PWA
- [ ] Adicionar testes automatizados

---

**🎉 Parabéns!** Seu FLOWPay está no ar e pronto para receber visitantes!
