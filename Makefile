.PHONY: up down build logs frontend-backend-down clean dev help

# Production commands
up:
	docker-compose up --build

down:
	docker-compose down

build:
	docker-compose build

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up --build

dev-down:
	docker-compose -f docker-compose.dev.yml down

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
	@echo "🚀 Available targets:"
	@echo ""
	@echo "📦 Production:"
	@echo "  up         Build and start all containers (production)"
	@echo "  down       Stop and remove all containers"
	@echo "  build      Build all containers"
	@echo ""
	@echo "🛠️  Development:"
	@echo "  dev        Start development environment (Vite, hot reload)"
	@echo "  dev-down   Stop development environment"
	@echo ""
	@echo "📋 Monitoring:"
	@echo "  logs       Show logs for all services (production)"
	@echo "  logs-dev   Show logs for all services (development)"
	@echo ""
	@echo "🔧 Utilities:"
	@echo "  frontend   Open a shell in the frontend container (production)"
	@echo "  backend    Open a shell in the backend container (production)"
	@echo "  frontend-dev  Open a shell in the frontend container (development)"
	@echo "  backend-dev   Open a shell in the backend container (development)"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean      Remove containers, volumes, and orphans"
	@echo "  clean-dev  Remove development containers, volumes, and orphans"
	@echo "  fclean     Like clean, but also prune all unused Docker data"
	@echo ""
	@echo "💡 Quick start:"
	@echo "  make dev   # Start development environment"