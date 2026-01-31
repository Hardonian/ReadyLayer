# Worker-Py Makefile
# Provides convenient commands for local development

.PHONY: help install start stop test lint format migrate seed smoke docker-build docker-up docker-down

# Default target
help:
	@echo "Available commands:"
	@echo "  make install     - Install dependencies (requires uv)"
	@echo "  make start       - Start the worker locally"
	@echo "  make stop        - Stop the worker (if running in background)"
	@echo "  make test        - Run Python tests"
	@echo "  make lint        - Run ruff and mypy"
	@echo "  make format      - Format code with black"
	@echo "  make migrate     - Apply database migrations"
	@echo "  make seed        - Seed test jobs"
	@echo "  make smoke       - Run smoke test"
	@echo "  make docker-up   - Start worker in Docker"
	@echo "  make docker-down - Stop Docker containers"
	@echo "  make docker-logs - View Docker logs"

# Install dependencies
install:
	@echo "Installing Python dependencies..."
	uv sync
	@echo "✅ Dependencies installed"

# Start worker locally
start:
	@echo "Starting worker..."
	uv run python -m src.worker

# Run tests
test:
	@echo "Running tests..."
	uv run pytest tests/ -v

# Lint code
lint:
	@echo "Running linters..."
	uv run ruff check src/
	uv run mypy src/
	@echo "✅ Linting complete"

# Format code
format:
	@echo "Formatting code..."
	uv run black src/
	uv run ruff format src/
	@echo "✅ Formatting complete"

# Run smoke test
smoke:
	@echo "Running smoke test..."
	uv run python scripts/smoke_test.py

# Docker commands
docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker logs (Ctrl+C to exit)..."
	docker-compose logs -f

docker-build:
	@echo "Building Docker image..."
	docker build -t worker-py:latest .

# Database helpers
migrate:
	@echo "Applying migrations..."
	@echo "⚠️  Run from repo root: npm run db:worker:setup"

seed:
	@echo "Seeding jobs..."
	@echo "⚠️  Run from repo root: npm run db:worker:seed"
