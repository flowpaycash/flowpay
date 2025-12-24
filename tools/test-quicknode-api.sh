#!/bin/bash
# 🧪 FLOWPay - Teste QuickNode API

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# API Key (do .env ou argumento)
API_KEY="${1:-${QUICKNODE_API_KEY}}"

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ QUICKNODE_API_KEY não configurada${NC}"
    echo "Uso: $0 [api_key]"
    echo "Ou configure: export QUICKNODE_API_KEY='sua_key'"
    exit 1
fi

echo -e "${GREEN}🧪 Testando QuickNode API...${NC}"
echo ""

# Teste 1: Billing/Invoices
echo -e "${YELLOW}1. Testando Billing/Invoices...${NC}"
response=$(curl -s -X 'GET' \
  'https://api.quicknode.com/v0/billing/invoices' \
  -H 'accept: application/json' \
  -H "x-api-key: $API_KEY")

if echo "$response" | grep -q "error\|unauthorized\|401"; then
    echo -e "${RED}❌ Erro na autenticação${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    exit 1
else
    echo -e "${GREEN}✅ API Key válida!${NC}"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

echo ""
echo -e "${GREEN}✅ Teste concluído!${NC}"
