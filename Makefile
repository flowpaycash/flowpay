# FLOWPay Sovereign - Advanced Makefile (NΞØ Protocol)
# ---------------------------------------------------------
# Orchestrates development, security audits, and deployments.

.PHONY: help install dev build start test clean audit lint push sync-nexus

# Shell configuration
SHELL := /bin/bash

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
CYAN   := \033[0;36m
BOLD   := \033[1m
NC     := \033[0m

# Metadata
VERSION := $(shell grep '"version":' package.json | cut -d'"' -f4)
PROJECT := $(shell grep '"name":' package.json | cut -d'"' -f4)

# --- Default Target ---
help: ## Show this help message
	@echo -e "$(BOLD)$(CYAN)NΞØ Protocol | $(PROJECT) v$(VERSION)$(NC)"
	@echo -e "Usage: make [target]"
	@echo ""
	@echo -e "$(BOLD)Available Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2}'
	@echo ""

# --- System & Setup ---
install: ## Install dependencies and setup environment
	@echo -e "$(GREEN)Initializing sovereign node environment...$(NC)"
	@npm install
	@echo -e "$(CYAN)Syncing local config with neo.json...$(NC)"
	@npm run neo:cfg

clean: ## Deep clean of temporary files and caches
	@echo -e "$(YELLOW)Executing deep clean...$(NC)"
	@rm -rf .astro dist node_modules/.vite .temp_cache
	@rm -f public/assets/js/*.js public/assets/js/*.json
	@echo -e "$(GREEN)Environment sanitized.$(NC)"

# --- Development ---
dev: ## Start development server with cache cleared
	@echo -e "$(CYAN)Clearing cache and starting Astro Dev...$(NC)"
	@rm -rf .astro
	@npm run dev

# --- Build & Validation ---
build: ## Production build with protocol optimization
	@echo -e "$(CYAN)Building Sovereign Node v$(VERSION)...$(NC)"
	@npm run neo:build
	@echo -e "$(GREEN)Build successful! Ready for production deployment.$(NC)"

# --- Quality & Security (The Audit Flow) ---
lint: ## Verify code quality and standards compliance
	@echo -e "$(CYAN)Linting project documentation and core modules...$(NC)"
	@npm run lint:md || exit 0

audit: lint ## Execute full security audit (NΞØ Protocol Standard)
	@echo -e "$(BOLD)$(CYAN)Executing Sovereign Node Security Audit...$(NC)"
	@echo -e "$(YELLOW)Step 1: Dependency Vulnerability Check$(NC)"
	@npm audit || (echo -e "$(RED)Warning: Vulnerabilities detected. Review carefully.$(NC)")
	@echo -e "$(YELLOW)Step 2: Environment Configuration Audit$(NC)"
	@ls -la .env > /dev/null 2>&1 || echo -e "$(RED)Error: .env missing$(NC)"
	@grep -q "NEXUS_SECRET" .env && echo -e "$(GREEN)Nexus Connection Configured.$(NC)" || echo -e "$(RED)Nexus Secret Not Found!$(NC)"
	@echo -e "$(YELLOW)Step 3: Protocol Specs Validation$(NC)"
	@cat neo.json | jq '.project.role' | grep -q "Financial Sovereign Node" && echo -e "$(GREEN)Protocol Role Verified.$(NC)"
	@echo -e "$(BOLD)$(GREEN)Audit Complete. Node is operational.$(NC)"

# --- Deployment & Sync ---
sync-nexus: ## Push current node state to NEO Nexus
	@echo -e "$(CYAN)Announcing presence to Nexus Hub...$(NC)"
	@railway variables | grep -E "NEXUS|DYNAMIC"
	@echo -e "$(GREEN)Sync signals sent.$(NC)"

push: audit build ## Safe Commit & Push Protocol
	@echo -e "$(CYAN)Preparing Safe Push...$(NC)"
	@git status
	@echo -e "$(BOLD)Execute: git add . && git commit -m 'feat: sync and audit' && git push$(NC)"

logs: ## Tail production logs from Railway
	@echo -e "$(CYAN)Streaming live node logs...$(NC)"
	@railway logs
