# RackPilot DCIM — common tasks
# Usage: make <target>

COMPOSE_DEV  := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml --env-file .env.production

.PHONY: help dev prod seed test backup down prod-down logs

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	 awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev:  ## Start the development stack (hot reload) on :3000 / :8000
	$(COMPOSE_DEV) up -d --build

prod:  ## Build and start the production stack (nginx entry on $$APP_PORT)
	$(COMPOSE_PROD) up -d --build

seed:  ## Apply migrations and load demo seed data (dev stack)
	$(COMPOSE_DEV) exec backend alembic upgrade head
	$(COMPOSE_DEV) exec backend python seed.py

test:  ## Run the backend test suite (needs postgres up)
	$(COMPOSE_DEV) exec backend pytest -q

backup:  ## Dump the dev postgres database to ./backups/
	@mkdir -p backups
	$(COMPOSE_DEV) exec -T db pg_dump -U $${POSTGRES_USER:-rackpilot} \
	  $${POSTGRES_DB:-rackpilot} | gzip > backups/db-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup written to backups/"

logs:  ## Tail logs from the dev stack
	$(COMPOSE_DEV) logs -f

down:  ## Stop the development stack
	$(COMPOSE_DEV) down

prod-down:  ## Stop the production stack
	$(COMPOSE_PROD) down
