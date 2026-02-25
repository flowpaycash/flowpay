#!/bin/bash

echo "🔧 Build MetaMask AA (Smart Account)..."

# Configurações para browser:
# - viem: bundado
# - @metamask/smart-accounts-kit: bundado
pnpm exec esbuild public/assets/js/wallet.metamask-aa.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --tree-shaking=true \
  --legal-comments=none \
  --outfile=public/assets/js/metamask-aa.js \
  --define:global=globalThis

BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo "❌ Build falhou com código $BUILD_STATUS"
  exit $BUILD_STATUS
fi

echo ""
echo "✅ Bundle MetaMask AA gerado: public/assets/js/metamask-aa.js"
echo "📊 Tamanho atual:"
ls -lh public/assets/js/metamask-aa.js

echo ""
echo "🔍 Verificando bare module specifiers residuais..."
node -e "
const fs = require('fs');
const content = fs.readFileSync('public/assets/js/metamask-aa.js', 'utf8');
const matches = content.match(/import\{[^}]+\}from\"(?!\.|\\/|https?:\/\/)([^\"]+)\"/g) || [];
if (matches.length > 0) {
  console.log('⚠️ Bare imports encontrados:');
  matches.forEach(m => console.log(' -', m));
} else {
  console.log('✅ Nenhum bare module specifier encontrado — seguro para o browser!');
}
"
