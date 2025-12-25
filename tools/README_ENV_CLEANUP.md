# 🧹 FLOWPay - Scripts de Limpeza de Variáveis de Ambiente

## 📋 Scripts Disponíveis

### 1. `clean-env.js` - Limpar Duplicações

Remove duplicações e corrige nomes de variáveis no arquivo `.env`.

**Uso:**
```bash
node tools/clean-env.js
```

**O que faz:**
- ✅ Remove variáveis duplicadas (mantém estratégia apropriada)
- ✅ Renomeia variáveis incorretas (QUICKNODE_*_URL → QUICKNODE_*_RPC)
- ✅ Cria backup automático (.env.backup)
- ✅ Mantém estrutura e comentários do arquivo

**Estratégias de duplicação:**
- `INFURA_KEY`: Mantém primeira (chave), remove URL
- `URL`: Mantém primeira
- `CONVERSION_FEE_PERCENT`: Mantém primeira
- `LIQUIDITY_PROVIDER_NAME`: Mantém última (manual)

### 2. `add-quicknode-vars.js` - Adicionar Variáveis QuickNode

Adiciona `QUICKNODE_BASE_RPC` e `QUICKNODE_POLYGON_RPC` ao `.env`.

**Uso:**
```bash
node tools/add-quicknode-vars.js
```

**O que faz:**
- ✅ Solicita valores interativamente
- ✅ Adiciona variáveis na seção apropriada
- ✅ Cria backup antes de modificar
- ✅ Verifica se variáveis já existem

## 🔄 Fluxo Recomendado

1. **Limpar duplicações:**
   ```bash
   node tools/clean-env.js
   ```

2. **Criar endpoints no QuickNode:**
   - Base (EVM) - Proof Layer
   - Polygon - USDT Settlement

3. **Adicionar variáveis QuickNode:**
   ```bash
   node tools/add-quicknode-vars.js
   ```

4. **Verificar configuração:**
   ```bash
   node tools/validate-env.js
   ```

## 📝 Notas

- Todos os scripts criam backup automático
- Sempre revise o arquivo `.env` após execução
- Em caso de problemas, restaure do `.env.backup`

