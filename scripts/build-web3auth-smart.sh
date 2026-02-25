#!/bin/bash

echo "🔧 Build Web3Auth SMART (otimizado agressivamente)..."

# Criar stubs para dependências opcionais que não devem ser carregadas no browser
STUB_DIR="$(dirname "$0")/stubs"
mkdir -p "$STUB_DIR"

# Stub vazio para dependências opcionais (@sentry/core, @segment/analytics-next)
cat > "$STUB_DIR/empty-module.js" << 'EOF'
// Empty stub - optional dependency replaced at build time (not needed in browser)
export default {};
export const init = () => {};
export const captureException = () => {};
export const captureMessage = () => {};
export const configureScope = () => {};
export const withScope = (fn) => fn && fn({});
export const setUser = () => {};
export const setTag = () => {};
export const setExtra = () => {};
export const addBreadcrumb = () => {};
EOF

echo "📦 Stubs criados em $STUB_DIR"

# Caminho absoluto do stub para o alias do esbuild
STUB_PATH="$STUB_DIR/empty-module.js"

# Configurações SMART para browser:
# - react-i18next: bundado (necessário para o modal do Web3Auth)
# - @sentry/core: substituído por stub vazio (dependência opcional)
# - @segment/analytics-next: substituído por stub vazio (analytics, não crítico)
# - viem: bundado (necessário para operações blockchain)
# - buffer: bundado (polyfill necessário)
pnpm exec esbuild public/assets/js/web3auth.smart.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --tree-shaking=true \
  --legal-comments=none \
  --outfile=public/assets/js/web3auth.smart.js \
  --alias:@sentry/core="$STUB_PATH" \
  --alias:@sentry/types="$STUB_PATH" \
  --alias:@segment/analytics-next="$STUB_PATH"

BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo "❌ Build falhou com código $BUILD_STATUS"
  exit $BUILD_STATUS
fi

echo ""
echo "✅ Bundle smart gerado: public/assets/js/web3auth.smart.js"
echo "📊 Tamanho atual:"
ls -lh public/assets/js/web3auth.smart.js

echo ""
echo "🔍 Verificando bare module specifiers residuais (devem ser zero)..."
BARE=$(node -e "
const fs = require('fs');
const content = fs.readFileSync('public/assets/js/web3auth.smart.js', 'utf8');
const matches = content.match(/import\{[^}]+\}from\"(?!\.|\\/|https?:\/\/)([^\"]+)\"/g) || [];
if (matches.length > 0) {
  console.log('⚠️  Bare imports encontrados:');
  matches.forEach(m => console.log(' -', m));
  process.exit(1);
} else {
  console.log('✅ Nenhum bare module specifier encontrado — seguro para o browser!');
}
")
echo "$BARE"

echo ""
echo "🚀 Para usar a versão smart, os layouts já apontam para:"
echo "   <script is:inline src=\"/api/neo-config\"></script>"
echo "   <script is:inline type=\"module\" src=\"/assets/js/web3auth.smart.js\"></script>"
echo ""
echo "💡 Dependências bundadas: react-i18next, viem, buffer"
echo "💡 Stubs aplicados: @sentry/core, @sentry/types, @segment/analytics-next"
