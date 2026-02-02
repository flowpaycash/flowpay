# 🚀 FLOWPay - Testes da API PIX

## Visão Geral

Este documento descreve como testar a API PIX da FLOWPay integrada com a Woovi/OpenPix.

## 🛠️ Ferramentas de Teste

### 1. Scripts Bash

- `tools/test-pix-api.sh` - Teste completo com múltiplos cenários
- `tools/quick-pix-test.sh` - Teste rápido e simples

### 2. Script Node.js

- `tools/advanced-pix-test.js` - Teste avançado com validação

### 3. Comandos CURL

- `tools/curl-commands.md` - Comandos curl prontos para uso

## 🚀 Como Executar os Testes

### Pré-requisitos

1. **Servidor rodando**

   ```bash
   netlify dev
   # ou
   npm run dev
   ```

2. **API Key configurada**

   ```bash
   export WOOVI_API_KEY='sua_chave_aqui'
   ```

### Teste Rápido

```bash
# Teste simples
./tools/quick-pix-test.sh

# Teste completo
./tools/test-pix-api.sh

# Teste avançado (Node.js)
node tools/advanced-pix-test.js
```

### Teste Manual via CURL

```bash
# Teste básico
curl -X POST \
  http://localhost:8888/.netlify/functions/create-pix-charge \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "valor": 50.00,
    "moeda": "BRL",
    "id_transacao": "test_pix_001"
  }'
```

## 🧪 Cenários de Teste

### ✅ Testes de Sucesso

1. **Cobrança válida**
   - Wallet Ethereum válido
   - Valor positivo
   - Todos os campos obrigatórios

2. **Valor baixo**
   - Testa validação de valores mínimos
   - Deve aceitar valores como R$ 0,50

### ❌ Testes de Erro

1. **Wallet inválido**
   - Deve retornar 400
   - Mensagem de erro apropriada

2. **Campos faltando**
   - Deve retornar 400
   - Lista campos obrigatórios

3. **Valor zero**
   - Deve retornar 400
   - Validação de valor positivo

4. **Valor negativo**
   - Deve retornar 400
   - Validação de valor positivo

## 📊 Respostas Esperadas

### Sucesso (200)

```json
{
  "success": true,
  "pix_data": {
    "qr_code": "data:image/png;base64,...",
    "br_code": "00020126580014br.gov.bcb.pix...",
    "correlation_id": "test_pix_001",
    "value": 50.00,
    "expires_at": "2024-01-01T12:00:00Z",
    "status": "ACTIVE"
  },
  "wallet": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "moeda": "BRL",
  "id_transacao": "test_pix_001"
}
```

### Erro de Validação (400)

```json
{
  "error": "Wallet deve ser um endereço Ethereum válido"
}
```

### Erro de Servidor (500)

```json
{
  "error": "Configuração da API Woovi não encontrada"
}
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Woovi API
WOOVI_API_KEY=your_api_key_here
WOOVI_API_URL=https://api.woovi.com

# Ambiente
NODE_ENV=development
URL=http://localhost:8888
```

### Arquivo .env

```bash
# Copie o exemplo
cp tools/env-config.example .env

# Edite com suas chaves
nano .env
```

## 🚨 Troubleshooting

### Erro: "Servidor não acessível"

- Verifique se `netlify dev` está rodando
- Confirme a porta (padrão: 8888)
- Verifique logs do servidor

### Erro: "Configuração da API Woovi não encontrada"

- Configure `WOOVI_API_KEY`
- Verifique se a variável está no ambiente
- Reinicie o servidor após configurar

### Erro: "Timeout"

- Aumente o timeout no script
- Verifique conectividade de rede
- Monitore logs do servidor

### Erro: "CORS"

- Verifique configuração CORS na função
- Teste com `curl -X OPTIONS`
- Confirme headers da requisição

## 📈 Testes de Performance

### Múltiplas Requisições

```bash
# Teste com 5 requisições simultâneas
for i in {1..5}; do
  curl -s -X POST \
    http://localhost:8888/.netlify/functions/create-pix-charge \
    -H "Content-Type: application/json" \
    -d "{
      \"wallet\": \"0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6\",
      \"valor\": $((RANDOM % 100 + 1)).$((RANDOM % 99)),
      \"moeda\": \"BRL\",
      \"id_transacao\": \"perf_test_$i\"
    }" | jq '.success // .error'
done
```

### Teste de Carga

```bash
# Usando Apache Bench (se disponível)
ab -n 100 -c 10 -p test-payload.json \
   -T application/json \
   http://localhost:8888/.netlify/functions/create-pix-charge/
```

## 🔍 Debug Avançado

### Logs do Servidor

```bash
# Monitore logs em tempo real
netlify dev --debug

# Ou verifique logs específicos
tail -f .netlify/functions-serve/logs/*
```

### Teste de Conectividade

```bash
# Verificar se a função está acessível
curl -I http://localhost:8888/.netlify/functions/create-pix-charge

# Teste de CORS
curl -X OPTIONS \
  http://localhost:8888/.netlify/functions/create-pix-charge \
  -H "Origin: http://localhost:3000"
```

### Validação de Payload

```bash
# Teste com payload malformado
curl -X POST \
  http://localhost:8888/.netlify/functions/create-pix-charge \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

## 📋 Checklist de Teste

- [ ] Servidor rodando (`netlify dev`)
- [ ] API Key configurada (`WOOVI_API_KEY`)
- [ ] Função acessível (teste OPTIONS)
- [ ] Testes de validação passando
- [ ] Testes de erro funcionando
- [ ] Respostas no formato correto
- [ ] Logs do servidor limpos
- [ ] Performance aceitável

## 🎯 Próximos Passos

1. **Automação**
   - Integrar com CI/CD
   - Testes automatizados
   - Relatórios de cobertura

2. **Monitoramento**
   - Métricas de performance
   - Alertas de erro
   - Logs estruturados

3. **Segurança**
   - Rate limiting
   - Validação de entrada
   - Sanitização de dados

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique este documento
2. Consulte os logs do servidor
3. Teste com scripts fornecidos
4. Verifique configuração de ambiente
