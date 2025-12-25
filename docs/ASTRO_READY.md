# ✅ Astro Configurado e Pronto

## Status

- ✅ Dependências instaladas
- ✅ Astro v4.16.19 funcionando
- ✅ Makefile atualizado
- ✅ Scripts npm configurados

## 🚀 Como Usar Agora

### Desenvolvimento

```bash
# Opção 1: Via Makefile (recomendado)
make dev

# Opção 2: Via npm diretamente
npm run dev
```

O servidor iniciará em `http://localhost:4321`

### Build

```bash
# Via Makefile
make build

# Via npm
npm run build
```

### Preview do Build

```bash
npm run preview
```

### Deploy

```bash
# Via Makefile
make deploy

# Via npm
npm run deploy
```

## 📝 Comandos Disponíveis

### Desenvolvimento

- `make dev` - Astro Dev (detecta automaticamente)
- `npm run dev` - Astro Dev direto
- `make dev-woovi` - Netlify Dev com funções
- `npm run dev:netlify` - Netlify Dev direto

### Build e Deploy

- `make build` - Build Astro
- `npm run build` - Build Astro direto
- `npm run preview` - Preview do build local
- `make deploy` - Build + Deploy Netlify
- `npm run deploy` - Deploy direto

## 🎯 Estrutura do Projeto

```
src/
├── components/     # Componentes Astro reutilizáveis
│   ├── Navbar.astro
│   ├── Hero.astro
│   ├── Features.astro
│   ├── Blockchain.astro
│   ├── CTA.astro
│   └── Footer.astro
├── layouts/
│   └── Layout.astro     # Layout base
└── pages/
    └── index.astro      # Página principal

public/             # Assets estáticos (copiados automaticamente)
dist/               # Build output (gerado pelo Astro)
```

## ⚡ Próximos Passos

1. **Testar desenvolvimento:**
   ```bash
   make dev
   ```

2. **Acessar:** `http://localhost:4321`

3. **Fazer alterações** em `src/pages/index.astro` ou componentes

4. **Ver mudanças** em tempo real (hot reload)

## 🔧 Troubleshooting

### Se o servidor não iniciar

```bash
# Verificar se Astro está instalado
npx astro --version

# Reinstalar dependências se necessário
rm -rf node_modules package-lock.json
npm install
```

### Se houver erros de build

```bash
# Limpar cache
rm -rf dist .astro node_modules/.astro
npm run build
```

### Porta em uso

```bash
# Matar processo na porta 4321 (Astro padrão)
lsof -ti:4321 | xargs kill -9

# Ou usar outra porta
PORT=3000 npm run dev
```

## 📚 Documentação

- `docs/ASTRO_SETUP.md` - Guia completo do Astro
- `docs/QUICK_START_ASTRO.md` - Quick start guide
- [Astro Docs](https://docs.astro.build/) - Documentação oficial

