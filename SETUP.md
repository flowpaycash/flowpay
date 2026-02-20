<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

# FLOWPay: Guia de Configuração Técnica

```text
========================================
     FlowPay - SETUP & OPERATIONS
========================================
Nó: mio-flowpay (Liquidação)
Infra: Node.js 22 + Astro + Railway
Foco: Comandos, Variáveis e Deploy
========================================
```

## Requisitos de Sistema

- **Node.js:** Versão 22.x (Ambiente Soberano).
- **Railway CLI:** Gerenciamento de infraestrutura cloud.
- **NΞØ Tunnel:** Gateway de conectividade para webhooks locais.

## Matriz de Condições (Gates)

A execução é estritamente condicional. Falhas em qualquer "Gate" resultam em bloqueio imediato para garantir a integridade do protocolo:

1. **HMAC GATE:** Validação da assinatura do webhook WooVi. Impede ataques de replay e payloads falsos.
2. **TUNNEL GATE:** Handshake de camada 4/7 usando o `TUNNEL_SECRET`. Garante que apenas o seu túnel toque na Nexus.
3. **FINALITY GATE:** Verificação de estado na rede via **RPC Adapter**. O recibo só é emitido após confirmação de bloco e geração da **Proof of Integrity (PoI)**.

## Variáveis de Ambiente (.env)

| Variável | Função Técnica | Severidade |
| :--- | :--- | :--- |
| `TUNNEL_SECRET` | Token de autenticação do Túnel | **CRÍTICA** |
| `WOOVI_API_KEY` | Chave de comunicação com a API PIX | **CRÍTICA** |
| `WOOVI_WEBHOOK_SECRET` | Chave HMAC para validação de entrada | **CRÍTICA** |
| `NEXUS_WEBHOOK_URL` | Endpoint da Nexus Core via Túnel | **SISTEMA** |
| `QUICKNODE_RPC_URL` | Endpoint de monitoramento on-chain | **SISTEMA** |

## Início Rápido (Operação)

### 1. Bootstrap e Dependências
```bash
# Instalação limpa do ecossistema
npm run setup
```

### 2. Provisionamento Soberano
```bash
# Gera os assets e configurações locais do NΞØ
npm run neo:cfg
```

### 3. Execução em Desenvolvimento (com Tunnel)
```bash
# Inicia ambiente Railway local expondo os endpoints
railway run npm run dev
```

### 4. Build de Produção
```bash
# Compilação Astro para modo servidor
npm run build
```

## Verificação e Auditoria

O FlowPay opera em **Ciclo Fechado**. Para validar a saúde do nó, utilize os scripts integrados:

- `npm run test`: Suite de testes de integração.
- `scripts/flowpay/check-health.sh`: Verifica status da API, Tunnel e RPC.

---

NΞØ MELLØ
Core Architect · NΞØ Protocol
