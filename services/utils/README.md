# FLOWPay - Utilitários

Utilitários compartilhados para serviços do FLOWPay.

## Arquivos

### `api-rate-limiter.js`

Rate limiting para chamadas de APIs externas.

**Uso:**

```javascript
const { getAPIRateLimiter } = require('./utils/api-rate-limiter');

const rateLimiter = getAPIRateLimiter();

// Verificar limite antes de fazer chamada
const check = rateLimiter.checkLimit('quicknode', 'ipfs-upload');
if (!check.allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${check.retryAfter}s`);
}

// Ou usar wrapper automático
const result = await rateLimiter.withRateLimit(
  'quicknode',
  'ipfs-upload',
  async () => {
    return await fetch(url, options);
  }
);
```

**Serviços configurados:**

- `quicknode`: 100 requests/minuto
- `liquidityProvider`: 10 requests/minuto
- `default`: 30 requests/minuto

