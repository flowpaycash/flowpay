#!/bin/bash
# FLOWPay - Teste Completo de Integração OpenPix/Woovi
# Testa criação de cobrança, webhook e fluxo completo

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
API_URL="${API_URL:-http://localhost:4321/api}"
WOOVI_API_KEY="${WOOVI_API_KEY:-}"
WOOVI_WEBHOOK_SECRET="${WOOVI_WEBHOOK_SECRET:-test_secret}"

echo -e "${BLUE}🧪 FLOWPay - Teste Completo OpenPix/Woovi${NC}"
echo "=========================================="
echo ""

# Verificar se servidor está rodando
if ! curl -s "${API_URL}/create-charge" > /dev/null 2>&1; then
    echo -e "${RED}❌ Servidor não está rodando${NC}"
    echo "Execute: pnpm run dev"
    exit 1
fi

# Verificar API key
if [ -z "$WOOVI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WOOVI_API_KEY não configurada${NC}"
    echo "Testes usarão mock (se disponível)"
    echo ""
fi

# Função para testar criação de cobrança
test_create_charge() {
    local test_id="$1"
    local payload="$2"
    local expected_status="${3:-200}"

    echo -e "${BLUE}📝 Teste: Criar cobrança PIX - $test_id${NC}"

    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "${API_URL}/create-charge")

    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")

    if [ "$http_status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ Status HTTP: $http_status (esperado: $expected_status)${NC}"
    else
        echo -e "${RED}❌ Status HTTP: $http_status (esperado: $expected_status)${NC}"
    fi

    if command -v jq &> /dev/null; then
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        echo "$response_body"
    fi

    echo ""
    echo "$response_body"
}

# Função para testar webhook
test_webhook() {
    local test_id="$1"
    local payload="$2"
    local signature="$3"

    echo -e "${BLUE}📨 Teste: Webhook - $test_id${NC}"

    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-woovi-signature: $signature" \
        -d "$payload" \
        "${API_URL}/webhook")

    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")

    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✅ Webhook processado com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao processar webhook: $http_status${NC}"
    fi

    if command -v jq &> /dev/null; then
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        echo "$response_body"
    fi

    echo ""
}

# Função para calcular HMAC
calculate_hmac() {
    local secret="$1"
    local payload="$2"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64
}

# Teste 1: Criar cobrança válida
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 1: Criar Cobrança PIX Válida${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

test_create_charge "Cobrança válida" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 50.00,
    "moeda": "BRL",
    "id_transacao": "test_openpix_001"
}' 200

# Teste 2: Cobrança com valor baixo
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 2: Cobrança com Valor Baixo${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

test_create_charge "Valor baixo" '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 0.50,
    "moeda": "BRL",
    "id_transacao": "test_openpix_002"
}' 200

# Teste 3: Wallet inválido
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 3: Wallet Inválido${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

test_create_charge "Wallet inválido" '{
    "wallet": "invalid_wallet",
    "valor": 25.00,
    "moeda": "BRL",
    "id_transacao": "test_openpix_003"
}' 400

# Teste 4: Webhook de confirmação
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 4: Webhook de Confirmação${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

webhook_payload='{
    "event": "charge.paid",
    "data": {
        "charge": {
            "correlationID": "test_openpix_001",
            "value": 5000,
            "status": "CONFIRMED",
            "paidAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "additionalInfo": [
                {"key": "wallet", "value": "0x1111111111111111111111111111111111111111"},
                {"key": "moeda", "value": "USDT"},
                {"key": "chainId", "value": "137"}
            ]
        }
    }
}'

signature=$(calculate_hmac "$WOOVI_WEBHOOK_SECRET" "$webhook_payload")
test_webhook "Confirmação de pagamento" "$webhook_payload" "$signature"

# Teste 5: Webhook sem assinatura (deve falhar)
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 5: Webhook Sem Assinatura${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

test_webhook "Webhook sem assinatura" "$webhook_payload" ""

# Teste 6: Webhook com assinatura inválida (deve falhar)
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}TESTE 6: Webhook com Assinatura Inválida${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

test_webhook "Assinatura inválida" "$webhook_payload" "invalid_signature"

# Resumo
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMO DOS TESTES${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "✅ Testes executados:"
echo "  1. Criar cobrança PIX válida"
echo "  2. Cobrança com valor baixo"
echo "  3. Wallet inválido (validação)"
echo "  4. Webhook de confirmação"
echo "  5. Webhook sem assinatura (segurança)"
echo "  6. Webhook com assinatura inválida (segurança)"
echo ""
echo -e "${YELLOW}💡 Dicas:${NC}"
echo "- Configure WOOVI_API_KEY para testes reais"
echo "- Configure WOOVI_WEBHOOK_SECRET para testes de webhook"
echo "- Verifique os logs do servidor para detalhes"
echo "- Use 'jq' para formatação JSON: brew install jq"
echo ""
echo -e "${GREEN}🎉 Testes concluídos!${NC}"
