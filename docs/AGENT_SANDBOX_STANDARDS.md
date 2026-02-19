# 🛠️ NΞØ Protocol - Agent Sandbox Standards

## 📌 Contexto
O Claude Code utiliza um sandbox seguro para interagir com o sistema de arquivos. Por padrão, ele respeita o `.gitignore` e bloqueia operações de escrita em qualquer caminho listado no ignore. Isso cria conflitos em frameworks como o **Astro**, que precisam escrever na pasta `.astro/` durante o processo de build.

## 🛠️ Solução: O Padrão `.agyignore`

Para permitir que o agente realize builds e tarefas de manutenção sem erros de permissão (`EPERM`), introduzimos o arquivo `.agyignore`.

### Como funciona:
O arquivo `.agyignore` (Agent Ignore) sobrescreve o comportamento de proteção de escrita do sandbox.
- Se presente, o sandbox segue o `.agyignore` em vez do `.gitignore`.
- Isso permite que mantenhamos arquivos como `.astro/` no `.gitignore` (para o Git), mas fora do `.agyignore` (para o Agente).

### Arquivo Padrão:
```ignore
# .agyignore - Claude Code Sandbox Ignore File
# Protege segredos sem bloquear artefatos de build

# 🔒 NUNCA remover do ignore (Proteção de Segredos)
.env
.env.*
*.key
*.pem
*.p12
*.crt

# 📂 Permitir Escrita (NÃO incluir aqui, mas manter no .gitignore)
# .astro/
# dist/
# node_modules/ (geralmente não mexemos, mas sandbox bloqueia se no gitignore)

# 🛠️ Ferramentas Agente
.agent/
.gemini/
```

## 🚀 Automação de Build
Sempre incluir um script de `prebuild` no `package.json` para garantir que o ambiente esteja limpo e pronto para o sandbox:

```json
"scripts": {
  "prebuild": "rm -rf .astro dist",
  "build": "astro build"
}
```

## 📋 Checklist de Diagnóstico de Permissão
Se encontrar erro `EPERM: operation not permitted` durante o build:
1. Verifique se o diretório está listado no `.gitignore`.
2. Verifique se o diretório **NÃO** está listado no `.agyignore`.
3. Garanta que o comando de limpeza (`rm -rf`) foi executado antes do build.
4. No MacOS, limpe arquivos de sistema residuais com `find . -name ".DS_Store" -delete`.

---
*Assinado: NΞØ Agent Architect*
