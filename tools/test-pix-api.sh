#!/bin/bash

# 🚀 FLOWPay - Teste da API PIX via Woovi
# Script para testar a criação de cobranças PIX

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_URL="http://localhost:4321/api/create-charge"
WOOVI_API_KEY="${WOOVI_API_KEY:-}"

echo -e "${BLUE}🧪 FLOWPay - Teste da API PIX${NC}"
echo "=================================="

# Verificar se a API key está configurada
if [ -z "$WOOVI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WOOVI_API_KEY não configurada${NC}"
    echo "Configure a variável de ambiente:"
    echo "export WOOVI_API_KEY='sua_api_key_aqui'"
    echo ""
    echo "Ou execute: source .env (se o arquivo existir)"
    echo ""
fi

# Função para testar criação de cobrança
test_create_pix_charge() {
    local test_name="$1"
    local payload="$2"
    
    echo -e "\n${BLUE}🧪 Teste: $test_name${NC}"
    echo "Payload: $payload"
    echo "URL: $API_URL"
    echo ""
    
    # Fazer requisição
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$API_URL")
    
    # Separar body e status
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")
    
    echo -e "Status HTTP: ${YELLOW}$http_status${NC}"
    echo "Resposta:"
    
    # Formatar JSON se possível
    if command -v jq &> /dev/null; then
        echo "$response_body" | jq '.'
    else
        echo "$response_body"
    fi
    
    echo ""
}

# Teste 1: Cobrança válida
echo -e "${GREEN}✅ Teste 1: Cobrança PIX válida${NC}"
test_create_pix_charge "Cobrança válida" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 50.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_001"
}'

# Teste 2: Valor baixo (teste de validação)
echo -e "${GREEN}✅ Teste 2: Valor baixo${NC}"
test_create_pix_charge "Valor baixo" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 0.50,
    "moeda": "BRL",
    "id_transacao": "test_pix_002"
}'

# Teste 3: Wallet inválido
echo -e "${GREEN}✅ Teste 3: Wallet inválido${NC}"
test_create_pix_charge "Wallet inválido" '{
    "wallet": "invalid_wallet",
    "valor": 25.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_003"
}'

# Teste 4: Campos faltando
echo -e "${GREEN}✅ Teste 4: Campos obrigatórios faltando${NC}"
test_create_pix_charge "Campos faltando" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 100.00
}'

# Teste 5: Valor zero
echo -e "${GREEN}✅ Teste 5: Valor zero${NC}"
test_create_pix_charge "Valor zero" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 0,
    "moeda": "BRL",
    "id_transacao": "test_pix_005"
}'

# Teste 6: Valor negativo
echo -e "${GREEN}✅ Teste 6: Valor negativo${NC}"
test_create_pix_charge "Valor negativo" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": -10.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_006"
}'

echo -e "\n${GREEN}🎉 Testes concluídos!${NC}"
echo ""
echo -e "${BLUE}📋 Resumo dos testes:${NC}"
echo "- Teste 1: Deve retornar 200 e criar cobrança PIX"
echo "- Teste 2: Deve retornar 200 (valor baixo é válido)"
echo "- Teste 3: Deve retornar 400 (wallet inválido)"
echo "- Teste 4: Deve retornar 400 (campos faltando)"
echo "- Teste 5: Deve retornar 400 (valor zero)"
echo "- Teste 6: Deve retornar 400 (valor negativo)"
echo ""
echo -e "${YELLOW}💡 Dicas:${NC}"
echo "- Verifique se o servidor local está rodando: pnpm run dev"
echo "- Configure WOOVI_API_KEY para testes reais"
echo "- Verifique os logs do servidor para detalhes"
echo "- Use 'jq' para formatação JSON: brew install jq"
