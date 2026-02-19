# 📟 Relatório de Auditoria Técnica: Checkout & Bridge Smart Factory

**Data:** 02 de Fevereiro de 2026
**Responsável:** Antigravity (Via Auditoria Automatizada)
**Versão do Codebase:** `v1.0.0` (FlowPay Monorepo)

---

## 🚦 Status Geral: 🟡 AMARELO (Funcional com Riscos)

O sistema está operacional para processar pagamentos PIX e acionar o "comando" para a Smart Factory (Neobot). No entanto, a resiliência e a persistência de estado (frontend e backend) precisam de melhorias críticas antes de um lançamento em grande escala para evitar suporte manual.

---

## 1. 🛒 Rota `/checkout` (Front-end)

| Item | Status | Observação |
| :--- | :---: | :--- |
| **Estabilidade Visual** | 🟢 | Componentes Astro leves. State Machine controla visibilidade sem re-renders pesados. |
| **Dual Mode (Persistência)** | 🔴 | **Falha.** Se o usuário alterna para "Crypto", inicia o form, e recarrega a página, volta para "PIX" e perde os dados. Não há `localStorage` ou URL params implementados. |
| **Feedback de Erro** | 🟡 | Básico. O sistema exibe "Toasts" simples. Se o backend demorar, não há feedback de "Polling" ou "Aguardando confirmação" robusto na UI. |

---

## 2. 💸 Integração PIX (Woovi/OpenPix)

| Item | Status | Observação |
| :--- | :---: | :--- |
| **Webhook Resilience (Segurança)** | 🟢 | **Seguro.** Middleware valida assinatura HMAC (`x-woovi-signature`) corretamente antes de processar. |
| **Idempotência** | 🟡 | **Risco.** O webhook atualiza o status cegamente (`updateOrderStatus`). Se a Woovi enviar o evento 2x, o sistema disparará o comando `triggerNeobotUnlock` 2x. A dependência de dedup está inteiramente no Neobot. |

---

## 3. 🏭 A "Ponte" Smart Factory (Backend)

| Item | Status | Observação |
| :--- | :---: | :--- |
| **Status Real (Minting)** | 🟡 | **Proxy Remoto.** O FlowPay **NÃO** minta tokens localmente. Ele atua como um gatilho REST para o `Neobot` (`POST /tools/invoke`). A promessa de "Factory" é cumprida via delegação. |
| **Conexão do Relayer** | ⚪ | **Externa.** Não há chaves privadas ou lógica de `ethers.js/viem` ativa no FlowPay para mint. O FlowPay confia cegamente que o Neobot possui o Relayer configurado. |
| **Falhas de Rede (Retry)** | 🔴 | **Crítico.** Se a chamada ao Neobot falhar (timeout/down), o webhook captura o erro, loga, **mas não retenta**. O pedido fica como "Pago" no DB, mas o cliente não recebe o ativo. Requer "Queue" (BullMQ/Redis) ou Tabela de Retentativa. |

---

## 📋 Recomendações Prioritárias (Roadmap de Correção)

1.  **Implementar Fila de Resiliência (P1):**
    *   Criar tabela `retry_queue` no SQLite.
    *   Se `triggerNeobotUnlock` falhar, salvar payload para cronjob ou worker tentar novamente.
    *   *Risco:* Perda de entregáveis (tokens) após pagamento confirmado.

2.  **Persistência no Checkout (P2):**
    *   Adicionar sincronia simples via URL (`?mode=crypto`) ou `localStorage` para manter a aba e dados do usuário ativos após refresh.

3.  **Hardening de Idempotencia (P3):**
    *   Antes de chamar a Bridge, verificar no DB: `if (order.bridge_status === 'SENT') return;`.

---

**Conclusão:** O código sustenta a narrativa de "Motor Industrial" como uma arquitetura de microsserviços (FlowPay -> Neobot), mas a "Esteira" (Bridge) pode travar se houver soluços na rede, sem um operador automático para reinicia-la.
