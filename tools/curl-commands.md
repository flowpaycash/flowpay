# 🚀 FLOWPay - Comandos CURL para Teste da API PIX

## Pré-requisitos

1. **Servidor rodando**: `pnpm run dev` ou `pnpm run dev`
2. **API Key configurada**: `export WOOVI_API_KEY='sua_chave_aqui'`

## 🧪 Teste Básico

### 1. Cobrança PIX Válida

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 50.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_001"
  }'
```

### 2. Valor Baixo (Teste de Validação)

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 0.50,
    "moeda": "BRL",
    "id_transacao": "test_pix_002"
  }'
```

### 3. Teste de Erro - Wallet Inválido

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "invalid_wallet",
    "valor": 25.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_003"
  }'
```

### 4. Teste de Erro - Campos Faltando

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 100.00
  }'
```

### 5. Teste de Erro - Valor Zero

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x1111111111111111111111111111111111111111",
    "valor": 0,
    "moeda": "BRL",
    "id_transacao": "test_pix_005"
  }'
```

### 6. Teste de Erro - Valor Negativo

```bash
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x7420d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "valor": -10.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_006"
  }'
```

## 🔧 Teste com Variáveis

### Usando variáveis de ambiente

```bash
# Configure a API key
export WOOVI_API_KEY="sua_chave_aqui"

# Teste com valor variável
VALOR=75.50
curl -X POST \
  http://localhost:4321/api/create-charge \
  -H "Content-Type: application/json" \
  -d "{
    \"wallet\": \"0x1111111111111111111111111111111111111111\",
    \"valor\": $VALOR,
    \"moeda\": \"BRL\",
    \"id_transacao\": \"test_pix_$(date +%s)\"
  }"
```

## 📊 Teste de Performance

### Múltiplas requisições

```bash
# Teste com 5 requisições simultâneas
for i in {1..5}; do
  echo "Teste $i:"
  curl -s -X POST \
    http://localhost:4321/api/create-charge \
    -H "Content-Type: application/json" \
    -d "{
      \"wallet\": \"0x1111111111111111111111111111111111111111\",
      \"valor\": $((RANDOM % 100 + 1)).$((RANDOM % 99)),
      \"moeda\": \"BRL\",
      \"id_transacao\": \"perf_test_$i\"
    }" | jq '.success // .error'
  echo ""
done
```

## 🚨 Respostas Esperadas

### ✅ Sucesso (200)

```json
{
  "success": true,
  "pix_data": {
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "br_code": "00020126580014br.gov.bcb.pix0136...",
    "correlation_id": "test_pix_001",
    "value": 50.00,
    "expires_at": "2024-01-01T12:00:00Z",
    "status": "ACTIVE"
  },
  "wallet": "0x1111111111111111111111111111111111111111",
  "moeda": "BRL",
  "id_transacao": "test_pix_001"
}
```

### ❌ Erro de Validação (400)

```json
{
  "error": "Wallet deve ser um endereço Ethereum válido"
}
```

### ❌ Erro de Servidor (500)

```json
{
  "error": "Configuração da API Woovi não encontrada"
}
```

## 💡 Dicas de Uso

1. **Verifique o servidor**: Certifique-se de que `pnpm run dev` está rodando
2. **Configure a API key**: `export WOOVI_API_KEY='sua_chave'`
3. **Monitore os logs**: Veja os logs do servidor para detalhes
4. **Use jq para formatação**: `brew install jq` para macOS
5. **Teste incremental**: Comece com testes simples e evolua

## 🔍 Debug

### Verificar se a função está acessível

```bash
curl -I http://localhost:4321/api/create-charge
```

### Teste de CORS (preflight)

```bash
curl -X OPTIONS \
  http://localhost:4321/api/create-charge \
  -H "Origin: http://localhost:3000"
```

### Verificar variáveis de ambiente

```bash
echo "WOOVI_API_KEY: $WOOVI_API_KEY"
echo "NODE_ENV: $NODE_ENV"
```
