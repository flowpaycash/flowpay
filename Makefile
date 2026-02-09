# FLOWPay - Makefile
# Comandos para desenvolvimento, teste e deploy no Railway (Astro SSR)

.PHONY: help install dev build start test clean deploy lint format logs

# Variáveis
PROJECT_NAME = flowpaypix

# Cores para output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando padrão
help: ## Mostra esta ajuda
	@echo "$(GREEN)FLOWPay (Astro + Railway) - Comandos disponíveis:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Instala dependências do projeto
	@echo "$(GREEN)Instalando dependências...$(NC)"
	@npm install
	@echo "$(GREEN)Dependências instaladas!$(NC)"

dev: ## Inicia servidor de desenvolvimento (Astro)
	@echo "$(GREEN)Limpando .astro para evitar conflitos...$(NC)"
	@rm -rf .astro
	@echo "$(GREEN)Iniciando servidor de desenvolvimento...$(NC)"
	@npm run dev

build: ## Executa o build de produção (SSR)
	@echo "$(GREEN)Limpando .astro para evitar conflitos...$(NC)"
	@rm -rf .astro
	@echo "$(GREEN)Executando build do Astro...$(NC)"
	@npm run build
	@echo "$(GREEN)Build concluído em dist/$(NC)"

start: ## Inicia o servidor de produção (Node Standalone)
	@echo "$(GREEN)Iniciando servidor de produção...$(NC)"
	@npm run start

test: ## Executa testes (Jest)
	@echo "$(GREEN)Executando testes...$(NC)"
	@npm test

clean: ## Remove arquivos temporários e de build
	@echo "$(GREEN)Limpando arquivos gerados...$(NC)"
	@rm -rf dist
	@rm -rf .astro
	@rm -rf node_modules/.vite
	@echo "$(GREEN)Limpeza concluída!$(NC)"

lint: ## Verifica qualidade do código (Markdown)
	@echo "$(GREEN)Verificando lint...$(NC)"
	@npm run lint:md

deploy: ## Instruções de deploy (Railway)
	@echo "$(GREEN)Para fazer deploy no Railway:$(NC)"
	@echo "1. Commit e push para a branch main: $(YELLOW)git push origin main$(NC)"
	@echo "2. O Railway detectará as mudanças e iniciará o deploy automaticamente."

logs: ## Mostra logs de produção (via Railway CLI)
	@echo "$(GREEN)Buscando logs do Railway...$(NC)"
	@railway logs
