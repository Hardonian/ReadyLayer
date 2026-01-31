# Worker-Py Service

Python job processing worker with structured logging, retries, dead-letter queue, and graceful shutdown.

## Quick Start

```bash
# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run worker
uv run python -m src.worker
```

## Docker

```bash
# Build and run
docker-compose up worker-py

# Or build manually
docker build -t worker-py .
docker run --env-file .env worker-py
```

## Configuration

All configuration via environment variables (validated by Pydantic):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `WORKER_ID` | No | hostname | Unique worker identifier |
| `POLL_INTERVAL_SECONDS` | No | 5 | Seconds between job polls |
| `JOB_TIMEOUT_SECONDS` | No | 300 | Max seconds per job |
| `MAX_CONCURRENT_JOBS` | No | 3 | Parallel job limit |
| `MAX_RETRIES` | No | 3 | Retry attempts before DLQ |
| `LOG_LEVEL` | No | INFO | DEBUG, INFO, WARNING, ERROR |
| `HEARTBEAT_INTERVAL_SECONDS` | No | 30 | Seconds between heartbeats |

## Job Types

- `ingest.normalize` - CSV/JSON data normalization
- `recon.run` - Data reconciliation workflows
- `anomaly.score` - Anomaly detection scoring
- `eval.run` - Dataset evaluation

## Adding New Handlers

1. Create handler in `src/handlers/{name}.py`
2. Inherit from `BaseHandler`
3. Register in `src/handlers/__init__.py`

```python
from src.handlers.base import BaseHandler

class MyHandler(BaseHandler):
    job_type = "my.job"
    
    def validate_payload(self, payload: dict) -> dict:
        # Return validated/cleaned payload
        return payload
    
    async def execute(self, payload: dict, context: dict) -> dict:
        # Execute job logic
        return {"status": "success", "result": "data"}
```
