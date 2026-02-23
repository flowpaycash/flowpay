# FLOWPay - Testes de Serviços

Testes unitários para serviços críticos do FLOWPay.

## Estrutura

```
tests/services/
├── usdt-transfer.test.js      # Testes de transferência USDT
├── liquidity-provider.test.js # Testes de conversão BRL → USDT
└── README.md                  # Esta documentação
```

## Executar Testes

```bash
# Todos os testes
pnpm test

# Testes específicos
pnpm test -- usdt-transfer.test.js
pnpm test -- liquidity-provider.test.js
```

## Cobertura

### Serviços Críticos (Prioridade Alta)

- [x] `usdt-transfer.js` - Validações básicas
- [x] `liquidity-provider.js` - Cache e cálculos
- [ ] `write-proof.js` - Escrita de provas
- [ ] `wallet-registry.js` - Registro de wallets
- [ ] `quicknode-rest.js` - Chamadas de API

### Próximos Passos

1. Adicionar testes de integração
2. Adicionar mocks para APIs externas
3. Configurar cobertura de código (Jest/Istanbul)
4. Adicionar testes de performance

