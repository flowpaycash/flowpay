# FLOWPay - Makefile
# Comandos para desenvolvimento, teste e deploy

.PHONY: help install dev build test clean deploy preview lint format

# Variáveis
PROJECT_NAME = flowpaypix
NETLIFY_SITE_ID ?= $(shell cat .netlify/site-id 2>/dev/null || echo "")
NETLIFY_TOKEN ?= $(shell cat .netlify/token 2>/dev/null || echo "")

# Cores para output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando padrão
help: ## Mostra esta ajuda
	@echo "$(GREEN)FLOWPay - Comandos disponíveis:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Instala dependências necessárias
	@echo "$(GREEN)Instalando dependências...$(NC)"
	@echo "$(YELLOW)Instalando dependências do projeto...$(NC)"
	@npm install
	@echo "$(GREEN)Dependências instaladas!$(NC)"
	@echo "$(YELLOW)Nota: Use 'npx netlify' ou 'npm run dev:netlify' para comandos Netlify$(NC)"

dev: ## Inicia servidor de desenvolvimento local
	@echo "$(GREEN)Iniciando servidor de desenvolvimento...$(NC)"
	@if [ -f "astro.config.mjs" ] || [ -f "astro.config.ts" ]; then \
		echo "$(YELLOW)Usando Astro Dev...$(NC)"; \
		npm run dev; \
	elif command -v netlify &> /dev/null; then \
		echo "$(YELLOW)Usando Netlify Dev...$(NC)"; \
		netlify dev --port 8888; \
	elif command -v npx &> /dev/null && [ -f "package.json" ]; then \
		echo "$(YELLOW)Usando Netlify Dev via npx...$(NC)"; \
		npx netlify dev --port 8888; \
	elif command -v http-server &> /dev/null; then \
		echo "$(YELLOW)Usando http-server...$(NC)"; \
		cd public && http-server -p 8000 -o; \
	elif command -v npx &> /dev/null; then \
		echo "$(YELLOW)Usando http-server via npx...$(NC)"; \
		cd public && npx -y http-server -p 8000 -o; \
	else \
		echo "$(YELLOW)Usando servidor Python...$(NC)"; \
		cd public && python3 -m http.server 8000 || python -m SimpleHTTPServer 8000; \
	fi

dev-simple: ## Inicia servidor HTTP simples
	@echo "$(GREEN)Iniciando servidor HTTP simples...$(NC)"
	@cd public && python3 -m http.server 8000 || python -m SimpleHTTPServer 8000

build: ## Prepara arquivos para produção
	@echo "$(GREEN)Preparando build...$(NC)"
	@if [ -f "astro.config.mjs" ] || [ -f "astro.config.ts" ]; then \
		echo "$(YELLOW)Usando Astro Build...$(NC)"; \
		if command -v npm &> /dev/null; then \
			npm run build; \
		else \
			echo "$(RED)Erro: npm não encontrado!$(NC)"; \
			exit 1; \
		fi; \
	else \
		if [ ! -d "public" ]; then \
			echo "$(RED)Erro: Pasta 'public' não encontrada!$(NC)"; \
			exit 1; \
		fi; \
		if [ ! -f "public/index.html" ]; then \
			echo "$(YELLOW)Movendo index.html para pasta public...$(NC)"; \
			cp index.html public/; \
		fi; \
		if [ ! -f "public/favicon.ico" ] && [ -f "favicon.ico" ]; then \
			echo "$(YELLOW)Movendo favicon.ico para pasta public...$(NC)"; \
			cp favicon.ico public/; \
		fi; \
		echo "$(GREEN)Build preparado na pasta 'public'$(NC)"; \
	fi

