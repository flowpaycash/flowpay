<!-- zshrc rules -->

## Padrões para .zshrc

> **⚠️ IMPORTANTE**: Nunca versionar API keys ou secrets no .zshrc!
> Use arquivo separado `~/.zshrc.secrets` (não versionado).

### Estrutura Recomendada

```bash
# 1. Homebrew

eval "$(/opt/homebrew/bin/brew shellenv)"

# 2. Gerenciadores de versão (nvm, pyenv, etc)

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Aliases úteis

alias python="python3"
alias ll="ls -la"

# 4. Paths customizados

export PATH="$PATH:/caminho/customizado"

# 5. Configurações de ferramentas

export OLLAMA_MODELS=/Users/nettomello/ollama
```

### Boas Práticas

- **Comentários**: Sempre comente seções importantes
- **Organização**: Agrupe por categoria (brew, nvm, aliases, paths)
- **Versionamento**: Mantenha backup do .zshrc
- **Aliases**: Use nomes descritivos e curtos
- **Paths**: Adicione paths customizados no final

### Aliases Úteis para Dev

```bash
# Navegação

alias dev='cd ~/CODIGOS/neo-dev'
alias projects='cd ~/CODIGOS/neo-dev/projects'

# Git

alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'

# Docker

alias dcu='docker-compose up'
alias dcd='docker-compose down'
```

### Funções Úteis

```bash
# Função para abrir projeto no Scalar

scalar-api() {
  cd ~/CODIGOS/neo-dev/projects/scalar-api-starter
  npm run "$@"
}
```
