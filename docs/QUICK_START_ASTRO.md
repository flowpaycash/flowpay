# Quick Start - Astro Setup

## ✅ Problemas Resolvidos

1. **Porta 8000 em uso** - Processo finalizado
2. **Makefile atualizado** - Agora detecta e usa Astro automaticamente

## 🚀 Primeiros Passos

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará:
- `astro` - Framework principal
- `@astrojs/netlify` - Adapter para Netlify
- `@astrojs/react` - Suporte React (opcional)
- `react` e `react-dom` - Para componentes React

### 2. Iniciar Desenvolvimento

```bash
# Opção 1: Via Makefile (recomendado)
make dev

# Opção 2: Via npm diretamente
npm run dev
```

O Astro iniciará em `http://localhost:4321` por padrão.

### 3. Se Precisar das Funções Netlify

```bash
# Desenvolvimento com Netlify Functions
npm run dev:netlify
# ou
make dev-woovi
```

## 📝 Comandos Disponíveis

### Via Makefile

- `make dev` - Inicia Astro Dev (detecta automaticamente)
- `make build` - Build do Astro
- `make dev-woovi` - Dev com Netlify Functions
- `make deploy` - Deploy para produção

### Via npm

- `npm run dev` - Astro Dev
- `npm run dev:netlify` - Netlify Dev
- `npm run build` - Build Astro
- `npm run preview` - Preview do build
- `npm run deploy` - Build + Deploy

## 🔧 Estrutura

```
src/
├── components/     # Componentes Astro
├── layouts/        # Layouts base
└── pages/          # Páginas (rotas)

public/             # Assets estáticos
dist/               # Build output (gerado)
```

## ⚠️ Troubleshooting

### Porta em uso

```bash
# Matar processo na porta 8000
lsof -ti:8000 | xargs kill -9

# Ou usar outra porta
PORT=3000 npm run dev
```

### Dependências não instaladas

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Build falha

```bash
# Limpar cache
rm -rf dist .astro node_modules/.astro
npm run build
```

## 📚 Documentação Completa

Veja `docs/ASTRO_SETUP.md` para documentação detalhada.

