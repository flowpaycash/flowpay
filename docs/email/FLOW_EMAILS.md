# 📧 Fluxo de E-mails Transacionais - FlowPay

**NEØ Protocol · Autonomous Notification Layer**

Este documento descreve a arquitetura e o fluxo de disparos de e-mail do FlowPay, garantindo redundância entre a API do Resend e o protocolo SMTP.

---

## 1. Arquitetura do Serviço

O coração das notificações de e-mail está em `src/services/api/email-service.mjs`. Ele foi projetado para ser resiliente:

- **Provedor Principal**: [Resend](https://resend.com) via API REST (Melhor entrega e monitoramento).
- **Redundância (SMTP)**: Configurações de SMTP configuradas no `.env` como fallback ou para serviços legados.
- **Remetente Oficial**: `noreply@send.flowpay.cash` (Subdomínio verificado para proteção de reputação).

---

## 2. Fluxo de Disparo (Processo de Pagamento)

O disparo acontece automaticamente no momento da confirmação do Pix:

1.  **Gatilho**: O Webhook da Woovi envia um evento `charge.paid` para `/api/webhook.js`.
2.  **Identificação**: O sistema localiza o pedido no banco de dados SQLite e extrai o `customer_email`.
3.  **Processamento Assíncrono**:
    - O Webhook chama `sendEmail()` do serviço de e-mail.
    - O disparo ocorre em segundo plano (Promise) para não atrasar a resposta do Webhook para a Woovi.
4.  **Entrega**:
    - O Resend recebe a requisição via API e processa o envio usando a `RESEND_API_KEY`.
    - Se o disparo falhar, um erro é registrado no `secureLog` para auditoria admin.

---

## 3. Templates e Estilo

Os e-mails são enviados em formato HTML com o design system do FlowPay:

- **Identidade Visual**: Uso de cores da marca (`#ff007a`).
- **Informações Dinâmicas**: ID do Pedido, Valor em BRL e Status da Transação.
- **Rodapé**: Nota de transparência indicando disparo automático por sistemas autônomos.

---

## 4. Configuração (.env)

Variáveis necessárias para a operação:

```bash
# Gateway Resend
RESEND_API_KEY=re_...
RESEND_FALLBACK_FROM=FlowPay <noreply@flowpay.cash>
EMAIL_DOMAIN_CHECK_TTL_MS=600000

# Canal SMTP
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=FlowPay <noreply@send.flowpay.cash>
```

---

## 5. Auditoria e Logs

Todos os disparos (sucesso ou falha) são registrados no sistema de logs:

- **Sucesso**: Registra o ID da mensagem no Resend e o destinatário.
- **Falha**: Registra o código de erro da API e o contexto da transação, incluindo tentativas de failover.

Acesse as métricas de entrega diretamente no seu painel [Resend Metrics](https://resend.com/metrics).

---

**Status**: OPERACIONAL ✅
**Versão**: 1.0.0
