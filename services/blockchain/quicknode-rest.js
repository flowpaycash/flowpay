// FLOWPay - QuickNode REST APIs Client
// Cliente para APIs REST do QuickNode: IPFS, KV, Streams, Webhooks

const { secureLog } = require('../../netlify/functions/config');
const { getAPIRateLimiter } = require('../utils/api-rate-limiter');
const crypto = require('crypto');

class QuickNodeREST {
  constructor() {
    // API Key do QuickNode (obrigatória para REST APIs)
    this.apiKey = process.env.QUICKNODE_API_KEY || '';

    // Base URLs das APIs REST
    this.baseUrls = {
      functions: process.env.QUICKNODE_FUNCTIONS_REST || '',
      ipfs: process.env.QUICKNODE_IPFS_REST || '',
      kv: process.env.QUICKNODE_KV_REST || '',
      streams: process.env.QUICKNODE_STREAMS_REST || '',
      webhooks: process.env.QUICKNODE_WEBHOOKS_REST || ''
    };

    // Headers padrão
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    // Rate limiter para chamadas de API
    this.rateLimiter = getAPIRateLimiter();
  }

  /**
   * IPFS REST - Armazenar metadados de provas de forma descentralizada
   * @param {object} data - Dados para armazenar no IPFS
   * @param {string} [filename] - Nome do arquivo (opcional)
   * @returns {Promise<object>} Hash IPFS e URL
   * @returns {object.success} boolean - Indica sucesso da operação
   * @returns {object.ipfsHash} string - Hash IPFS (CID)
   * @returns {object.ipfsUrl} string - URL IPFS (ipfs://...)
   * @returns {object.gatewayUrl} string - URL do gateway IPFS
   * @returns {object.timestamp} string - Timestamp ISO da operação
   * @throws {Error} Se QUICKNODE_IPFS_REST ou QUICKNODE_API_KEY não estiverem configurados
   * @throws {Error} Se a API retornar erro ou rate limit for excedido
   */
  async storeInIPFS(data, filename = null) {
    try {
      if (!this.baseUrls.ipfs) {
        throw new Error('QUICKNODE_IPFS_REST não configurado');
      }

      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const url = `${this.baseUrls.ipfs}/upload`;

      // Aplicar rate limiting
      const response = await this.rateLimiter.withRateLimit(
        'quicknode',
        'ipfs-upload',
        async () => {
          // Preparar dados para upload (formato JSON para QuickNode IPFS API)
          return await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
            body: JSON.stringify({
              data: JSON.stringify(data),
              filename: filename || `proof_${Date.now()}.json`
            })
          });
        }
      );

      if (!response.ok) {
        throw new Error(`IPFS API retornou status ${response.status}`);
      }

      const result = await response.json();

      // QuickNode IPFS retorna hash no formato { hash: 'Qm...' } ou { cid: 'Qm...' }
      const ipfsHash = result.hash || result.cid || result.ipfsHash;

      if (!ipfsHash) {
        throw new Error('Hash IPFS não retornado pela API');
      }

      secureLog('info', 'Dados armazenados no IPFS', {
        ipfsHash,
        filename
      });

      return {
        success: true,
        ipfsHash,
        ipfsUrl: `ipfs://${ipfsHash}`,
        gatewayUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      secureLog('error', 'Erro ao armazenar no IPFS', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * KV REST - Armazenar/recuperar dados chave-valor
   * Útil para cache, estado temporário, configurações
   * @param {string} key - Chave
   * @param {any} value - Valor (será serializado como JSON)
   * @param {number} ttl - Time to live em segundos (opcional)
   * @returns {object} Resultado da operação
   */
  async setKV(key, value, ttl = null) {
    try {
      if (!this.baseUrls.kv) {
        throw new Error('QUICKNODE_KV_REST não configurado');
      }

      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const url = `${this.baseUrls.kv}/set`;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          ttl
        })
      });

      if (!response.ok) {
        throw new Error(`KV API retornou status ${response.status}`);
      }

      const result = await response.json();

      secureLog('info', 'Dados armazenados no KV', {
        key,
        ttl
      });

