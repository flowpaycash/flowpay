# FLOWPay - Tratamento de Erros

## Visão Geral

O sistema de tratamento de erros do FLOWPay foi projetado para:

- Retornar mensagens amigáveis ao usuário
- Fornecer detalhes técnicos para debug (em desenvolvimento)
- Categorizar erros por tipo
- Facilitar troubleshooting

## Tipos de Erro

### EXTERNAL_API_ERROR

Erro ao comunicar com APIs externas (Woovi, QuickNode, etc).

**Mensagens amigáveis:**
- 401: "Erro de autenticação na API. Verifique suas credenciais."
- 403: "Acesso negado pela API. Verifique suas permissões."
- 404: "Endpoint não encontrado na API."
- 429: "Muitas requisições. Tente novamente em alguns instantes."
- 500+: "Serviço temporariamente indisponível. Tente novamente em alguns instantes."

**Exemplo de resposta:**
```json
{
  "success": false,
  "error": "Erro de autenticação na API. Verifique suas credenciais.",
  "errorType": "EXTERNAL_API_ERROR",
  "details": {
    "service": "Woovi",
    "statusCode": 401,
    "apiError": {
      "message": "appID inválido"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### VALIDATION_ERROR

Erro de validação de dados de entrada.

**Mensagem:** Mensagem específica do campo inválido.

**Exemplo:**
```json
{
  "success": false,
  "error": "wallet deve ser um endereço Ethereum válido",
  "errorType": "VALIDATION_ERROR",
  "details": {
    "field": "wallet",
    "value": "invalid_wallet"
  }
}
```

### AUTHENTICATION_ERROR

Erro de autenticação.

**Mensagem:** "Erro de autenticação. Verifique suas credenciais."

### RATE_LIMIT_ERROR

Muitas requisições em pouco tempo.

**Mensagem:** "Muitas requisições. Aguarde alguns instantes e tente novamente."

## Frontend - Tratamento de Erros

### Exemplo de Uso

```javascript
try {
  const response = await fetch('/.netlify/functions/create-pix-charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    // Exibir mensagem amigável
    showError(data.error || 'Erro ao processar requisição');
    return;
  }

  // Sucesso
  handleSuccess(data);
} catch (error) {
  console.error('Erro:', error);
  showError('Erro de conexão. Verifique sua internet e tente novamente.');
}
```

## Debugging

### Em Desenvolvimento

Em `NODE_ENV=development`, a resposta inclui `details` com informações técnicas:

```json
{
  "success": false,
  "error": "Erro de autenticação na API...",
  "errorType": "EXTERNAL_API_ERROR",
  "details": {
    "service": "Woovi",
    "statusCode": 401,
    "response": "...",
    "apiError": { ... }
  }
}
```

### Em Produção

Em produção, apenas a mensagem amigável é retornada:

```json
{
  "success": false,
  "error": "Erro de autenticação na API. Verifique suas credenciais.",
  "errorType": "EXTERNAL_API_ERROR",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Checklist de Troubleshooting

Quando receber `EXTERNAL_API_ERROR`:

1. **Verificar Network Tab**
   - Status code da requisição
   - Response body completo
   - Headers da resposta

2. **Verificar Logs do Servidor**
   - Mensagem de erro completa
   - Stack trace (se disponível)
   - Detalhes da API externa

3. **Verificar Configuração**
   - API keys configuradas?
   - URLs corretas?
   - Permissões adequadas?

4. **Verificar Dados Enviados**
   - Formato correto?
   - Campos obrigatórios presentes?
   - Valores válidos?

## Melhorias Implementadas

✅ Mensagens amigáveis baseadas no status code
✅ Extração de mensagens específicas da API Woovi
✅ Logs detalhados para debug
✅ Tratamento diferenciado dev/prod
✅ Frontend com tratamento robusto

---

*Sistema de erros: mensagens claras para usuários, detalhes técnicos para desenvolvedores.*
