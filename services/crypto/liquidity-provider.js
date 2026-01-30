// FLOWPay - Liquidity Provider Service
// Liquidação programável: Fiat (BRL) → USDT via parceiros/OTC/exchanges
// Suporta estratégias: auto, manual, deferred

const { secureLog, logAPIError } = require('../../netlify/functions/config');

class LiquidityProvider {
  constructor() {
    // Configurações de provedores de liquidez
    this.providers = {
      // Provedor principal (configurar via env)
      primary: {
        name: process.env.LIQUIDITY_PROVIDER_NAME || 'default',
        apiUrl: process.env.LIQUIDITY_PROVIDER_URL || '',
        apiKey: process.env.LIQUIDITY_PROVIDER_API_KEY || '',
        type: process.env.LIQUIDITY_PROVIDER_TYPE || 'otc' // otc, exchange, aggregator
      },
      // Provedor secundário (fallback)
      fallback: {
        name: process.env.LIQUIDITY_PROVIDER_FALLBACK_NAME || '',
        apiUrl: process.env.LIQUIDITY_PROVIDER_FALLBACK_URL || '',
        apiKey: process.env.LIQUIDITY_PROVIDER_FALLBACK_API_KEY || '',
        type: process.env.LIQUIDITY_PROVIDER_FALLBACK_TYPE || 'otc'
      }
    };

    // Cache de taxas com estratégia stale-while-revalidate
    // TTL principal: 5 minutos, stale permitido: até 10 minutos
    this.rateCache = {
      data: null,
      expiresAt: null,
      staleAt: null,
      ttl: 5 * 60 * 1000, // 5 minutos (cache válido)
      staleTtl: 10 * 60 * 1000, // 10 minutos (pode usar stale)
      refreshPromise: null // Promise de refresh em andamento
    };
  }

  /**
   * Obtém taxa de conversão BRL → USDT
   * Usa estratégia stale-while-revalidate para melhor performance
   * @param {number} amountBRL - Valor em BRL
   * @returns {Promise<object>} Taxa de conversão e valor em USDT
   * @returns {object} Objeto com { rate: number, amountUSDT: number, fees: object }
   */
  async getConversionRate(amountBRL) {
    try {
      if (!amountBRL || amountBRL <= 0) {
        throw new Error('Valor em BRL deve ser maior que zero');
      }

      const now = Date.now();

      // Cache válido: retornar imediatamente
      if (this.rateCache.data && this.rateCache.expiresAt > now) {
        secureLog('info', 'Taxa de conversão obtida do cache (fresco)', {
          amountBRL,
          rate: this.rateCache.data.rate
        });
        return this.calculateUSDT(amountBRL, this.rateCache.data.rate);
      }

      // Cache stale mas ainda válido: retornar e atualizar em background
      if (this.rateCache.data && this.rateCache.staleAt > now) {
        secureLog('info', 'Taxa de conversão obtida do cache (stale, atualizando em background)', {
          amountBRL,
          rate: this.rateCache.data.rate
        });

        // Atualizar em background (não bloquear resposta)
        this.refreshCacheInBackground();

        return this.calculateUSDT(amountBRL, this.rateCache.data.rate);
      }

      // Cache expirado ou inexistente: buscar nova taxa
      const rate = await this.fetchConversionRate();

      // Atualizar cache
      this.updateCache(rate);

      return this.calculateUSDT(amountBRL, rate);

    } catch (error) {
      // Em caso de erro, tentar usar cache stale se disponível
      if (this.rateCache.data && this.rateCache.staleAt > Date.now()) {
        secureLog('warn', 'Erro ao buscar taxa, usando cache stale', {
          error: error.message,
          rate: this.rateCache.data.rate
        });
        return this.calculateUSDT(amountBRL, this.rateCache.data.rate);
      }

      secureLog('error', 'Erro ao obter taxa de conversão', {
        error: error.message,
        amountBRL
      });
      throw error;
    }
  }

