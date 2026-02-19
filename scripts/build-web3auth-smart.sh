#!/bin/bash

echo "🔧 Build Web3Auth SMART (otimizado agressivamente)..."

# Configurações ULTRA-agressivas para máxima redução
npx esbuild public/assets/js/web3auth.smart.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --tree-shaking=true \
  --legal-comments=none \
  --outfile=public/assets/js/web3auth.smart.js \
  --external:viem \
  --external:buffer \
  --external:react-i18next \
  --external:@segment/analytics-next \
  --external:@sentry/core

echo "✅ Bundle smart gerado: public/assets/js/web3auth.smart.js"
echo "📊 Tamanho atual:"
ls -lh public/assets/js/web3auth.smart.js

echo ""
echo "🔍 Comparação de tamanhos:"
echo "Original:  $(ls -lh public/assets/js/web3auth.js | awk '{print $5}')"
echo "Minimal:   $(ls -lh public/assets/js/web3auth.minimal.js | awk '{print $5}')"
echo "Smart:     $(ls -lh public/assets/js/web3auth.smart.js | awk '{print $5}')"

echo ""
echo "🚀 Para usar a versão smart, atualize checkout.html:"
echo "   <script src=\"/assets/neo.config.js\"></script>"
echo "   <script type=\"module\" src=\"/assets/js/web3auth.smart.js\"></script>"
echo ""
echo "💡 Dica: Esta versão exclui React e outras dependências pesadas"
