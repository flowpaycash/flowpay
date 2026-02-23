# Sistema de Login FLOWPay

## Visão Geral

Sistema de autenticação passwordless implementado com magic links e preparado para integração com carteiras Web3 (SIWE).

## Arquivos Implementados

### Frontend

- `public/login.html` - Página principal de login
- `public/auth/verify.html` - Página de verificação do magic link
- `public/client.html` - Página do cliente após autenticação
- `public/css/styles.css` - Estilos para autenticação
- `public/assets/js/login.js` - Lógica de login
- `public/assets/js/auth-verify.js` - Verificação de magic link

### Backend (Railway Functions)

- `src/pages/api/auth/magic-start.js` - Inicia processo de magic link
- `src/pages/api/auth/magic-verify.js` - Verifica magic link

## Fluxo de Autenticação

### 1. Magic Link (Passwordless)

1. Usuário insere e-mail em `/login`
2. Sistema gera token único e envia magic link
3. Usuário clica no link recebido por e-mail
4. Sistema verifica token e cria sessão
5. Usuário é redirecionado para `/client`

### 2. Carteira Web3 (SIWE - Preparado)

1. Usuário clica em "Entrar com carteira"
2. Sistema conecta carteira via Web3Auth
3. Implementa fluxo SIWE (Sign-In with Ethereum)
4. Usuário é autenticado via assinatura criptográfica

## Como Testar

### Desenvolvimento Local

1. Inicie o servidor local: `pnpm run dev`
2. Acesse `/login`
3. Insira um e-mail válido
4. Verifique o console para ver o magic link gerado
5. Copie o link e acesse em nova aba
6. Verifique se a autenticação funciona

### Produção

1. Configure variáveis de ambiente para SMTP
2. Implemente banco de dados para tokens
3. Configure domínio em `process.env.URL`
4. Implemente envio real de e-mails

## Variáveis de Ambiente

```bash
# Para produção
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=seu-email@exemplo.com
SMTP_PASS=sua-senha
NODE_ENV=production
URL=https://seudominio.com

# Para desenvolvimento
NODE_ENV=development
```

## Próximos Passos

### 1. Sistema de E-mails

- [ ] Implementar envio real via SMTP
- [ ] Criar templates de e-mail HTML
- [ ] Configurar filas de envio

### 2. Banco de Dados

- [ ] Armazenar tokens de magic link
- [ ] Implementar expiração automática
- [ ] Sistema de sessões persistente

### 3. Autenticação SIWE

- [ ] Integrar com Web3Auth
- [ ] Implementar fluxo SIWE completo
- [ ] Validação de assinaturas

### 4. Segurança

- [ ] Rate limiting para magic links
- [ ] Validação de domínios de e-mail
- [ ] Middleware de autenticação
- [ ] Logs de auditoria

## Estrutura de URLs

```
/login                    # Página de login
/auth/verify?token=...    # Verificação de magic link
/client                   # Painel do cliente (protegido)
```

## Segurança

- Tokens expiram em 15 minutos
- Validação de formato de e-mail
- CORS configurado adequadamente
- Cookies HttpOnly e Secure
- Rate limiting recomendado para produção

## Integração com Web3Auth

O sistema está preparado para integração com Web3Auth para autenticação via carteira. Implemente:

1. `window.connectWallet()` no frontend
2. Funções SIWE no backend
3. Validação de assinaturas criptográficas
4. Gerenciamento de sessões Web3

## Suporte

Para dúvidas ou problemas:

1. Verifique os logs das funções Railway
2. Teste localmente com `pnpm run dev`
3. Valide configurações de CORS e headers
4. Verifique variáveis de ambiente