  /**
   * Atualiza cache com nova taxa
   * @param {number} rate - Taxa de conversão
   * @private
   */
  updateCache(rate) {
    const now = Date.now();
    this.rateCache.data = { rate, timestamp: new Date().toISOString() };
    this.rateCache.expiresAt = now + this.rateCache.ttl;
    this.rateCache.staleAt = now + this.rateCache.staleTtl;
    this.rateCache.refreshPromise = null;
  }

  /**
   * Atualiza cache em background (não bloqueia)
   * @private
   */
  async refreshCacheInBackground() {
    // Evitar múltiplas requisições simultâneas
    if (this.rateCache.refreshPromise) {
      return this.rateCache.refreshPromise;
    }

    this.rateCache.refreshPromise = (async () => {
      try {
        const rate = await this.fetchConversionRate();
        this.updateCache(rate);
        secureLog('info', 'Cache de taxa atualizado em background', { rate });
      } catch (error) {
        secureLog('warn', 'Erro ao atualizar cache em background', {
          error: error.message
        });
      } finally {
        this.rateCache.refreshPromise = null;
      }
    })();

    return this.rateCache.refreshPromise;
  }

  /**
   * Busca taxa de conversão do provedor
   * @returns {Promise<number>} Taxa BRL/USDT
   * @throws {Error} Se não conseguir obter taxa de nenhum provedor
   */
  async fetchConversionRate() {
    try {
      // Em produção, integrar com provedor real
      // Por enquanto, usar taxa mockada baseada em dados reais aproximados

      if (this.providers.primary.type === 'mock' || !this.providers.primary.apiUrl) {
        // Modo desenvolvimento: usar taxa mockada
        secureLog('info', 'Usando taxa mockada para desenvolvimento', {});

        // Taxa aproximada: ~5.50 BRL/USDT (exemplo)
        // Em produção, buscar de API real
        const mockRate = 5.50;
        return mockRate;
      }

      // Integração com provedor real (implementar conforme necessário)
      const response = await this.callProviderAPI('rate', {
        from: 'BRL',
        to: 'USDT'
      });

      if (!response || !response.rate) {
        throw new Error('Resposta inválida do provedor de liquidez');
      }

      secureLog('info', 'Taxa obtida do provedor', {
        provider: this.providers.primary.name,
        rate: response.rate
      });

      return parseFloat(response.rate);

    } catch (error) {
      secureLog('error', 'Erro ao buscar taxa do provedor', {
        error: error.message,
        provider: this.providers.primary.name
      });

      // Tentar fallback
      if (this.providers.fallback.apiUrl) {
        secureLog('info', 'Tentando provedor fallback', {
          provider: this.providers.fallback.name
        });
        return await this.fetchConversionRateFromFallback();
      }

      throw error;
    }
  }

  /**
   * Busca taxa do provedor fallback
   * @returns {number} Taxa BRL/USDT
   */
  async fetchConversionRateFromFallback() {
    try {
      // Implementar chamada ao provedor fallback
      // Por enquanto, retornar taxa mockada
      secureLog('info', 'Usando taxa do provedor fallback', {
        provider: this.providers.fallback.name
      });

      return 5.50; // Mock

    } catch (error) {
      secureLog('error', 'Erro no provedor fallback', {
        error: error.message
      });
      throw new Error('Todos os provedores de liquidez falharam');
    }
  }

