.DEFAULT_GOAL := help

PNPM ?= pnpm
DOCKER_COMPOSE ?= docker compose

.PHONY: help install run run-native build start lint fmt format check typecheck \
	test test-coverage e2e e2e-install integration convex-dev convex-codegen ci

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm)
	$(PNPM) install

run: ## Start local dev stack (Docker Compose)
	$(PNPM) dev

run-native: ## Start Next.js dev server without Docker
	$(PNPM) dev:native

build: ## Production build
	$(PNPM) build

start: ## Start production server (run build first)
	$(PNPM) start

lint: ## Lint with Biome
	$(PNPM) lint

fmt: format ## Alias for format

format: ## Format code with Biome
	$(PNPM) format

check: ## Lint + format check with Biome
	$(PNPM) check

typecheck: ## TypeScript check (tsc --noEmit)
	$(PNPM) typecheck

test: ## Unit tests (Vitest)
	$(PNPM) test

test-coverage: ## Unit tests with coverage
	$(PNPM) test:coverage

integration: ## Integration tests in Docker Compose
	$(PNPM) test:integration

e2e-install: ## Install Playwright Chromium browser
	$(PNPM) exec playwright install chromium --with-deps

e2e: ## End-to-end tests (Playwright)
	$(PNPM) test:e2e

convex-dev: ## Sync convex/ to dev deployment (watch + codegen)
	$(PNPM) convex:dev

convex-codegen: ## Regenerate convex/_generated
	$(PNPM) convex:codegen

ci: typecheck lint test ## Run the same checks as CI quality job
