# Voir-Dire Backend Makefile

.PHONY: help build up down logs test test-unit test-cov test-api migrate clean install-dev

help:
	@echo "Voir-Dire Backend Commands"
	@echo ""
	@echo "  make build       Build all Docker images"
	@echo "  make up          Start all services"
	@echo "  make down        Stop all services"
	@echo "  make logs        View logs from all services"
	@echo "  make test        Run all tests (unit + API)"
	@echo "  make test-unit   Run unit tests only"
	@echo "  make test-cov    Run tests with coverage report"
	@echo "  make test-api    Run API integration tests"
	@echo "  make migrate     Run database migrations"
	@echo "  make clean       Remove containers and volumes"
	@echo "  make install-dev Install development dependencies"
	@echo ""

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# Install dev/test dependencies
install-dev:
	pip install -r requirements-common.txt -r requirements-test.txt

# Run all unit tests
test-unit:
	pytest tests/ -v

# Run tests with coverage
test-cov:
	pytest tests/ -v --cov=services --cov=gateway --cov=shared --cov-report=term-missing --cov-report=html

# Run API integration tests (requires services running)
test-api:
	python scripts/test_api.py

# Run all tests
test: test-unit

migrate:
	docker compose exec session alembic upgrade head

clean:
	docker compose down -v --remove-orphans
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name htmlcov -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name .coverage -delete 2>/dev/null || true

# Development commands - run individual services locally
dev-session:
	cd services/session && uvicorn app.main:app --reload --port 8004

dev-juror:
	cd services/juror && uvicorn app.main:app --reload --port 8003

dev-audio:
	cd services/audio && uvicorn app.main:app --reload --port 8001

dev-transcription:
	cd services/transcription && uvicorn app.main:app --reload --port 8002

dev-gateway:
	cd gateway && uvicorn app.main:app --reload --port 8000

# Lint and format
lint:
	ruff check services/ gateway/ shared/ tests/

format:
	ruff format services/ gateway/ shared/ tests/