  /**
   * Cria ordem de liquidação (liquidação assistida)
   * Não executa conversão, apenas registra intenção para validação humana
   * @param {object} orderParams - Parâmetros da ordem
   * @param {number} orderParams.amountBRL - Valor em BRL
   * @param {string} orderParams.userId - ID do usuário
   * @param {string} orderParams.correlationId - ID de correlação da transação PIX
   * @param {string} orderParams.targetAsset - Ativo destino (default: 'USDT')
   * @returns {object} Ordem de liquidação criada (status: PENDING_REVIEW)
   */
  async createSettlementOrder(orderParams) {
    const {
      amountBRL,
      userId,
      correlationId,
      targetAsset = 'USDT'
    } = orderParams;

    try {
      if (!amountBRL || amountBRL <= 0) {
        throw new Error('Valor em BRL deve ser maior que zero');
      }

      if (!userId) {
        throw new Error('userId é obrigatório');
      }

      if (!correlationId) {
        throw new Error('correlationId é obrigatório');
      }

      // Obter taxa estimada (sem executar conversão)
      const rateInfo = await this.getConversionRate(amountBRL);
      const { rate, amountUSDT, fees } = rateInfo;

      // Criar ordem de liquidação (pendente de aprovação)
      const settlementOrder = {
        orderId: `settle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING_REVIEW',
        amountBRL,
        targetAsset,
        estimatedAmount: amountUSDT,
        estimatedRate: rate,
        estimatedFees: fees,
        userId: '[REDACTED]',
        correlationId,
        createdAt: new Date().toISOString(),
        ready: false // Não está pronto para transferir ainda
      };

      secureLog('info', 'Ordem de liquidação criada (pendente de revisão)', {
        orderId: settlementOrder.orderId,
        correlationId,
        amountBRL,
        estimatedAmount: amountUSDT
      });

      return {
        success: true,
        order: settlementOrder
      };

    } catch (error) {
      secureLog('error', 'Erro ao criar ordem de liquidação', {
        error: error.message,
        userId: '[REDACTED]',
        correlationId,
        amountBRL
      });
      throw error;
    }
  }

  /**
   * Executa ordem de liquidação (após aprovação humana)
   * @param {string} orderId - ID da ordem de liquidação
   * @returns {object} Resultado da liquidação executada
   */
  async executeSettlementOrder(orderId) {
    // TODO: Buscar ordem do storage e executar
    // Por enquanto, delegar para convertFiatToUSDT
    throw new Error('executeSettlementOrder não implementado ainda. Use settle() diretamente.');
  }

  /**
   * Liquida pagamento: Executa liquidação BRL → USDT conforme estratégia
   * @param {object} settlementParams - Parâmetros de liquidação
   * @param {number} settlementParams.amountBRL - Valor em BRL
   * @param {string} settlementParams.userId - ID do usuário
   * @param {string} settlementParams.correlationId - ID de correlação da transação PIX
   * @param {string} settlementParams.target - Moeda destino (default: 'USDT')
   * @param {string} settlementParams.strategy - Estratégia: 'auto'|'manual'|'deferred'
   * @returns {object} Resultado da liquidação
   */
  async settle(settlementParams) {
    const {
      amountBRL,
      userId,
      correlationId,
      target = 'USDT',
      strategy = 'auto'
    } = settlementParams;

    return await this.convertFiatToUSDT(amountBRL, userId, correlationId, strategy, target);
  }

  /**
   * Executa conversão BRL → USDT (método interno, mantido para compatibilidade)
   * @param {number} amountBRL - Valor em BRL
   * @param {string} userId - ID do usuário
   * @param {string} correlationId - ID de correlação da transação PIX
   * @param {string} strategy - Estratégia de liquidação: 'auto'|'manual'|'deferred'
   * @param {string} target - Moeda destino (default: 'USDT')
   * @returns {object} Resultado da conversão
   */
  async convertFiatToUSDT(amountBRL, userId, correlationId, strategy = 'auto', target = 'USDT') {
    try {
      if (!amountBRL || amountBRL <= 0) {
        throw new Error('Valor em BRL deve ser maior que zero');
      }

      if (!userId) {
        throw new Error('userId é obrigatório');
      }

      if (!correlationId) {
        throw new Error('correlationId é obrigatório');
      }

      // Obter taxa de conversão
      const rateInfo = await this.getConversionRate(amountBRL);
      const { rate, amountUSDT, fees } = rateInfo;

      secureLog('info', 'Iniciando liquidação programável Fiat → USDT', {
        userId: '[REDACTED]',
        correlationId,
        amountBRL,
        amountUSDT,
        rate,
        strategy
      });

      // Em produção, executar ordem de liquidação conforme estratégia
      // Estratégias:
      // - 'auto': Liquidação imediata (requer liquidez disponível)
      // - 'manual': Aguarda aprovação manual (para volumes maiores)
      // - 'deferred': Agendada para janela específica (otimização de custos)

      // Por enquanto, simular liquidação (modo desenvolvimento)
      const conversionResult = {
        success: true,
        conversionId: `settle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: {
          currency: 'BRL',
          amount: amountBRL
        },
        to: {
          currency: target,
          amount: amountUSDT
        },
        rate,
        fees,
        strategy,
        ready: strategy === 'auto', // Auto está pronto imediatamente
        provider: this.providers.primary.name,
        timestamp: new Date().toISOString(),
        correlationId,
        userId: '[REDACTED]'
      };

      secureLog('info', 'Liquidação programável concluída', {
        conversionId: conversionResult.conversionId,
        correlationId,
        amountUSDT,
        strategy
      });

      return conversionResult;

    } catch (error) {
      secureLog('error', 'Erro ao liquidar pagamento', {
        error: error.message,
        userId: '[REDACTED]',
        correlationId,
        amountBRL,
        strategy
      });
      throw error;
    }
  }