test: ## Executa testes básicos
	@echo "$(GREEN)Executando testes...$(NC)"
	@if [ ! -f "public/index.html" ]; then \
		echo "$(YELLOW)index.html não encontrado em public/, verificando raiz...$(NC)"; \
		if [ -f "index.html" ]; then \
			echo "$(GREEN)index.html encontrado na raiz$(NC)"; \
		else \
			echo "$(RED)Erro: index.html não encontrado!$(NC)"; \
			exit 1; \
		fi; \
	fi
	@if [ ! -f "public/css/styles.css" ]; then \
		echo "$(YELLOW)styles.css não encontrado em public/css/$(NC)"; \
		if [ -f "css/styles.css" ]; then \
			echo "$(GREEN)styles.css encontrado na raiz$(NC)"; \
		else \
			echo "$(RED)Erro: styles.css não encontrado!$(NC)"; \
			exit 1; \
		fi; \
	fi
	@echo "$(GREEN)Testes básicos passaram!$(NC)"

lint: ## Verifica qualidade do código
	@echo "$(GREEN)Verificando qualidade do código...$(NC)"
	@if [ -f "public/index.html" ]; then \
		echo "$(YELLOW)Verificando HTML...$(NC)"; \
		if command -v htmlhint &> /dev/null; then \
			htmlhint public/index.html; \
		else \
			echo "$(YELLOW)htmlhint não instalado. Instale com: npm install -g htmlhint$(NC)"; \
		fi; \
	fi
	@if [ -f "public/css/styles.css" ]; then \
		echo "$(YELLOW)Verificando CSS...$(NC)"; \
		if command -v stylelint &> /dev/null; then \
			stylelint public/css/styles.css; \
		else \
			echo "$(YELLOW)stylelint não instalado. Instale com: npm install -g stylelint$(NC)"; \
		fi; \
	fi

format: ## Formata código (se ferramentas disponíveis)
	@echo "$(GREEN)Formatando código...$(NC)"
	@if command -v prettier &> /dev/null; then \
		echo "$(YELLOW)Formatando com Prettier...$(NC)"; \
		prettier --write "public/**/*.{html,css,js}"; \
	else \
		echo "$(YELLOW)Prettier não instalado. Instale com: npm install -g prettier$(NC)"; \
	fi

clean: ## Remove arquivos temporários
	@echo "$(GREEN)Limpando arquivos temporários...$(NC)"
	@find . -name "*.tmp" -delete
	@find . -name "*.log" -delete
	@find . -name ".DS_Store" -delete
	@echo "$(GREEN)Limpeza concluída!$(NC)"

deploy: ## Faz deploy para produção no Netlify
	@echo "$(GREEN)Fazendo deploy para produção...$(NC)"
	@if [ -z "$(NETLIFY_SITE_ID)" ]; then \
		echo "$(RED)Erro: NETLIFY_SITE_ID não configurado!$(NC)"; \
		echo "$(YELLOW)Configure em .netlify/site-id ou use: make deploy-setup$(NC)"; \
		exit 1; \
	fi
	@if [ -z "$(NETLIFY_TOKEN)" ]; then \
		echo "$(RED)Erro: NETLIFY_TOKEN não configurado!$(NC)"; \
		echo "$(YELLOW)Configure em .netlify/token ou use: make deploy-setup$(NC)"; \
		exit 1; \
	fi
	@if command -v npx &> /dev/null; then \
		npx netlify deploy --prod --dir=dist --site=$(NETLIFY_SITE_ID); \
	elif [ -f "node_modules/.bin/netlify" ]; then \
		./node_modules/.bin/netlify deploy --prod --dir=dist --site=$(NETLIFY_SITE_ID); \
	else \
		echo "$(RED)Erro: Netlify CLI não encontrado!$(NC)"; \
		echo "$(YELLOW)Instale dependências com: npm install$(NC)"; \
		exit 1; \
	fi

