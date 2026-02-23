# Agent-Full x FlowPay Handoff

Objetivo
- garantir que lead qualificado vire pagamento confirmado com rastreabilidade ponta a ponta.

Fluxo minimo
1. `LEAD_CREATED`
2. `PROPOSAL_SENT`
3. `PAYMENT_RECEIVED`
4. `DELIVERY_STARTED`

Contrato de handoff (Agent-Full -> FlowPay)
- lead_id
- proposal_id
- icp
- offer_name (ex: Sprint Receita 7D)
- offer_price
- checkout_url
- utm_source
- utm_campaign
- owner

Contrato de retorno (FlowPay -> Nexus)
- event_name: PAYMENT_RECEIVED
- occurred_at
- payment_id
- lead_id
- proposal_id
- amount
- currency
- payment_method
- status: confirmed

SLA
- tempo maximo para registrar `PAYMENT_RECEIVED`: 5 minutos apos confirmacao no gateway.

DoD
- 100% dos pagamentos confirmados com evento no Nexus.
- 0 duplicidade por `payment_id`.
- painel com receita por ICP, origem e oferta.
