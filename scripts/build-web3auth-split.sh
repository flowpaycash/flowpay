#!/bin/bash

echo "🚀 Build Web3Auth Split (Lazy Loading NΞØ)..."

# Limpar builds anteriores
rm -f public/assets/js/wallet.boot.js
rm -f public/assets/js/web3auth.inner-*.js

# Build com splitting inteligente
npx esbuild public/assets/js/wallet.boot.ts public/assets/js/web3auth.inner.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --splitting \
  --minify \
  --legal-comments=none \
  --drop:console \
  --outdir=public/assets/js \
  --metafile=public/assets/js/web3auth.split.meta.json \
  --analyze

echo "✅ Build split concluído!"
echo "📊 Arquivos gerados:"
ls -la public/assets/js/wallet.boot.js public/assets/js/web3auth.inner-*.js 2>/dev/null || echo "Arquivos não encontrados"

echo ""
echo "🔍 Para análise detalhada:"
echo "   cat public/assets/js/web3auth.split.meta.json"