  /**
   * Calcula valor em USDT baseado na taxa
   * @param {number} amountBRL - Valor em BRL
   * @param {number} rate - Taxa BRL/USDT
   * @returns {object} Valor em USDT e taxas
   */
  calculateUSDT(amountBRL, rate) {
    // Taxa de serviço (0.5% por padrão)
    const serviceFeePercent = parseFloat(process.env.CONVERSION_FEE_PERCENT || '0.5');

    // Usar centavos para evitar erros de ponto flutuante em BRL
    const amountCents = Math.round(amountBRL * 100);
    // Calcular feeCents usando BigInt para evitar problemas de ponto flutuante
    // Multiplicar por 100 para manter a precisão do percentual, depois dividir por 100
    const feeCents = Number(BigInt(amountCents) * BigInt(Math.round(serviceFeePercent * 100)) / BigInt(100));
    const netAmountCents = amountCents - feeCents;

    // Converter de volta para decimal BRL
    const netAmountBRL = netAmountCents / 100;
    const serviceFee = feeCents / 100;

    // Calcular USDT com alta precisão antes de arredondar
    // USDT normalmente tem 6 decimais
    const amountUSDT = netAmountBRL / rate;

    return {
      rate,
      amountUSDT: Number(amountUSDT.toFixed(6)),
      fees: {
        serviceFee: Number(serviceFee.toFixed(2)),
        serviceFeePercent,
        netAmountBRL: Number(netAmountBRL.toFixed(2))
      }
    };
  }

  /**
   * Chama API do provedor de liquidez
   * @param {string} endpoint - Endpoint da API
   * @param {object} params - Parâmetros da requisição
   * @returns {Promise<object>} Resposta da API
   * @throws {Error} Se a API retornar erro ou status não OK
   */
  async callProviderAPI(endpoint, params = {}) {
    try {
      const provider = this.providers.primary;

      if (!provider.apiUrl) {
        throw new Error('Provedor de liquidez não configurado');
      }

      const url = `${provider.apiUrl}/${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`API do provedor retornou status ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      logAPIError('error', 'Erro ao chamar API do provedor', {
        service: 'liquidity-provider',
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verifica disponibilidade de liquidez
   * @param {number} amountUSDT - Quantidade de USDT necessária
   * @returns {boolean} True se há liquidez disponível
   */
  async checkLiquidity(amountUSDT) {
    try {
      // Em produção, verificar saldo disponível do provedor
      // Por enquanto, sempre retornar true (modo desenvolvimento)

      secureLog('info', 'Verificando disponibilidade de liquidez', {
        amountUSDT
      });

      // Mock: sempre disponível em desenvolvimento
      return {
        available: true,
        amountUSDT,
        provider: this.providers.primary.name,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao verificar liquidez', {
        error: error.message,
        amountUSDT
      });
      return {
        available: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let providerInstance = null;

function getLiquidityProvider() {
  if (!providerInstance) {
    providerInstance = new LiquidityProvider();
  }
  return providerInstance;
}

module.exports = {
  LiquidityProvider,
  getLiquidityProvider
};

