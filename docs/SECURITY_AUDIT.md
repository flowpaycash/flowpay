# Security Audit - Vulnerabilidade jws

## ⚠️ Vulnerabilidade Identificada

**Pacote**: `jws` < 3.2.3  
**Severidade**: Alta  
**Localização**: `node_modules/netlify-cli/node_modules/jws`  
**CVE**: [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x)

## 📋 Análise

### Contexto

- **Dependência**: Transitiva do `netlify-cli` (devDependency)
- **Uso**: Apenas em desenvolvimento local
- **Impacto em Produção**: **Nenhum** - não é incluído no build final
- **Risco Real**: Baixo - apenas afeta desenvolvimento local

### Por que não afeta produção?

1. `netlify-cli` é apenas `devDependency`
2. Não é incluído no build do Astro
3. Não é enviado para produção no Netlify
4. Apenas usado localmente para desenvolvimento

## 🔧 Soluções

### Opção 1: Ignorar (Recomendado)

Como é apenas uma dependência de desenvolvimento e não afeta produção:

```bash
# Criar arquivo .npmrc para ignorar vulnerabilidades de devDependencies
echo "audit-level=moderate" > .npmrc
```

### Opção 2: Aguardar atualização do netlify-cli

O `netlify-cli` pode atualizar a dependência `jws` em versões futuras.

### Opção 3: Usar npm audit fix --force (Cuidado)

```bash
npm audit fix --force
```

⚠️ **Atenção**: Pode quebrar compatibilidade com outras dependências.

### Opção 4: Usar Yarn com resolutions

Se migrar para Yarn:

```json
{
  "resolutions": {
    "jws": ">=3.2.3"
  }
}
```

## ✅ Recomendação

**Status**: Aceitável para desenvolvimento

Como a vulnerabilidade está em uma dependência de desenvolvimento que não é incluída no build de produção, é seguro continuar usando o projeto normalmente.

## 📝 Monitoramento

Execute periodicamente:

```bash
npm audit
```

Para verificar se novas vulnerabilidades aparecem ou se o `netlify-cli` atualiza a dependência.

## 🔗 Referências

- [GitHub Advisory](https://github.com/advisories/GHSA-869p-cjfg-cm3x)
- [npm audit docs](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Netlify CLI Issues](https://github.com/netlify/cli/issues)

