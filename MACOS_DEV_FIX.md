# 🍎 Fix para Desenvolvimento Local no macOS

## Problema Identificado

O macOS **System Integrity Protection (SIP)** está bloqueando a criação de arquivos `.tmp` no diretório `.astro/`, causando o erro:

```
EPERM: operation not permitted, open '.astro/content-assets.mjs.tmp'
```

## ✅ Solução Recomendada: Mover o Projeto

O SIP protege certos diretórios. A solução mais simples é mover o projeto para um local não protegido:

### Opção 1: Mover para ~/Projects (Recomendado)

```bash
# 1. Criar diretório Projects se não existir
mkdir -p ~/Projects

# 2. Mover o projeto
mv /Users/nettomello/neomello/01-neo-protocol-org/flowpay ~/Projects/flowpay

# 3. Criar symlink para manter compatibilidade (opcional)
ln -s ~/Projects/flowpay /Users/nettomello/neomello/01-neo-protocol-org/flowpay

# 4. Navegar para o novo local
cd ~/Projects/flowpay

# 5. Testar
pnpm run dev
```

### Opção 2: Usar Docker (Alternativa)

Se preferir manter o projeto no local atual, use Docker:

```bash
# Criar Dockerfile
cat > Dockerfile <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
EXPOSE 4321
CMD ["pnpm", "run", "dev"]
EOF

# Criar docker-compose.yml
cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  flowpay:
    build: .
    ports:
      - "4321:4321"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
EOF

# Rodar
docker-compose up
```

### Opção 3: Desabilitar SIP (NÃO RECOMENDADO)

⚠️ **Isso compromete a segurança do seu Mac!**

1. Reinicie em Recovery Mode (Command + R durante boot)
2. Abra Terminal
3. Execute: `csrutil disable`
4. Reinicie

## 🔍 Diagnóstico

Para verificar se o problema foi resolvido:

```bash
# Testar criação de arquivo .tmp
node -e "const fs = require('fs'); fs.writeFileSync('.astro/test.tmp', 'test'); fs.unlinkSync('.astro/test.tmp'); console.log('✅ OK');"
```

## 📝 Notas

- O projeto funciona perfeitamente em produção (Railway/Vercel)
- O problema afeta apenas o desenvolvimento local no macOS
- Full Disk Access já está habilitado, mas não resolve este problema específico
- O SIP protege contra malware que cria arquivos temporários maliciosos

## 🚀 Status Atual

- ✅ Build em produção: Funcionando
- ✅ Deploy: Funcionando
- ✅ Git operations: Funcionando
- ❌ Dev server local: Bloqueado pelo SIP
