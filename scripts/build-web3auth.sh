#!/bin/bash

echo "🔧 Build Web3Auth otimizado..."

# Configurações agressivas para reduzir bundle size
npx esbuild public/assets/js/web3auth.init.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --tree-shaking=true \
  --metafile=public/assets/js/web3auth.meta.json \
  --analyze \
  --outfile=public/assets/js/web3auth.js

echo "✅ Bundle gerado: public/assets/js/web3auth.js"
echo "📊 Tamanho atual:"
ls -lh public/assets/js/web3auth.js

echo ""
echo "🔍 Análise de dependências:"
echo "Verifique public/assets/js/web3auth.meta.json para detalhes"
