.DEFAULT_GOAL := help

RUN_IN_CONTAINER := docker compose run --rm --build --quiet-build dev

.PHONY: help env lint typecheck format test check

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

env: .env ## Create .env from .env.example (then set your API key)

.env:
	cp .env.example .env
	@echo "Created .env: set your API key in it."

lint: ## Run ESLint
	$(RUN_IN_CONTAINER) npm run lint

typecheck: ## Check TypeScript types
	$(RUN_IN_CONTAINER) npm run typecheck

format: ## Format files with Prettier
	$(RUN_IN_CONTAINER) npm run format

test: ## Run tests
	$(RUN_IN_CONTAINER) npm test

check: ## Run lint, typecheck, format check and tests
	$(RUN_IN_CONTAINER) npm run check
