# 🎛️ FlowPay - Painel Administrativo & Métricas

Este documento descreve as ferramentas e endpoints disponíveis para monitoramento e administração do ecossistema FlowPay Autonomous.

## 📊 Endpoints de Métricas

### 1. Métricas em Tempo Real
**Endpoint:** `GET /api/admin/metrics`

Retorna um resumo das atividades das últimas 24 horas e estatísticas acumuladas.

**Exemplo de Resposta:**
```json
{
  "success": true,
  "metrics": {
    "total_wallets": 128,          // Total de carteiras únicas (Web3Auth/MetaMask)
    "guest_access_24h": 45,        // Acessos via "Entrar como Convidado" nas últimas 24h
    "payments_24h": 12,            // Total de cobranças PIX pagas nas últimas 24h
    "volume_24h": 1500.50          // Volume total processado em BRL nas últimas 24h
  }
}
```

## 🛡️ Rastreabilidade e Logs

### Registro de Carteiras (`wallet_sessions`)
Toda conexão bem-sucedida via Web3Auth ou MetaMask Smart Account é registrada automaticamente.
- **Campos:** Endereço, Chain ID, Data do primeiro acesso, Data do último acesso, Contador de logins.
- **Uso:** Identificar usuários recorrentes e segmentar por tipo de carteira (EOA vs AA).

### Log de Acesso de Convidados (`audit_log`)
Registra quando um usuário opta por não conectar a carteira.
- **Evento:** `ACCESS`
- **Ator:** `GUEST`
- **Metadata:** Inclui IP e User Agent para análise de tráfego.

### Auditoria de Transações
Todas as mudanças de estado de um pedido (Criado -> Pago -> Review -> Settled) são registradas com timestamp e detalhes do evento.

## 🚀 Próximos Passos (Roadmap Admin)
- [ ] Interface visual para o Dashboard de Métricas.
- [ ] Exportação de relatórios em CSV para contabilidade.
- [ ] Alertas via Telegram/Nexus para volumes atípicos ou falhas de bridge.

---
*Assinado: NΞØ Agent Architect*