deploy-setup: ## Configura credenciais do Netlify para deploy
	@echo "$(GREEN)Configurando credenciais do Netlify...$(NC)"
	@mkdir -p .netlify
	@if command -v npx &> /dev/null; then \
		npx netlify login; \
		echo "$(YELLOW)Criando site no Netlify...$(NC)"; \
		npx netlify sites:create --name $(PROJECT_NAME); \
		echo "$(YELLOW)Vinculando projeto ao site...$(NC)"; \
		npx netlify link --name $(PROJECT_NAME); \
	elif [ -f "node_modules/.bin/netlify" ]; then \
		./node_modules/.bin/netlify login; \
		echo "$(YELLOW)Criando site no Netlify...$(NC)"; \
		./node_modules/.bin/netlify sites:create --name $(PROJECT_NAME); \
		echo "$(YELLOW)Vinculando projeto ao site...$(NC)"; \
		./node_modules/.bin/netlify link --name $(PROJECT_NAME); \
	else \
		echo "$(RED)Erro: Netlify CLI não encontrado!$(NC)"; \
		echo "$(YELLOW)Instale dependências com: npm install$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Configuração concluída!$(NC)"

preview: ## Cria preview do deploy
	@echo "$(GREEN)Criando preview...$(NC)"
	@if command -v npx &> /dev/null; then \
		npx netlify deploy --dir=dist; \
	elif [ -f "node_modules/.bin/netlify" ]; then \
		./node_modules/.bin/netlify deploy --dir=dist; \
	else \
		echo "$(RED)Erro: Netlify CLI não encontrado!$(NC)"; \
		echo "$(YELLOW)Instale dependências com: npm install$(NC)"; \
		exit 1; \
	fi

status: ## Mostra status do projeto
	@echo "$(GREEN)Status do projeto:$(NC)"
	@echo "$(YELLOW)Arquivos principais:$(NC)"
	@ls -la public/ 2>/dev/null || echo "$(RED)Pasta 'public' não encontrada$(NC)"
	@echo ""
	@echo "$(YELLOW)Configuração Netlify:$(NC)"
	@if [ -f ".netlify/site-id" ]; then \
		echo "Site ID: $(shell cat .netlify/site-id)"; \
	else \
		echo "$(RED)Site ID não configurado$(NC)"; \
	fi
	@if [ -f ".netlify/token" ]; then \
		echo "Token: $(shell cat .netlify/token | cut -c1-10)..."; \
	else \
		echo "$(RED)Token não configurado$(NC)"; \
	fi

validate: ## Valida configuração do projeto
	@echo "$(GREEN)Validando configuração...$(NC)"
	@make test
	@make lint
	@if [ -f "netlify.toml" ]; then \
		echo "$(GREEN)netlify.toml encontrado$(NC)"; \
	else \
		echo "$(YELLOW)netlify.toml não encontrado$(NC)"; \
	fi
	@if [ -f ".netlify/functions/env.js" ]; then \
		echo "$(GREEN)Função Netlify encontrada$(NC)"; \
	else \
		echo "$(YELLOW)Função Netlify não encontrada$(NC)"; \
	fi
	@echo "$(GREEN)Validação concluída!$(NC)"

setup: ## Configuração inicial completa do projeto
	@echo "$(GREEN)Configuração inicial do FLOWPay...$(NC)"
	@make install
	@make organize
	@make build
	@make test
	@make validate
	@echo "$(GREEN)Configuração inicial concluída!$(NC)"
	@echo "$(YELLOW)Próximos passos:$(NC)"
	@echo "  1. make dev          - Iniciar desenvolvimento"
	@echo "  2. make deploy-setup - Configurar deploy"
	@echo "  3. make deploy       - Fazer deploy"

# Comandos de desenvolvimento rápido
watch: ## Observa mudanças e recarrega automaticamente
	@echo "$(GREEN)Observando mudanças...$(NC)"
	@if command -v fswatch &> /dev/null; then \
		fswatch -o public/ | xargs -n1 -I{} echo "Mudança detectada: {}"; \
	else \
		echo "$(YELLOW)fswatch não instalado. Use 'make dev' para desenvolvimento manual$(NC)"; \
	fi

# Comandos de utilitário
install-woovi: ## Instala dependências para integração Woovi
	@echo "$(GREEN)Instalando dependências Woovi...$(NC)"
	@npm install
	@echo "$(GREEN)Dependências instaladas!$(NC)"

