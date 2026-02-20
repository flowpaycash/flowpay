# Núcleo Cripto - Implementação Completa

## Arquivos Criados

### 1. `wallet-registry.js` ✅

- Gerencia registro de wallets de usuários
- Valida endereços blockchain
- Suporta múltiplas redes (Ethereum, Polygon, BSC)
- Armazena em memória (pronto para migrar para banco)

### 2. `liquidity-provider.js` ✅

- Converte BRL → USDT
- Obtém taxas de conversão
- Suporta múltiplos provedores (primary + fallback)
- Cache de taxas (TTL: 5 minutos)
- Calcula taxas e spreads

### 3. `usdt-transfer.js` ✅

- Transfere USDT para wallets cadastradas
- Valida wallets antes de transferir
- Suporta múltiplas redes
- Modo desenvolvimento (simulado) e produção (real)

### 4. `crypto-processor.js` (Railway Function) ✅

- Orquestra fluxo completo
- Endpoint: `/api/crypto/processor`
- Método: POST
- Integra todos os serviços

## Fluxo Implementado

```
1. Recebe instrução de valor (BRL)
   ↓
2. Wallet Registry: Valida/Registra wallet
   ↓
3. Liquidity Provider: Converte BRL → USDT
   ↓
4. USDT Transfer: Envia USDT para wallet
   ↓
5. Retorna resultado completo
```

## Próximos Passos

### Webhook Handler

O arquivo `src/pages/api/webhook.js` precisa ser atualizado para usar os novos serviços.

Substituir as linhas 94-100 por:

```javascript
// Processar conversão PIX → USDT automaticamente
try {
  const { getLiquidityProvider } = require('../../services/crypto/liquidity-provider');
  const { getUSDTTransfer } = require('../../services/crypto/usdt-transfer');
  const { getWalletRegistry } = require('../../services/crypto/wallet-registry');
  
  const userId = charge.additionalInfo?.find(info => info.key === 'userId')?.value || 
                charge.customer?.name || 
                `user_${charge.correlationID}`;
  
  const amountBRL = parseFloat(charge.value) / 100;
  const network = charge.additionalInfo?.find(info => info.key === 'network')?.value || 'ethereum';
  
  // 1. Registrar/validar wallet
  const walletRegistry = getWalletRegistry();
  let registeredWallet = walletRegistry.getWalletByAddress(wallet);
  
  if (!registeredWallet) {
    const registerResult = await walletRegistry.registerWallet(
      userId, wallet, network, { label: 'Wallet PIX', verified: false }
    );
    registeredWallet = registerResult.wallet;
  }
  
  // 2. Converter BRL → USDT
  const liquidityProvider = getLiquidityProvider();
  const conversionResult = await liquidityProvider.convertFiatToUSDT(
    amountBRL, userId, charge.correlationID
  );
  
  // 3. Transferir USDT
  const usdtTransfer = getUSDTTransfer();
  const transferResult = await usdtTransfer.transferUSDT(
    userId, wallet, conversionResult.to.amount, network, charge.correlationID
  );
  
  console.log('✅ Conversão PIX → USDT concluída', {
    conversionId: conversionResult.conversionId,
    txHash: transferResult.transaction.hash,
    amountUSDT: conversionResult.to.amount
  });
  
} catch (cryptoError) {
  console.error('❌ Erro ao processar conversão cripto:', cryptoError);
}
```

## Variáveis de Ambiente Necessárias

Adicionar ao `.env.example`:

```bash
# Liquidity Provider
LIQUIDITY_PROVIDER_NAME=default
LIQUIDITY_PROVIDER_URL=https://api.provider.com
LIQUIDITY_PROVIDER_API_KEY=your_key
LIQUIDITY_PROVIDER_TYPE=otc
CONVERSION_FEE_PERCENT=0.5

# USDT Transfer
SERVICE_WALLET_ADDRESS=0x...
SERVICE_WALLET_PRIVATE_KEY=0x...
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
```

## Status

- [x] Estrutura criada
- [x] Wallet Registry implementado
- [x] Liquidity Provider implementado
- [x] USDT Transfer implementado
- [x] Crypto Processor (Railway Function) criado
- [ ] Webhook Handler atualizado (pendente)
- [ ] Variáveis de ambiente configuradas (pendente)
- [ ] Testes unitários (pendente)
