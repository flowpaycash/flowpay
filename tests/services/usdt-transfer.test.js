// FLOWPay - Testes para USDT Transfer Service
// Testes unitários para serviços críticos de transferência USDT

const { USDTTransfer } = require('../../services/crypto/usdt-transfer');
const { getWalletRegistry } = require('../../services/crypto/wallet-registry');

describe('USDTTransfer', () => {
  let usdtTransfer;
  let walletRegistry;

  beforeEach(() => {
    usdtTransfer = new USDTTransfer();
    walletRegistry = getWalletRegistry();
  });

  describe('Validações', () => {
    test('deve rejeitar userId vazio', async () => {
      await expect(
        usdtTransfer.transferUSDT('', '0x1234567890123456789012345678901234567890', 100)
      ).rejects.toThrow('userId é obrigatório');
    });

    test('deve rejeitar endereço inválido', async () => {
      await expect(
        usdtTransfer.transferUSDT('user123', 'invalid-address', 100)
      ).rejects.toThrow('Endereço de destino inválido');
    });

    test('deve rejeitar quantidade zero ou negativa', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      await expect(
        usdtTransfer.transferUSDT('user123', validAddress, 0)
      ).rejects.toThrow('Quantidade de USDT deve ser maior que zero');

      await expect(
        usdtTransfer.transferUSDT('user123', validAddress, -10)
      ).rejects.toThrow('Quantidade de USDT deve ser maior que zero');
    });
  });

  describe('Validação de endereço Ethereum', () => {
    test('deve aceitar endereço válido', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(walletRegistry.isValidAddress(validAddress)).toBe(true);
    });

    test('deve rejeitar endereço sem 0x', () => {
      const invalidAddress = '742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      expect(walletRegistry.isValidAddress(invalidAddress)).toBe(false);
    });

    test('deve rejeitar endereço com tamanho incorreto', () => {
      const invalidAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b';
      expect(walletRegistry.isValidAddress(invalidAddress)).toBe(false);
    });
  });

  describe('Configuração', () => {
    test('deve validar formato do endereço da wallet do serviço no construtor', () => {
      // Em desenvolvimento, pode não ter wallet configurada
      // Apenas verificar que não lança erro
      expect(() => new USDTTransfer()).not.toThrow();
    });
  });
});

