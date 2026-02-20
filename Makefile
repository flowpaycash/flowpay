# FlowPay - Makefile
# ────────────────────────────────────────────────────

.PHONY: help install dev build start clean test test-unit test-db audit lint check status db-reset logs

SHELL := /bin/bash

GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
CYAN   := \033[0;36m
BOLD   := \033[1m
NC     := \033[0m

VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")

# ── Help ─────────────────────────────────────────────

help: ## Show available commands
	@echo -e "$(BOLD)$(CYAN)FlowPay v$(VERSION)$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-16s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ── Setup ────────────────────────────────────────────

install: ## Install dependencies
	@echo -e "$(CYAN)Installing dependencies...$(NC)"
	@npm install
	@echo -e "$(GREEN)Done.$(NC)"

clean: ## Remove build artifacts and caches
	@echo -e "$(YELLOW)Cleaning...$(NC)"
	@rm -rf .astro dist node_modules/.vite
	@echo -e "$(GREEN)Clean.$(NC)"

clean-all: clean ## Full clean including node_modules
	@rm -rf node_modules
	@echo -e "$(GREEN)Full clean done. Run 'make install' to restore.$(NC)"

# ── Development ──────────────────────────────────────

dev: ## Start dev server (clears cache first)
	@rm -rf .astro
	@npm run dev

start: ## Start production server (requires build first)
	@test -f dist/server/entry.mjs || (echo -e "$(RED)No build found. Run 'make build' first.$(NC)" && exit 1)
	@node ./dist/server/entry.mjs

# ── Build & Validation ───────────────────────────────

check: ## Run Astro type-checking
	@echo -e "$(CYAN)Type checking...$(NC)"
	@npx astro check

build: clean ## Production build (type-check + build)
	@echo -e "$(CYAN)Building v$(VERSION)...$(NC)"
	@npm run build
	@echo -e "$(GREEN)Build complete.$(NC)"

# ── Tests ────────────────────────────────────────────

test: ## Run all tests (unit + DB flow)
	@echo -e "$(CYAN)Running all tests...$(NC)"
	@$(MAKE) test-unit
	@$(MAKE) test-db
	@echo -e "$(GREEN)All tests passed.$(NC)"

test-unit: ## Run Jest unit tests
	@echo -e "$(CYAN)Running unit tests...$(NC)"
	@npx jest --passWithNoTests

test-db: ## Run database flow integration tests
	@echo -e "$(CYAN)Running DB flow tests...$(NC)"
	@node tests/run-tests.js

# ── Quality ──────────────────────────────────────────

lint: ## Lint markdown files
	@npm run lint:md 2>/dev/null || true

audit: ## Full project audit (lint + check + build + tests)
	@echo -e "$(BOLD)$(CYAN)FlowPay Audit$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[1/6] Dependencies$(NC)"
	@npm audit --audit-level=high 2>/dev/null || echo -e "$(YELLOW)  Warnings found (review above)$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[2/6] Environment$(NC)"
	@test -f .env && echo -e "  $(GREEN).env exists$(NC)" || echo -e "  $(RED).env missing!$(NC)"
	@(grep -q "OPENPIX_APPID" .env 2>/dev/null && echo -e "  $(GREEN)OPENPIX_APPID set$(NC)") || echo -e "  $(RED)OPENPIX_APPID missing$(NC)"
	@(grep -q "ADMIN_PASSWORD" .env 2>/dev/null && echo -e "  $(GREEN)ADMIN_PASSWORD set$(NC)") || echo -e "  $(RED)ADMIN_PASSWORD missing$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[3/6] Lint$(NC)"
	@$(MAKE) lint
	@echo ""
	@echo -e "$(YELLOW)[4/6] Type Check$(NC)"
	@$(MAKE) check
	@echo ""
	@echo -e "$(YELLOW)[5/6] Tests$(NC)"
	@$(MAKE) test
	@echo ""
	@echo -e "$(YELLOW)[6/6] Build$(NC)"
	@$(MAKE) build
	@echo ""
	@echo -e "$(BOLD)$(GREEN)Audit passed. Ready for deployment.$(NC)"

# ── Database ─────────────────────────────────────────

db-reset: ## Reset local SQLite database (WARNING: destroys data)
	@echo -e "$(RED)This will delete the local database. Press Ctrl+C to cancel.$(NC)"
	@sleep 2
	@rm -f data/flowpay.db data/flowpay.db-wal data/flowpay.db-shm
	@echo -e "$(GREEN)Database removed. It will be recreated on next server start.$(NC)"

status: ## Show project status overview
	@echo -e "$(BOLD)$(CYAN)FlowPay v$(VERSION) — Status$(NC)"
	@echo ""
	@echo -e "  Node:    $$(node -v)"
	@echo -e "  NPM:     $$(npm -v)"
	@test -f dist/server/entry.mjs && echo -e "  Build:   $(GREEN)exists$(NC)" || echo -e "  Build:   $(YELLOW)not built$(NC)"
	@test -f data/flowpay.db && echo -e "  DB:      $(GREEN)$$(du -h data/flowpay.db | cut -f1)$(NC)" || echo -e "  DB:      $(YELLOW)not created$(NC)"
	@test -f .env && echo -e "  .env:    $(GREEN)present$(NC)" || echo -e "  .env:    $(RED)missing$(NC)"
	@echo ""

# ── Deployment ───────────────────────────────────────

logs: ## Tail production logs from Railway
	@railway logs

# --- TUNNEL OPERATIONS -------------------------------------------------------

TUNNEL_DIR := /Users/nettomello/neomello/01-neo-protocol-org/neo-tunnel

tunnel-neo-agent: ## Start tunnel for neo-agent
	@cd $(TUNNEL_DIR) && $(MAKE) client-neo-agent

tunnel-flowpay: ## Start tunnel for flowpay
	@cd $(TUNNEL_DIR) && $(MAKE) client-flowpay

tunnel-nexus: ## Start tunnel for nexus
	@cd $(TUNNEL_DIR) && $(MAKE) client-nexus

tunnel-neobot: ## Start tunnel for neobot
	@cd $(TUNNEL_DIR) && $(MAKE) client-neobot

tunnel-status: ## Check tunnel server status
	@cd $(TUNNEL_DIR) && $(MAKE) status
