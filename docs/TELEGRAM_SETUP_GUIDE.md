# 📱 FLOWPay - Configuração Telegram

**Guia completo para configurar notificações Telegram no FLOWPay**

## 🎯 **Visão Geral**

O FLOWPay agora suporta notificações automáticas via Telegram quando webhooks são recebidos da Woovi/OpenPix. Isso permite que você receba alertas em tempo real sobre pagamentos Pix confirmados.

## 🔧 **Configuração do Bot Telegram**

### **1. Criar um Bot no Telegram**

#### **Via @BotFather:**

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot`
3. Escolha um nome para o bot (ex: "FLOWPay Notifications")
4. Escolha um username (ex: `flowpay_notifications_bot`)
5. **Guarde o TOKEN** fornecido pelo BotFather

#### **Exemplo de resposta:**

```
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

Keep your token secure and store it safely!
```

### **2. Obter o Chat ID**

#### **Método 1 - Via @userinfobot:**

1. Procure por `@userinfobot` no Telegram
2. Envie qualquer mensagem para ele
3. Ele retornará suas informações, incluindo o `id`

#### **Método 2 - Via @RawDataBot:**

1. Procure por `@RawDataBot` no Telegram
2. Adicione-o aos seus contatos
3. Envie qualquer mensagem
4. Ele retornará dados JSON com seu `id`

#### **Exemplo de resposta:**

```json
{
  "id": 123456789,
  "first_name": "Seu Nome",
  "username": "seu_usuario"
}
```

## ⚙️ **Configuração no FLOWPay**

### **1. Variáveis de Ambiente**

Configure no seu arquivo `.env` ou no painel do Railway:

```bash
# Telegram Notifications
TELEGRAM_BOT_TOKEN=<TELEGRAM_BOT_TOKEN>
TELEGRAM_CHAT_ID=123456789
```

### **2. Ativar Notificações**

No arquivo `src/pages/api/webhook.js`, remova o comentário:

```javascript
// Antes (comentado)
// await sendToTelegram(payload);

// Depois (ativo)
await sendToTelegram(payload);
```

## 📱 **Testando as Notificações**

### **1. Teste Local**

```bash
# Teste o webhook localmente
curl -X POST http://localhost:4321/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-OpenPix-Signature: test-signature" \
  -d '{"test": "webhook", "charge": {"status": "COMPLETED"}, "pix": {"value": "100.00"}}'
```

### **2. Teste em Produção**

1. Configure as variáveis no Railway
2. Faça uma cobrança Pix real
3. Verifique se a notificação chega no Telegram

## 📨 **Formato das Mensagens**

### **Exemplo de Notificação:**

```
📥 Novo Webhook FlowPay:

Status: COMPLETED
Valor: 100.00
ID: tx_123456789
```

### **Personalização da Mensagem**

Para customizar a mensagem, edite a função `sendToTelegram`:

```javascript
async function sendToTelegram(payload) {
  const message = `🚀 FLOWPay - Pagamento Confirmado!\n\n` +
    `💰 Valor: R$ ${payload?.pix?.value || 'N/A'}\n` +
    `✅ Status: ${payload?.charge?.status || 'N/A'}\n` +
    `🆔 ID: ${payload?.charge?.correlationID || 'N/A'}\n` +
    `⏰ Data: ${new Date().toLocaleString('pt-BR')}`;

  // ... resto do código
}
```

## 🔒 **Segurança**

### **1. Token do Bot**

- ✅ **NUNCA** compartilhe o token do bot
- ✅ **NUNCA** commite o token no Git
- ✅ Use variáveis de ambiente
- ✅ Rotacione o token periodicamente

### **2. Chat ID**

- ✅ O Chat ID é específico para cada usuário
- ✅ Pode ser compartilhado com segurança
- ✅ Use o mesmo Chat ID para todas as notificações

## 🚨 **Troubleshooting**

### **Problema: "Bot was blocked by the user"**

**Solução:** O usuário bloqueou o bot. Peça para desbloquear.

### **Problema: "Chat not found"**

**Solução:** Verifique se o Chat ID está correto.

### **Problema: "Unauthorized"**

**Solução:** Verifique se o TOKEN do bot está correto.

### **Problema: Notificações não chegam**

**Soluções:**

1. Verifique se as variáveis estão configuradas
2. Verifique se a função está descomentada
3. Verifique os logs do Railway
4. Teste o bot manualmente

## 📊 **Monitoramento**

### **1. Logs do Railway**

Acesse: `Railway Dashboard > Functions > Logs`

### **2. Arquivo de Payloads**

O webhook salva todos os payloads em `webhook_payloads.json`

### **3. Status das Funcionalidades**

Acesse: `/api/health` para ver o status

## 🔮 **Funcionalidades Futuras**

### **Próximas Implementações:**

- 📊 **Relatórios diários** via Telegram
- 🔔 **Alertas de erro** em tempo real
- 📈 **Estatísticas** de pagamentos
- 🎯 **Notificações personalizadas** por tipo de transação

## 📚 **Recursos Adicionais**

### **Documentação Oficial:**

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [@BotFather Commands](https://core.telegram.org/bots#how-do-i-create-a-bot)

### **Ferramentas Úteis:**

- [Telegram Web](https://web.telegram.org/)
- [BotFather](https://t.me/botfather)

---

## ✅ **Checklist de Configuração**

- [ ] Bot criado no @BotFather
- [ ] Token do bot obtido
- [ ] Chat ID identificado
- [ ] Variáveis configuradas no .env
- [ ] Variáveis configuradas no Railway
- [ ] Função descomentada no webhook
- [ ] Teste local realizado
- [ ] Teste em produção realizado
- [ ] Notificações chegando no Telegram

---

**🚀 FLOWPay com Telegram - Notificações em tempo real!**

*Última atualização: Agosto 2024*