      return {
        success: true,
        key,
        ...result
      };

    } catch (error) {
      secureLog('error', 'Erro ao armazenar no KV', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  /**
   * KV REST - Recuperar dados
   * @param {string} key - Chave
   * @returns {object} Valor armazenado
   */
  async getKV(key) {
    try {
      if (!this.baseUrls.kv) {
        throw new Error('QUICKNODE_KV_REST não configurado');
      }

      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const url = `${this.baseUrls.kv}/get/${encodeURIComponent(key)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, found: false };
        }
        throw new Error(`KV API retornou status ${response.status}`);
      }

      const result = await response.json();

      // Tentar parsear JSON se possível
      let value = result.value;
      try {
        value = JSON.parse(value);
      } catch {
        // Manter como string se não for JSON
      }

      return {
        success: true,
        found: true,
        key,
        value,
        ttl: result.ttl
      };

    } catch (error) {
      secureLog('error', 'Erro ao recuperar do KV', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  /**
   * STREAMS REST - Criar stream para monitorar eventos
   * @param {object} streamConfig - Configuração do stream
   * @param {string} streamConfig.network - Rede blockchain
   * @param {string} streamConfig.webhookUrl - URL para receber eventos
   * @param {array} streamConfig.filters - Filtros de eventos
   * @returns {object} Stream criado
   */
  async createStream(streamConfig) {
    try {
      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      // Usar base URL padrão se não configurado
      const baseUrl = this.baseUrls.streams || 'https://api.quicknode.com';
      const url = `${baseUrl}/v0/streams`;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          network: streamConfig.network || 'ethereum',
          webhook_url: streamConfig.webhookUrl,
          filters: streamConfig.filters || [],
          tag: streamConfig.tag || 'flowpay'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(`Streams API retornou status ${response.status}: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }

      const result = await response.json();

      secureLog('info', 'Stream criado', {
        streamId: result.id || result.stream_id,
        network: streamConfig.network
      });

      return {
        success: true,
        stream: result
      };

    } catch (error) {
      secureLog('error', 'Erro ao criar stream', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Criar webhook usando template
   * @param {string} templateId - ID do template (evmWalletFilter, evmContractEvents, etc)
   * @param {object} templateArgs - Argumentos do template
   * @param {string} network - Rede blockchain
   * @param {string} webhookUrl - URL do endpoint
   * @param {string} name - Nome do webhook
   * @returns {object} Webhook criado
   */
  async createWebhookFromTemplate(templateId, templateArgs, network = 'ethereum', webhookUrl = null, name = null) {
    try {
      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      // URL base da API QuickNode
      const baseUrl = this.baseUrls.webhooks || 'https://api.quicknode.com';
      const url = `${baseUrl}/v0/webhooks/template/${templateId}`;

      // Webhook URL padrão
      const defaultWebhookUrl = webhookUrl ||
        (process.env.URL ? `${process.env.URL}/.netlify/functions/quicknode-webhook` : null);

      if (!defaultWebhookUrl) {
        throw new Error('webhookUrl é obrigatório ou configure URL no ambiente');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          name: name || `FLOWPay ${templateId}`,
          network,
          templateArgs,
          destination: {
            url: defaultWebhookUrl,
            securityToken: process.env.QUICKNODE_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex')
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(`Webhooks API retornou status ${response.status}: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }

      const result = await response.json();

      secureLog('info', 'Webhook criado a partir de template', {
        webhookId: result.id || result.webhook_id,
        templateId,
        network
      });

      return {
        success: true,
        webhook: result
      };

    } catch (error) {
      secureLog('error', 'Erro ao criar webhook a partir de template', {
        error: error.message,
        templateId
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Criar webhook customizado (com filter function)
   * @param {object} webhookConfig - Configuração do webhook
   * @param {string} webhookConfig.network - Rede blockchain
   * @param {string} webhookConfig.url - URL do endpoint
   * @param {string} webhookConfig.filterFunction - JavaScript filter function (será codificado em base64)
   * @param {string} webhookConfig.name - Nome do webhook
   * @returns {object} Webhook criado
   */
  async createWebhook(webhookConfig) {
    try {
      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const baseUrl = this.baseUrls.webhooks || 'https://api.quicknode.com';
      const url = `${baseUrl}/v0/webhooks`;

      // Codificar filter function em base64 se fornecida
      let encodedFilter = null;
      if (webhookConfig.filterFunction) {
        encodedFilter = Buffer.from(webhookConfig.filterFunction).toString('base64');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          name: webhookConfig.name || 'FLOWPay webhook',
          network: webhookConfig.network || 'ethereum',
          filterFunction: encodedFilter,
          destination: {
            url: webhookConfig.url,
            securityToken: webhookConfig.securityToken || process.env.QUICKNODE_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex')
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(`Webhooks API retornou status ${response.status}: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }

      const result = await response.json();

      secureLog('info', 'Webhook criado', {
        webhookId: result.id || result.webhook_id,
        network: webhookConfig.network
      });

      return {
        success: true,
        webhook: result
      };

    } catch (error) {
      secureLog('error', 'Erro ao criar webhook', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Listar todos os webhooks
   * @returns {array} Lista de webhooks
   */
  async listWebhooks() {
    try {
      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const baseUrl = this.baseUrls.webhooks || 'https://api.quicknode.com';
      const url = `${baseUrl}/v0/webhooks`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Webhooks API retornou status ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        webhooks: result.data || result.webhooks || []
      };

    } catch (error) {
      secureLog('error', 'Erro ao listar webhooks', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Deletar webhook
   * @param {string} webhookId - ID do webhook
   * @returns {object} Resultado
   */
  async deleteWebhook(webhookId) {
    try {
      if (!this.apiKey) {
        throw new Error('QUICKNODE_API_KEY não configurado');
      }

      const baseUrl = this.baseUrls.webhooks || 'https://api.quicknode.com';
      const url = `${baseUrl}/v0/webhooks/${webhookId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Webhooks API retornou status ${response.status}`);
      }

      secureLog('info', 'Webhook deletado', {
        webhookId
      });

      return {
        success: true
      };

    } catch (error) {
      secureLog('error', 'Erro ao deletar webhook', {
        error: error.message,
        webhookId
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Monitorar transferências USDT usando template evmContractEvents
   * @param {string} contractAddress - Endereço do contrato USDT
   * @param {string} network - Rede blockchain
   * @param {string} webhookUrl - URL para receber eventos
   * @returns {object} Webhook criado
   */
  async monitorUSDTTransfers(contractAddress, network = 'ethereum', webhookUrl = null) {
    try {
      // Endereço padrão do contrato USDT
      const usdtContracts = {
        ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        bsc: '0x55d398326f99059fF775485246999027B3197955'
      };

      const usdtAddress = contractAddress || usdtContracts[network] || usdtContracts.ethereum;

      // Hash do evento Transfer(address,address,uint256)
      const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

      // Webhook URL padrão (endpoint Netlify)
      const defaultWebhookUrl = webhookUrl ||
        (process.env.URL ? `${process.env.URL}/.netlify/functions/quicknode-webhook` : null);

      if (!defaultWebhookUrl) {
        throw new Error('webhookUrl é obrigatório ou configure URL no ambiente');
      }

      // Usar template evmContractEvents
      return await this.createWebhookFromTemplate(
        'evmContractEvents',
        {
          contracts: [usdtAddress],
          eventHashes: [transferEventHash]
        },
        network,
        defaultWebhookUrl,
        `FLOWPay USDT Transfers - ${network}`
      );

    } catch (error) {
      secureLog('error', 'Erro ao configurar monitoramento USDT', {
        error: error.message,
        network
      });
      throw error;
    }
  }

  /**
   * WEBHOOKS REST - Monitorar wallets específicas usando template evmWalletFilter
   * @param {array} walletAddresses - Array de endereços de wallets
   * @param {string} network - Rede blockchain
   * @param {string} webhookUrl - URL para receber eventos
   * @returns {object} Webhook criado
   */
  async monitorWallets(walletAddresses, network = 'ethereum', webhookUrl = null) {
    try {
      if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
        throw new Error('walletAddresses deve ser um array não vazio');
      }

      const defaultWebhookUrl = webhookUrl ||
        (process.env.URL ? `${process.env.URL}/.netlify/functions/quicknode-webhook` : null);

      if (!defaultWebhookUrl) {
        throw new Error('webhookUrl é obrigatório ou configure URL no ambiente');
      }

      return await this.createWebhookFromTemplate(
        'evmWalletFilter',
        {
          wallets: walletAddresses
        },
        network,
        defaultWebhookUrl,
        `FLOWPay Wallet Monitor - ${network}`
      );

    } catch (error) {
      secureLog('error', 'Erro ao configurar monitoramento de wallets', {
        error: error.message,
        network
      });
      throw error;
    }
  }
}

// Singleton instance
let restInstance = null;

function getQuickNodeREST() {
  if (!restInstance) {
    restInstance = new QuickNodeREST();
  }
  return restInstance;
}

module.exports = {
  QuickNodeREST,
  getQuickNodeREST
};

