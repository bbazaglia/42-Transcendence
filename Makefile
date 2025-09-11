.PHONY: up down build logs frontend-backend-down clean dev help setup-check

# Check if database exists (for setup detection)
DB_EXISTS := $(shell docker volume ls -q | grep -q "42-transcendence_db_data" && echo "true" || echo "false")

# Production commands
up:
	docker-compose up --build

down:
	docker-compose down

build:
	docker-compose build

# Development commands
dev: setup-check
	docker-compose -f docker-compose.dev.yml up --build

dev-down:
	docker-compose -f docker-compose.dev.yml down

# Setup check - runs migrations if needed
setup-check:
	@echo "🔍 Checking if database setup is needed..."
	@if [ "$(DB_EXISTS)" = "false" ]; then \
		echo "First time setup detected - running database migrations..."; \
		docker-compose -f docker-compose.dev.yml up -d backend; \
		sleep 5; \
		docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name init --schema=src/schemas/schema.prisma; \
		echo "Database setup complete!"; \
	else \
		echo "Database already exists - skipping setup"; \
	fi

# Utility commands
logs:
	docker-compose logs -f

logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f

frontend:
	docker-compose exec frontend sh

backend:
	docker-compose exec backend sh

frontend-dev:
	docker-compose -f docker-compose.dev.yml exec frontend sh

backend-dev:
	docker-compose -f docker-compose.dev.yml exec backend sh

# Database management commands
db-migrate:
	@echo "Running database migrations..."
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --schema=src/schemas/schema.prisma

db-reset:
	@echo "Resetting database..."
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate reset --schema=src/schemas/schema.prisma

db-studio:
	@echo "Opening Prisma Studio..."
	docker-compose -f docker-compose.dev.yml exec backend npx prisma studio --schema=src/schemas/schema.prisma

db-status:
	@echo "Checking database status..."
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate status --schema=src/schemas/schema.prisma

frontend-down:
	docker-compose stop frontend

backend-down:
	docker-compose stop backend

# Cleanup commands
clean:
	docker-compose down -v --remove-orphans

clean-dev:
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans

fclean: clean
	docker system prune -af --volumes

# Help
help:
	@echo " Available targets:"
	@echo ""
	@echo "Production:"
	@echo "  up         Build and start all containers (production)"
	@echo "  down       Stop and remove all containers"
	@echo "  build      Build all containers"
	@echo ""
	@echo "Development:"
	@echo "  dev        Start development environment (auto-setup database)"
	@echo "  dev-down   Stop development environment"
	@echo ""
	@echo "Database:"
	@echo "  db-migrate Run database migrations"
	@echo "  db-reset   Reset database (⚠️  deletes all data)"
	@echo "  db-studio  Open Prisma Studio (database GUI)"
	@echo "  db-status  Check database migration status"
	@echo ""
	@echo "Monitoring:"
	@echo "  logs       Show logs for all services (production)"
	@echo "  logs-dev   Show logs for all services (development)"
	@echo ""
	@echo "Utilities:"
	@echo "  frontend   Open a shell in the frontend container (production)"
	@echo "  backend    Open a shell in the backend container (production)"
	@echo "  frontend-dev  Open a shell in the frontend container (development)"
	@echo "  backend-dev   Open a shell in the backend container (development)"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean      Remove containers, volumes, and orphans"
	@echo "  clean-dev  Remove development containers, volumes, and orphans"
	@echo "  fclean     Like clean, but also prune all unused Docker data"
	@echo ""
	@echo "Quick start:"
	@echo "  make dev   # Start development environment (auto-setup)"