// FLOWPay - Testes para Liquidity Provider Service
// Testes unitários para conversão BRL → USDT

const { LiquidityProvider } = require('../../services/crypto/liquidity-provider');

describe('LiquidityProvider', () => {
  let liquidityProvider;

  beforeEach(() => {
    liquidityProvider = new LiquidityProvider();
  });

  describe('Cache de taxas', () => {
    test('deve usar cache quando disponível', async () => {
      // Primeira chamada - deve buscar taxa
      const result1 = await liquidityProvider.getConversionRate(100);
      expect(result1).toHaveProperty('rate');
      expect(result1).toHaveProperty('amountUSDT');

      // Segunda chamada dentro do TTL - deve usar cache
      const result2 = await liquidityProvider.getConversionRate(100);
      expect(result2.rate).toBe(result1.rate);
    });

    test('deve calcular USDT corretamente', () => {
      const rate = 5.50; // BRL/USDT
      const amountBRL = 100;
      const result = liquidityProvider.calculateUSDT(amountBRL, rate);

      expect(result).toHaveProperty('rate', rate);
      expect(result).toHaveProperty('amountUSDT');
      expect(result).toHaveProperty('fees');
      expect(result.fees).toHaveProperty('serviceFee');
      expect(result.fees).toHaveProperty('netAmountBRL');
    });
  });

  describe('Validações', () => {
    test('deve rejeitar valor BRL zero ou negativo', async () => {
      await expect(
        liquidityProvider.getConversionRate(0)
      ).rejects.toThrow('Valor em BRL deve ser maior que zero');

      await expect(
        liquidityProvider.getConversionRate(-10)
      ).rejects.toThrow('Valor em BRL deve ser maior que zero');
    });
  });
});

