.DEFAULT_GOAL := help

PNPM ?= pnpm
DOCKER_COMPOSE ?= docker compose

.PHONY: help install dev start-prod run-docker verify run run-native build start lint fmt format check typecheck \
	test test-coverage e2e e2e-install integration convex-dev convex-codegen ci

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm)
	$(PNPM) install

dev: ## Next.js dev server (native, no Docker)
	$(PNPM) dev:native

start-prod: build ## Production build + next start
	$(PNPM) start

run-docker: ## Dev stack via Docker Compose
	$(PNPM) dev

verify: fmt lint typecheck test e2e ## Full local validation (format, lint, typecheck, unit, e2e)

run-native: dev ## Alias for dev

run: run-docker ## Alias for run-docker

build: ## Production build
	$(PNPM) build

start: start-prod ## Alias for start-prod

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
