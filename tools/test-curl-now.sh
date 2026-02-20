#!/bin/bash

# 🚀 FLOWPay - Teste CURL Imediato
# Execute este script para testar a API PIX agora!

echo "🧪 Testando API PIX FLOWPay via CURL..."
echo "======================================"

# Verificar se o servidor está rodando
echo "🔍 Verificando se o servidor está rodando..."

if curl -s -I "http://localhost:4321/api/create-charge" > /dev/null 2>&1; then
    echo "✅ Servidor acessível!"
else
    echo "❌ Servidor não acessível!"
    echo "💡 Execute: npm run dev"
    exit 1
fi

echo ""
echo "📡 Fazendo teste da API PIX..."

# Teste básico
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "wallet": "0x1111111111111111111111111111111111111111",
        "valor": 25.50,
        "moeda": "BRL",
        "id_transacao": "test_curl_$(date +%s)"
    }' \
    "http://localhost:4321/api/create-charge")

# Separar status e body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | grep -v "HTTP_STATUS:")

echo ""
echo "📊 Resultado:"
echo "Status HTTP: $http_status"
echo "Resposta:"

# Formatar JSON se possível
if command -v jq &> /dev/null; then
    echo "$response_body" | jq '.'
else
    echo "$response_body"
fi

echo ""
echo "🎯 Interpretação:"
if [ "$http_status" = "200" ]; then
    echo "✅ Sucesso! API PIX funcionando corretamente."
elif [ "$http_status" = "500" ]; then
    echo "❌ Erro interno. Verifique se WOOVI_API_KEY está configurada."
    echo "💡 Configure: export WOOVI_API_KEY='sua_chave_aqui'"
elif [ "$http_status" = "400" ]; then
    echo "⚠️  Erro de validação. Verifique o payload enviado."
else
    echo "❓ Status inesperado: $http_status"
fi

echo ""
echo "🔧 Para mais testes, execute:"
echo "   ./tools/test-pix-api.sh"
echo "   node tools/advanced-pix-test.js"
echo "   ./tools/quick-pix-test.sh"