dev-woovi: ## Inicia servidor com funções Netlify
	@echo "$(GREEN)Iniciando servidor Netlify com funções...$(NC)"
	@if command -v npx &> /dev/null; then \
		npx netlify dev; \
	elif [ -f "node_modules/.bin/netlify" ]; then \
		./node_modules/.bin/netlify dev; \
	else \
		echo "$(RED)Erro: Netlify CLI não encontrado!$(NC)"; \
		echo "$(YELLOW)Instale dependências com: npm install$(NC)"; \
		exit 1; \
	fi

test-woovi: ## Testa integração Woovi
	@echo "$(GREEN)Testando integração Woovi...$(NC)"
	@if [ ! -f ".env" ]; then \
		echo "$(YELLOW)Criando arquivo .env de exemplo...$(NC)"; \
		echo "WOOVI_API_KEY=sua_api_key_aqui" > .env; \
		echo "WOOVI_API_URL=https://api.woovi.com" >> .env; \
		echo "WOOVI_WEBHOOK_SECRET=seu_webhook_secret_aqui" >> .env; \
		echo "NETLIFY_URL=https://seu-site.netlify.app" >> .env; \
	fi
	@echo "$(GREEN)Arquivo .env configurado!$(NC)"
	@echo "$(YELLOW)Configure suas credenciais Woovi no arquivo .env$(NC)"
	@echo "$(GREEN)URLs de teste:$(NC)"
	@echo "  🌐 Checkout: http://localhost:8888/checkout"
	@echo "  🔒 CSP Test: http://localhost:8888/csp-test.html"

deploy-woovi: ## Deploy com funções Netlify
	@echo "$(GREEN)Fazendo deploy com funções Woovi...$(NC)"
	@make build
	@if command -v npx &> /dev/null; then \
		npx netlify deploy --prod; \
	elif [ -f "node_modules/.bin/netlify" ]; then \
		./node_modules/.bin/netlify deploy --prod; \
	else \
		echo "$(RED)Erro: Netlify CLI não encontrado!$(NC)"; \
		echo "$(YELLOW)Instale dependências com: npm install$(NC)"; \
		exit 1; \
	fi

organize: ## Organiza estrutura do projeto movendo arquivos para public/
	@echo "$(GREEN)Organizando estrutura do projeto...$(NC)"
	@if [ -f "index.html" ] && [ ! -f "public/index.html" ]; then \
		echo "$(YELLOW)Movendo index.html para public/$(NC)"; \
		cp index.html public/; \
	fi
	@if [ -f "favicon.ico" ] && [ ! -f "public/favicon.ico" ]; then \
		echo "$(YELLOW)Movendo favicon.ico para public/$(NC)"; \
		cp favicon.ico public/; \
	fi
	@if [ -d "css" ] && [ ! -d "public/css" ]; then \
		echo "$(YELLOW)Movendo pasta css para public/$(NC)"; \
		cp -r css public/; \
	fi
	@if [ -d "img" ] && [ ! -d "public/img" ]; then \
		echo "$(YELLOW)Movendo pasta img para public/$(NC)"; \
		cp -r img public/; \
	fi
	@echo "$(GREEN)Estrutura organizada!$(NC)"

backup: ## Cria backup do projeto
	@echo "$(GREEN)Criando backup...$(NC)"
	@tar -czf $(PROJECT_NAME)_backup_$(shell date +%Y%m%d_%H%M%S).tar.gz public/ netlify.toml README.md DEPLOY_GUIDE.md
	@echo "$(GREEN)Backup criado!$(NC)"

info: ## Mostra informações do sistema
	@echo "$(GREEN)Informações do sistema:$(NC)"
	@echo "OS: $(shell uname -s)"
	@echo "Node: $(shell node --version 2>/dev/null || echo 'Não instalado')"
	@echo "NPM: $(shell npm --version 2>/dev/null || echo 'Não instalado')"
	@echo "Netlify CLI: $(shell netlify --version 2>/dev/null || echo 'Não instalado')"
	@echo "Git: $(shell git --version 2>/dev/null || echo 'Não instalado')"
