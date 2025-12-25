# Setup Astro - FLOWPay

## ✅ Estrutura Criada

O projeto agora está configurado com Astro para melhorar performance e organização do código.

### Estrutura de Diretórios

```
/
├── src/
│   ├── components/          # Componentes Astro reutilizáveis
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Blockchain.astro
│   │   ├── CTA.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── Layout.astro     # Layout base com meta tags PWA
│   └── pages/
│       └── index.astro       # Página principal
├── public/                  # Assets estáticos (copiados para dist/)
├── dist/                    # Build output (gerado pelo Astro)
├── astro.config.mjs         # Configuração do Astro
└── tsconfig.json            # TypeScript config
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará:
- `astro` - Framework principal
- `@astrojs/netlify` - Adapter para Netlify
- `@astrojs/react` - Suporte React (opcional)
- `react` e `react-dom` - Para componentes React se necessário

### 2. Desenvolvimento

```bash
# Desenvolvimento com Astro (hot reload)
npm run dev

# Ou desenvolvimento com Netlify Functions
npm run dev:netlify
```

O Astro roda em `http://localhost:4321` por padrão.

### 3. Build

```bash
# Build do Astro
npm run build

# Build completo (Astro + Netlify)
npm run build:netlify
```

O build gera os arquivos em `dist/` que são otimizados e prontos para produção.

### 4. Preview Local

```bash
npm run preview
```

Visualiza o build de produção localmente antes do deploy.

### 5. Deploy

```bash
npm run deploy
```

Faz build e deploy para Netlify.

## 📦 Migração Gradual

### Estratégia

1. **Fase Atual**: Astro gera `dist/`, Netlify usa `dist/` como publish
2. **Assets Estáticos**: Mantidos em `public/` e copiados automaticamente
3. **Funções Netlify**: Continuam funcionando normalmente em `netlify/functions/`

### Arquivos Mantidos em `public/`

- Assets estáticos (imagens, ícones, splash screens)
- CSS existente (landing.css, navbar.css, etc.)
- JavaScript legacy (layout-injector.js, csp-config.js)
- Manifest.json e outros arquivos PWA
- Páginas HTML antigas (checkout.html, transparency.html, etc.)

### Páginas Migradas para Astro

- `index.html` → `src/pages/index.astro`

### Próximas Migrações (Opcional)

- `transparency.html` → `src/pages/transparency.astro`
- `checkout.html` → `src/pages/checkout.astro`
- Componentes reutilizáveis → `src/components/`

## 🎨 Vantagens do Astro

1. **Performance**
   - HTML estático puro (zero JS por padrão)
   - Componentes carregam JS apenas quando necessário
   - Build otimizado e minificado

2. **Organização**
   - Componentes reutilizáveis
   - Layouts centralizados
   - TypeScript nativo

3. **Compatibilidade**
   - Mantém CSS/JS existente funcionando
   - Suporta React/Vue/Svelte se necessário
   - Integração perfeita com Netlify

4. **Developer Experience**
   - Hot reload rápido
   - TypeScript out-of-the-box
   - Componentes com scoped styles

## 🔧 Configuração

### astro.config.mjs

```javascript
export default defineConfig({
  output: 'static',           // HTML estático
  integrations: [react()],     // React opcional
  adapter: netlify(),         // Netlify adapter
  publicDir: 'public',        // Assets estáticos
  outDir: 'dist',             // Output directory
});
```

### netlify.toml

```toml
[build]
  publish = "dist"            # Usa output do Astro
  command = "npm run build"   # Build do Astro
```

## 📝 Scripts Disponíveis

- `npm run dev` - Desenvolvimento Astro
- `npm run dev:netlify` - Desenvolvimento com Netlify Functions
- `npm run build` - Build Astro
- `npm run build:netlify` - Build completo
- `npm run preview` - Preview do build
- `npm run deploy` - Build + Deploy

## ⚠️ Notas Importantes

1. **Assets Estáticos**: Arquivos em `public/` são copiados para `dist/` durante o build
2. **CSS Existente**: Mantido em `public/css/` e funciona normalmente
3. **JavaScript Legacy**: Mantido em `public/js/` e funciona normalmente
4. **Funções Netlify**: Continuam em `netlify/functions/` e funcionam normalmente
5. **PWA**: Manifest e splash screens continuam funcionando

## 🐛 Troubleshooting

### Build falha

```bash
# Limpar cache e reinstalar
rm -rf node_modules dist .astro
npm install
npm run build
```

### Assets não aparecem

Verifique se os arquivos estão em `public/` - eles são copiados automaticamente.

### Funções Netlify não funcionam

As funções continuam em `netlify/functions/` e devem funcionar normalmente. Se houver problemas, use `npm run dev:netlify`.

## 📚 Próximos Passos

1. Migrar mais páginas para Astro (opcional)
2. Criar mais componentes reutilizáveis
3. Otimizar CSS com Astro CSS modules (opcional)
4. Adicionar TypeScript strict mode (opcional)

