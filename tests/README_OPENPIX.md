# FLOWPay - Testes OpenPix/Woovi

## Visão Geral

Suíte completa de testes para integração com OpenPix/Woovi API, cobrindo:

- Criação de cobranças PIX
- Processamento de webhooks
- Validações de segurança
- Fluxo end-to-end

## Executar Testes

### Testes Unitários (Jest)

```bash
# Todos os testes OpenPix
npm run test:openpix

# Modo watch
npm run test:openpix:watch

# Com cobertura
npm run test:coverage
```

### Testes de Integração (Bash)

```bash
# Teste completo de integração
./tools/test-openpix-integration.sh

# Ou com variáveis customizadas
API_URL=http://localhost:8888/.netlify/functions \
WOOVI_API_KEY=your_key \
WOOVI_WEBHOOK_SECRET=your_secret \
./tools/test-openpix-integration.sh
```

## Estrutura dos Testes

### Testes Jest (`tests/openpix.test.js`)

#### Create PIX Charge

- ✅ Criar cobrança PIX válida
- ✅ Validar wallet Ethereum
- ✅ Validar valor positivo
- ✅ Validar campos obrigatórios
- ✅ Converter valor para centavos
- ✅ Incluir additionalInfo

#### Webhook Handler

- ✅ Processar webhook válido
- ✅ Rejeitar webhook sem assinatura
- ✅ Rejeitar webhook com assinatura inválida
- ✅ Extrair informações do charge
- ✅ Criar ordem de liquidação assistida

#### End-to-End Flow

- ✅ Criar cobrança e processar webhook

#### Error Handling

- ✅ Tratar erro da API Woovi
- ✅ Tratar API key não configurada

### Testes de Integração (`tools/test-openpix-integration.sh`)

1. **Criar cobrança PIX válida**
   - Wallet Ethereum válido
   - Valor positivo
   - Todos os campos obrigatórios

2. **Cobrança com valor baixo**
   - Testa validação de valores mínimos

3. **Wallet inválido**
   - Deve retornar 400
   - Mensagem de erro apropriada

4. **Webhook de confirmação**
   - Assinatura HMAC válida
   - Processa confirmação de pagamento
   - Cria ordem de liquidação

5. **Webhook sem assinatura**
   - Deve retornar 401
   - Validação de segurança

6. **Webhook com assinatura inválida**
   - Deve retornar 401
   - Validação de segurança

## Configuração

### Variáveis de Ambiente

```bash
# API Woovi
WOOVI_API_KEY=your_api_key_here
WOOVI_API_URL=https://api.woovi.com

# Webhook Secret
WOOVI_WEBHOOK_SECRET=your_webhook_secret_here

# URL da API (para testes de integração)
API_URL=http://localhost:8888/.netlify/functions
```

### Pré-requisitos

1. **Servidor rodando**

   ```bash
   netlify dev
   ```

2. **Dependências instaladas**

   ```bash
   npm install
   ```

3. **Ferramentas opcionais**

   ```bash
   # jq para formatação JSON
   brew install jq

   # openssl para cálculo HMAC
   # Já incluído no macOS/Linux
   ```

## Exemplos de Uso

### Teste Manual via cURL

```bash
# Criar cobrança
curl -X POST \
  http://localhost:8888/.netlify/functions/create-pix-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "valor": 50.00,
    "moeda": "BRL",
    "id_transacao": "test_manual_001"
  }'

# Webhook de confirmação
curl -X POST \
  http://localhost:8888/.netlify/functions/webhook-handler \
  -H "Content-Type: application/json" \
  -H "x-woovi-signature: $(echo -n '{"event":"charge.paid","data":{...}}' | openssl dgst -sha256 -hmac 'your_secret' | cut -d' ' -f2)" \
  -d '{
    "event": "charge.paid",
    "data": {
      "correlationID": "test_manual_001",
      "value": 5000,
      "status": "CONFIRMED",
      "paidAt": "2024-01-01T12:00:00.000Z",
      "additionalInfo": [
        {"key": "wallet", "value": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"},
        {"key": "moeda", "value": "USDT"},
        {"key": "chainId", "value": "137"}
      ]
    }
  }'
```

## Respostas Esperadas

### Sucesso (200)

```json
{
  "success": true,
  "pix_data": {
    "qr_code": "data:image/png;base64,...",
    "br_code": "000201010212...",
    "correlation_id": "test_pix_001",
    "value": 50.00,
    "expires_at": "2024-01-01T13:00:00.000Z",
    "status": "ACTIVE"
  },
  "wallet": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "moeda": "BRL",
  "id_transacao": "test_pix_001"
}
```

### Erro (400)

```json
{
  "error": "Mensagem de erro descritiva",
  "details": {}
}
```

## Troubleshooting

### Erro: "Servidor não está rodando"

```bash
# Iniciar servidor
netlify dev
```

### Erro: "WOOVI_API_KEY não configurada"

```bash
# Configurar variável de ambiente
export WOOVI_API_KEY='your_key_here'

# Ou criar arquivo .env
echo "WOOVI_API_KEY=your_key_here" > .env
```

### Erro: "Assinatura inválida"

- Verifique se `WOOVI_WEBHOOK_SECRET` está configurado corretamente
- Certifique-se de que a assinatura está sendo calculada com o mesmo secret

## Próximos Passos

- [ ] Testes de performance
- [ ] Testes de carga
- [ ] Testes de integração com liquidação assistida
- [ ] Testes de integração com QuickNode

---

*Testes completos para garantir qualidade da integração OpenPix/Woovi.*

