#!/bin/bash

# 🚀 FLOWPay - Teste Rápido da API PIX
# Teste simples para verificar se a API está funcionando

echo "🧪 Teste Rápido da API PIX FLOWPay"
echo "=================================="

# URL da API (ajuste se necessário)
API_URL="http://localhost:4321/api/create-charge"

# Payload de teste
PAYLOAD='{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 25.50,
    "moeda": "BRL",
    "id_transacao": "test_curl_001"
}'

echo "📡 Testando API em: $API_URL"
echo "📦 Payload: $PAYLOAD"
echo ""

# Teste via curl
echo "🔄 Fazendo requisição..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$API_URL")

# Separar status e body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | grep -v "HTTP_STATUS:")

echo ""
echo "📊 Resultado:"
echo "Status HTTP: $http_status"
echo "Resposta:"
echo "$response_body"

echo ""
echo "✅ Teste concluído!"
echo ""
echo "💡 Se o status for 500, verifique:"
echo "   - Se o servidor está rodando (npm run dev)"
echo "   - Se WOOVI_API_KEY está configurada"
echo "   - Logs do servidor para detalhes"
