.PHONY: up down build logs frontend-backend-down clean

up:
	docker-compose up --build

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

frontend:
	docker-compose exec frontend sh

backend:
	docker-compose exec backend sh

frontend-down:
	docker-compose stop frontend

backend-down:
	docker-compose stop backend

dev:
	docker-compose -f docker-compose.dev.yml up --build

clean:
	docker-compose down -v --remove-orphans

fclean: clean
	docker system prune -af --volumes

help:
	@echo "Available targets:"
	@echo "  up        Build and start all containers (production)"
	@echo "  down      Stop and remove all containers"
	@echo "  build     Build all containers"
	@echo "  logs      Show logs for all services"
	@echo "  frontend  Open a shell in the frontend container"
	@echo "  backend   Open a shell in the backend container"
	@echo "  clean     Remove containers, volumes, and orphans"
	@echo "  fclean    Like clean, but also prune all unused Docker data"
	@echo "  dev       Start development environment (Vite, hot reload)"