.DEFAULT_GOAL := help

# Every command runs in the dev container: only Docker and Make are required
DEV := docker compose run --rm --build --quiet-build dev

.PHONY: help lint typecheck format test check

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

lint: ## Run ESLint
	$(DEV) npm run lint

typecheck: ## Check TypeScript types
	$(DEV) npm run typecheck

format: ## Format files with Prettier
	$(DEV) npm run format

test: ## Run tests
	$(DEV) npm test

check: ## Run lint, typecheck, format check and tests
	$(DEV) npm run check
