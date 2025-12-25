# CSS Troubleshooting - Astro

## ✅ Verificação Rápida

### 1. Verificar se CSS existe

```bash
# Em desenvolvimento
ls public/css/

# Após build
ls dist/css/
```

### 2. Verificar links no HTML

```bash
# Verificar links CSS no HTML gerado
grep -o 'href="[^"]*\.css"' dist/index.html
```

Deve mostrar:
- `href="/css/landing.css"`
- `href="/css/navbar.css"`
- `href="/css/legacy.css"`

## 🔧 Soluções

### Problema: CSS não carrega em desenvolvimento

**Solução:** O Astro serve arquivos de `public/` automaticamente. Se não funcionar:

1. Verificar se está usando `npm run dev` (não `make dev` diretamente)
2. Verificar console do navegador para erros 404
3. Limpar cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)

### Problema: CSS não carrega no preview

**Solução:** O preview do Astro deve servir arquivos de `dist/`:

```bash
# Build primeiro
npm run build

# Depois preview
npm run preview
```

### Problema: CSS não carrega em produção (Netlify)

**Solução:** Verificar se `netlify.toml` está configurado corretamente:

```toml
[build]
  publish = "dist"
  command = "npm run build"
```

## 🧪 Teste Manual

### 1. Testar desenvolvimento

```bash
npm run dev
# Acessar http://localhost:4321
# Abrir DevTools > Network > Recarregar
# Verificar se CSS retorna 200 OK
```

### 2. Testar build

```bash
npm run build
npm run preview
# Acessar http://localhost:4321
# Verificar se CSS carrega
```

### 3. Verificar arquivos

```bash
# Verificar se CSS foi copiado
ls -la dist/css/

# Verificar tamanho dos arquivos
du -h dist/css/*.css
```

## 📝 Estrutura Esperada

```
dist/
├── css/
│   ├── landing.css    ✅
│   ├── navbar.css     ✅
│   └── legacy.css     ✅
├── index.html         ✅ (com links para CSS)
└── ...
```

## ⚠️ Problemas Comuns

### 1. Cache do navegador

**Sintoma:** CSS antigo sendo usado

**Solução:** 
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
- Limpar cache do navegador
- Abrir em aba anônima

### 2. Caminho incorreto

**Sintoma:** Erro 404 nos arquivos CSS

**Solução:** Verificar se os links usam caminho absoluto (`/css/...`) e não relativo (`css/...`)

### 3. Build não copiou arquivos

**Sintoma:** CSS não existe em `dist/`

**Solução:**
```bash
# Limpar e rebuild
rm -rf dist .astro
npm run build
```

### 4. Servidor não está servindo arquivos estáticos

**Sintoma:** CSS retorna 404 mesmo existindo

**Solução:** Verificar configuração do servidor (Astro serve automaticamente de `public/`)

## 🔍 Debug

### Verificar no console do navegador

```javascript
// Verificar se CSS foi carregado
document.styleSheets.length

// Verificar links CSS
Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href)
```

### Verificar no terminal

```bash
# Verificar se servidor está servindo CSS
curl -I http://localhost:4321/css/landing.css

# Deve retornar: HTTP/1.1 200 OK
```

## 📚 Referências

- [Astro Public Assets](https://docs.astro.build/en/guides/assets/#public-folder)
- [Astro Build Output](https://docs.astro.build/en/guides/deploy/netlify/)

