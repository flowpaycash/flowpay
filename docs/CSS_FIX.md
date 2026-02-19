# CSS Fix - Guia Rápido

## ✅ Status Atual

- ✅ CSS existe em `public/css/`
- ✅ CSS é copiado para `dist/css/` no build
- ✅ Links no HTML estão corretos (`/css/landing.css`)
- ✅ CSS é servido corretamente no desenvolvimento

## 🚀 Como Testar

### Desenvolvimento

```bash
npm run dev
# Acessar http://localhost:4321 (ou porta que aparecer)
# CSS deve carregar automaticamente
```

### Preview do Build

```bash
# Build primeiro
npm run build

# Preview (agora usa serve ao invés de astro preview)
npm run preview
# Acessar http://localhost:4321
```

## 🔍 Se CSS ainda não aparecer

### 1. Verificar Console do Navegador

Abra DevTools (F12) e verifique:

- **Network tab**: Procure por `landing.css`, `navbar.css`, `legacy.css`
- **Console tab**: Procure por erros 404 ou CORS

### 2. Hard Refresh

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### 3. Verificar se arquivos existem

```bash
# Em desenvolvimento
ls -la public/css/

# Após build
ls -la dist/css/
```

### 4. Testar acesso direto

```bash
# Em desenvolvimento (com servidor rodando)
curl http://localhost:4321/css/landing.css | head -5

# Deve mostrar o conteúdo do CSS
```

## 📝 Estrutura Correta

```
public/css/          # CSS original (desenvolvimento)
├── landing.css
├── navbar.css
└── legacy.css

dist/css/            # CSS copiado (build)
├── landing.css
├── navbar.css
└── legacy.css
```

## ⚠️ Nota sobre Preview

O adapter `@astrojs/netlify` não suporta `astro preview` nativamente. Por isso, o script `preview` foi alterado para usar `serve` diretamente no diretório `dist/`.

## 🔧 Alternativa: Usar Netlify Dev

Se quiser testar com todas as funcionalidades do Netlify:

```bash
npm run dev:netlify
# ou
make dev-woovi
```

Isso iniciará o Netlify Dev que simula o ambiente de produção.

