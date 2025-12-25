#!/bin/bash
# FLOWPay - Verificador de Variáveis de Ambiente

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 FLOWPay - Verificação de Variáveis de Ambiente${NC}"
echo "=============================================="
echo ""

# Carregar .env se existir
if [ -f .env ]; then
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
    source .env
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
    echo "Usando variáveis do ambiente atual"
    echo ""
fi

# Lista de variáveis obrigatórias
REQUIRED_VARS=(
    "WOOVI_API_KEY"
)

# Lista de variáveis opcionais importantes
OPTIONAL_VARS=(
    "WOOVI_WEBHOOK_SECRET"
    "WOOVI_API_URL"
    "QUICKNODE_BASE_RPC"
    "QUICKNODE_POLYGON_RPC"
    "QUICKNODE_BSC_RPC"
    "SERVICE_WALLET_ADDRESS"
    "SERVICE_WALLET_PRIVATE_KEY"
    "BLOCKCHAIN_WRITER_ADDRESS"
    "BLOCKCHAIN_WRITER_PRIVATE_KEY"
    "USDT_SETTLEMENT_NETWORK"
)

echo -e "${BLUE}📋 Variáveis Obrigatórias:${NC}"
echo ""

missing=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var${NC} - NÃO CONFIGURADA"
        missing=$((missing + 1))
    else
        value="${!var}"
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PRIVATE"* ]]; then
            echo -e "${GREEN}✅ $var${NC} - ${value:0:10}...${value: -4}"
        else
            echo -e "${GREEN}✅ $var${NC} - $value"
        fi
    fi
done

echo ""
echo -e "${BLUE}📋 Variáveis Opcionais (Importantes):${NC}"
echo ""

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠️  $var${NC} - Não configurada"
    else
        value="${!var}"
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PRIVATE"* ]]; then
            echo -e "${GREEN}✅ $var${NC} - ${value:0:10}...${value: -4}"
        else
            echo -e "${GREEN}✅ $var${NC} - $value"
        fi
    fi
done

echo ""
if [ $missing -gt 0 ]; then
    echo -e "${RED}❌ $missing variável(is) obrigatória(s) não configurada(s)${NC}"
    echo ""
    echo "Configure as variáveis faltantes no arquivo .env"
    exit 1
else
    echo -e "${GREEN}✅ Todas as variáveis obrigatórias estão configuradas${NC}"
fi

echo ""
echo -e "${BLUE}💡 Dica:${NC}"
echo "Copie .env.example para .env e preencha os valores:"
echo "  cp .env.example .env"
echo ""
