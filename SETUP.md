<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# 🛠️ FLOWPay - Guia de Configuração Técnica

```text
========================================
     CONFIGURAÇÃO E DEPLOYMENT
========================================
Nó: mio-flowpay (Liquidação)
Infra: Tunnel -> Nexus -> Factory
Monitor: RPC QuickNode/Infura
Status: PRONTO PARA OPERAÇÃO
========================================
```

## ▓▓▓ REQUISITOS DE SISTEMA

- **Node.js:** Versão 22.x (Ambiente Soberano).
- **Railway CLI:** Gerenciamento de infra cloud.
- **NΞØ Tunnel:** Gateway de conectividade segura.

## ▓▓▓ MATRIZ DE CONDIÇÕES (GATES)

A execução é estritamente condicional. Falhas em qualquer "Gate" resultam em bloqueio imediato:

1. **HMAC GATE:** Validação da assinatura do webhook WooVi. Impede ataques de replay e payloads falsos.
2. **TUNNEL GATE:** Handshake de camada 4/7 usando o `TUNNEL_SECRET`. Garante que apenas o seu túnel toque na Nexus.
3. **FINALITY GATE:** Verificação de estado na rede via **RPC Adapter**. O recibo só é emitido após confirmação de bloco.

## ▓▓▓ VARIÁVEIS DE AMBIENTE (.env)

| Variável | Função Técnica | Severidade |
| :--- | :--- | :--- |
| `TUNNEL_SECRET` | Token de autenticação do Túnel | **CRÍTICA** |
| `WOOVI_API_KEY` | Chave de comunicação com a API PIX | **CRÍTICA** |
| `WOOVI_WEBHOOK_SECRET` | Chave HMAC para validação de entrada | **CRÍTICA** |
| `NEXUS_WEBHOOK_URL` | Endpoint da Nexus Core via Túnel | **SISTEMA** |
| `QUICKNODE_RPC_URL` | Endpoint de monitoramento on-chain | **SISTEMA** |

## ▓▓▓ INÍCIO RÁPIDO (PRODUÇÃO)

1. **Bootstrap:**
   ```bash
   npm run setup
   ```
2. **Provisionamento Soberano:**
   ```bash
   npm run neo:cfg
   ```
3. **Ativação com Tunnel:**
   ```bash
   railway run npm run dev
   ```

## ▓▓▓ MONITORAMENTO (LOOP DE RETORNO)

O sistema opera em **Ciclo Fechado**:
- Entrada detectada -> Execução pedida.
- Monitoramento de RPC -> Confirmação.
- PoI Gerada -> Recibo Final emitido.

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Arquiteto Core · NΞØ Protocol
neo@neoprotocol.space

"Código é lei. Expanda até que o
 caos se torne protocolo."

Segurança por design.
Exploits não encontram refúgio aqui.
────────────────────────────────────────
