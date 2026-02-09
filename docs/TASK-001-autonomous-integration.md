# 🚀 TASK: Integração de Soberania (Smart Accounts & Audit)

**Prioridade:** 🔥 CRÍTICA (Habilita a Visão Soberana)
**Responsável:** Equipe de Engenharia FlowPay
**Prazo:** Imediato

## 🎯 Objetivo

Migrar a inteligência dispersa nos repositórios legados (`delegation-toolkit`, `neo_one`, `FlowPAY Legacy`) para o núcleo do **FlowPay Autonomous v3**, habilitando contas inteligentes (gasless), liquidação robusta e redundância de verificação.

---

## 🛠️ Componentes a Integrar

### A. Smart Accounts & Gasless (Origem: `delegation-toolkit`)

**Arquivo Fonte:** `integrate-token-smart-accounts.ts`
**Destino:** `flowpay/src/services/wallet/smart-account.ts`

1. **Portar Criação de Conta:** Implementar a função `toMetaMaskSmartAccount` para gerar carteiras para os usuários on-the-fly.
2. **Implementar Gasless:** Configurar o `InfuraBundlerClient` usando a lógica existente no script para permitir que o protocolo pague o gas das taxas de acesso.
3. **Abstração:** Criar uma classe `SmartWalletService` que encapsule essa complexidade. O frontend só deve chamar `createWallet()` e `executeTransaction()`.

### B. Settlement Engine (Origem: `neo_one`)

**Arquivo Fonte:** `src/executors/neoflow-executor.js`
**Destino:** `flowpay/src/services/settlement/engine.ts`

1. **Lógica de Transferência:** Adaptar a função `transfer` do executor para ser usada no settlement do FlowPay.
2. **Gestão de Contrato:** Reutilizar a estrutura limpa de interação com contratos ERC-20 (balance, approve, transfer).

### C. Redundância de Verificação (Origem: `FlowPAY Legacy`)

**Arquivo Fonte:** `crypto.py` (Função `check_erc20_token_payment`)
**Destino:** `flowpay/src/services/monitor/chain-scanner.ts` (ou similar)

1. **Chain Scanner:** Portar a lógica de loop que varre os últimos N blocos buscando eventos `Transfer` para a carteira do merchant.
2. **Por que:** Isso serve como backup se o webhook da Woovi falhar ou se recebermos pagamentos diretos em Crypto (USDT/USDC) sem passar pelo gateway PIX.

---

## 📝 Definição de Pronto (DoD)

- [ ] `SmartWalletService` cria contas inteligentes na rede Base/Polygon.
- [ ] Transações de teste executadas sem que o usuário precise ter ETH (Gasless).
- [ ] Serviço de Settlement consegue mover fundos programaticamente usando o código portado.
- [ ] Scanner de blocos detecta pagamentos simulados localmente.

---

## Estrutura Criada (Autonomous v3)

| Pilar | Destino | Status |
| :--- | :--- | :--- |
| A. Smart Accounts | `services/wallet/smart-account.js` | Stub; portar de `integrate-token-smart-accounts.ts` |
| B. Settlement Engine | `services/settlement/engine.js` | Transfer direto (viem) ok; gasless stub |
| C. Chain Monitor | `services/monitor/chain-scanner.js` | Stub; portar de `crypto.py` |

Relatório de auditoria: `extensions/flowpay/legacy-audit-report.json`. Variáveis de ambiente: `.env.example` (seção AUTONOMOUS v3).

---

> "Não reinvente a roda. A roda já foi inventada, está na pasta ao lado. Apenas monte o carro." — NΞØ
