#!/bin/bash

echo "🔧 Build Web3Auth ULTRA-MINIMAL..."

# Configurações AGGRESSIVAS para máxima redução
pnpm exec esbuild public/assets/js/web3auth.minimal.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --tree-shaking=true \
  --metafile=public/assets/js/web3auth.minimal.meta.json \
  --analyze \
  --outfile=public/assets/js/web3auth.minimal.js

echo "✅ Bundle minimal gerado: public/assets/js/web3auth.minimal.js"
echo "📊 Tamanho atual:"
ls -lh public/assets/js/web3auth.minimal.js

echo ""
echo "🔍 Comparação de tamanhos:"
echo "Original: $(ls -lh public/assets/js/web3auth.js | awk '{print $5}')"
echo "Minimal:  $(ls -lh public/assets/js/web3auth.minimal.js | awk '{print $5}')"

echo ""
echo "🚀 Para usar a versão minimal, atualize checkout.html:"
echo "   <script src=\"/assets/neo.config.js\"></script>"
echo "   <script type=\"module\" src=\"/assets/js/web3auth.minimal.js\"></script>"
