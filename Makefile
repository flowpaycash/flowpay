# FlowPay - Makefile v2
# ────────────────────────────────────────────────────

.DEFAULT_GOAL := help

.PHONY: \
	help install clean clean-all \
	dev start preview \
	check build rebuild \
	test test-unit test-db \
	lint lint-soft \
	env-check audit audit-soft ci \
	status db-reset logs \
	pwa-gen pwa-sync \
	tunnel-neo-agent tunnel-flowpay tunnel-nexus tunnel-neobot tunnel-status

SHELL := /bin/bash
MAKEFLAGS += --no-builtin-rules

GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
CYAN   := \033[0;36m
BOLD   := \033[1m
NC     := \033[0m

VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
ENV_FILE ?= .env
REQUIRED_ENV ?= ADMIN_PASSWORD
OPTIONAL_ENV ?= OPENPIX_APPID
TUNNEL_DIR ?= /Users/nettomello/neomello/01-neo-protocol-org/neo-tunnel

# ── Help ─────────────────────────────────────────────

help: ## Show available commands
	@echo -e "$(BOLD)$(CYAN)FlowPay v$(VERSION)$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-16s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ── Setup ────────────────────────────────────────────

install: ## Install dependencies
	@echo -e "$(CYAN)Installing dependencies...$(NC)"
	@pnpm install
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
	@pnpm run dev

start: ## Start production server (requires build first)
	@test -f dist/server/entry.mjs || (echo -e "$(RED)No build found. Run 'make build' first.$(NC)" && exit 1)
	@node ./dist/server/entry.mjs

preview: ## Build and serve production preview
	@pnpm run preview

# ── Build & Validation ───────────────────────────────

check: ## Run Astro type-checking
	@echo -e "$(CYAN)Type checking...$(NC)"
	@pnpm exec astro check

build: ## Production build (type-check + build)
	@echo -e "$(CYAN)Building v$(VERSION)...$(NC)"
	@pnpm run build
	@echo -e "$(GREEN)Build complete.$(NC)"

rebuild: clean build ## Clean and build from scratch

# ── Tests ────────────────────────────────────────────

test: ## Run all tests (unit + DB flow)
	@echo -e "$(CYAN)Running all tests...$(NC)"
	@$(MAKE) test-unit
	@$(MAKE) test-db
	@echo -e "$(GREEN)All tests passed.$(NC)"

test-unit: ## Run Jest unit tests
	@echo -e "$(CYAN)Running unit tests...$(NC)"
	@pnpm exec jest --passWithNoTests

test-db: ## Run database flow integration tests
	@echo -e "$(CYAN)Running DB flow tests...$(NC)"
	@node tests/run-tests.js

# ── Quality ──────────────────────────────────────────

lint: ## Strict markdown lint (fails on issues)
	@echo -e "$(CYAN)Linting markdown...$(NC)"
	@pnpm run lint:md

lint-soft: ## Non-blocking markdown lint (local convenience)
	@echo -e "$(CYAN)Linting markdown (soft mode)...$(NC)"
	@pnpm run lint:md 2>/dev/null || echo -e "$(YELLOW)Lint warnings found.$(NC)"

env-check: ## Validate required env vars in .env
	@test -f "$(ENV_FILE)" || (echo -e "$(RED)$(ENV_FILE) missing.$(NC)" && exit 1)
	@missing=0; \
	for key in $(REQUIRED_ENV); do \
		if grep -qE "^$$key=" "$(ENV_FILE)"; then \
			echo -e "  $(GREEN)$$key set$(NC)"; \
		else \
			echo -e "  $(RED)$$key missing$(NC)"; \
			missing=1; \
		fi; \
	done; \
	for key in $(OPTIONAL_ENV); do \
		if grep -qE "^$$key=" "$(ENV_FILE)"; then \
			echo -e "  $(GREEN)$$key set (optional)$(NC)"; \
		else \
			echo -e "  $(YELLOW)$$key missing (optional)$(NC)"; \
		fi; \
	done; \
	test $$missing -eq 0

audit: ## Strict full audit (fails on vulnerabilities/issues)
	@echo -e "$(BOLD)$(CYAN)FlowPay Audit (strict)$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[1/6] Dependencies$(NC)"
	@pnpm audit --audit-level=high
	@echo ""
	@echo -e "$(YELLOW)[2/6] Environment$(NC)"
	@$(MAKE) env-check
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

audit-soft: ## Non-blocking audit for local diagnosis
	@echo -e "$(BOLD)$(CYAN)FlowPay Audit (soft)$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[1/6] Dependencies$(NC)"
	@pnpm audit --audit-level=high || echo -e "$(YELLOW)  Vulnerabilities found (non-blocking).$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[2/6] Environment$(NC)"
	@$(MAKE) env-check || echo -e "$(YELLOW)  Environment issues found (non-blocking).$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[3/6] Lint$(NC)"
	@$(MAKE) lint-soft
	@echo ""
	@echo -e "$(YELLOW)[4/6] Type Check$(NC)"
	@$(MAKE) check || echo -e "$(YELLOW)  Check issues found (non-blocking).$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[5/6] Tests$(NC)"
	@$(MAKE) test || echo -e "$(YELLOW)  Test issues found (non-blocking).$(NC)"
	@echo ""
	@echo -e "$(YELLOW)[6/6] Build$(NC)"
	@$(MAKE) build || echo -e "$(YELLOW)  Build issues found (non-blocking).$(NC)"
	@echo ""
	@echo -e "$(BOLD)$(YELLOW)Soft audit completed.$(NC)"

ci: ## CI pipeline (strict): check + test + build
	@echo -e "$(BOLD)$(CYAN)Running CI pipeline$(NC)"
	@$(MAKE) check
	@$(MAKE) test
	@$(MAKE) build
	@echo -e "$(BOLD)$(GREEN)CI pipeline passed.$(NC)"

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
	@echo -e "  PNPM:    $$(pnpm -v)"
	@test -f dist/server/entry.mjs && echo -e "  Build:   $(GREEN)exists$(NC)" || echo -e "  Build:   $(YELLOW)not built$(NC)"
	@test -f data/flowpay.db && echo -e "  DB:      $(GREEN)$$(du -h data/flowpay.db | cut -f1)$(NC)" || echo -e "  DB:      $(YELLOW)not created$(NC)"
	@test -f "$(ENV_FILE)" && echo -e "  $(ENV_FILE): $(GREEN)present$(NC)" || echo -e "  $(ENV_FILE): $(RED)missing$(NC)"
	@echo ""

# ── PWA Assets ───────────────────────────────────────

pwa-gen: ## Generate PWA icons and splash screens from SVG
	@echo -e "$(CYAN)Generating PWA assets...$(NC)"
	@npx pwa-asset-generator assets/pwa/favicon.svg assets/pwa/ \
		-m assets/pwa/site.webmanifest \
		--index assets/pwa/splash-tags.html \
		--opaque false --icon-only false
	@echo -e "$(GREEN)Generation complete.$(NC)"

pwa-sync: ## Sync generated PWA assets to public directory
	@echo -e "$(CYAN)Syncing PWA assets to public...$(NC)"
	@mkdir -p public/assets/splash public/assets/icons public/assets/manifest
	@rm -rf public/assets/splash/*
	@cp assets/pwa/apple-splash-* public/assets/splash/
	@cp assets/pwa/apple-icon-180.png public/assets/icons/
	@cp assets/pwa/manifest-icon-*.png public/assets/manifest/
	@cp assets/pwa/favicon-96x96.png public/assets/icons/
	@cp assets/pwa/web-app-manifest-*.png public/assets/icons/
	@cp assets/pwa/favicon.ico public/favicon.ico
	@cp assets/pwa/favicon.svg public/favicon.svg
	@echo -e "$(GREEN)Sync complete.$(NC)"

 # ── Deployment ───────────────────────────────────────

logs: ## Tail production logs from Railway
	@command -v railway >/dev/null 2>&1 || (echo -e "$(RED)Railway CLI not found.$(NC)" && exit 1)
	@railway logs

# ── Tunnel Operations ────────────────────────────────

tunnel-neo-agent: ## Start tunnel for neo-agent
	@test -d "$(TUNNEL_DIR)" || (echo -e "$(RED)TUNNEL_DIR not found: $(TUNNEL_DIR)$(NC)" && exit 1)
	@cd "$(TUNNEL_DIR)" && $(MAKE) client-neo-agent

tunnel-flowpay: ## Start tunnel for flowpay
	@test -d "$(TUNNEL_DIR)" || (echo -e "$(RED)TUNNEL_DIR not found: $(TUNNEL_DIR)$(NC)" && exit 1)
	@cd "$(TUNNEL_DIR)" && $(MAKE) client-flowpay

tunnel-nexus: ## Start tunnel for nexus
	@test -d "$(TUNNEL_DIR)" || (echo -e "$(RED)TUNNEL_DIR not found: $(TUNNEL_DIR)$(NC)" && exit 1)
	@cd "$(TUNNEL_DIR)" && $(MAKE) client-nexus

tunnel-neobot: ## Start tunnel for neobot
	@test -d "$(TUNNEL_DIR)" || (echo -e "$(RED)TUNNEL_DIR not found: $(TUNNEL_DIR)$(NC)" && exit 1)
	@cd "$(TUNNEL_DIR)" && $(MAKE) client-neobot

tunnel-status: ## Check tunnel server status
	@test -d "$(TUNNEL_DIR)" || (echo -e "$(RED)TUNNEL_DIR not found: $(TUNNEL_DIR)$(NC)" && exit 1)
	@cd "$(TUNNEL_DIR)" && $(MAKE) status
