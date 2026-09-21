.DEFAULT_GOAL := help

RUN_IN_CONTAINER := docker compose run --rm --build --quiet-build dev
PORT ?= 3000

.PHONY: help env up down logs dev demo lint typecheck format test check

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

env: .env ## Create .env from .env.example (then set your API key)

.env:
	cp .env.example .env
	@echo "Created .env: set your API key in it."

up: ## Build and start the API in the background (http://localhost:3000)
	docker compose up --build --detach api

down: ## Stop the API
	docker compose down

logs: ## Follow the API logs
	docker compose logs --follow api

dev: ## Start the API in watch mode, reloaded on each change
	docker compose run --rm --build --quiet-build --service-ports dev npm run dev

demo: ## Send an example request to POST /quiz (calls the LLM)
	curl --silent --show-error --request POST http://localhost:$(PORT)/quiz \
		--header "Content-Type: application/json" \
		--data '{"subject": "géographie mondiale", "level": "medium", "question_count": 3}'
	@echo

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
