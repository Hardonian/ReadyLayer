# Worker-Py Service

Python job processing worker with structured logging, retries, dead-letter queue, and graceful shutdown.

## Quick Start

```bash
# Navigate to service
cd services/worker-py

# Install dependencies (requires uv)
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
3. Implement `validate_payload()` and `execute()`
4. Register with `@register_handler` decorator

```python
from src.handlers.base import BaseHandler, JobResult, register_handler

@register_handler
class MyHandler(BaseHandler):
    job_type = "my.job"
    
    def validate_payload(self, payload: dict) -> dict:
        # Validate and return cleaned payload
        if "required_field" not in payload:
            raise ValueError("Missing required_field")
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        # Execute job logic
        result_data = {"processed": True}
        return JobResult(success=True, data=result_data)
```

## Running Tests

```bash
# Run all tests
uv run pytest tests/

# Run with coverage
uv run pytest tests/ --cov=src
```

## Architecture

### Job Lifecycle

1. **Poll**: Worker calls `claim_jobs(worker_id, limit)` to atomically claim pending jobs
2. **Validate**: Handler validates payload schema for the job type
3. **Execute**: Handler runs job logic with timeout and heartbeats
4. **Complete**: Results written to `job_results` table, job marked complete
5. **Retry on Failure**: Failed jobs retried with exponential backoff up to `MAX_RETRIES`
6. **Dead Letter**: Jobs exceeding max retries moved to `dead_letter_jobs` table

### Error Handling

- **Never crash-loop**: All exceptions caught and logged
- **Structured logs**: JSON format with correlation IDs
- **Secrets redaction**: Automatic redaction of sensitive fields
- **Graceful shutdown**: SIGTERM/SIGINT handled to complete in-flight jobs

### Database Schema Required

```sql
-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    worker_id VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 0,
    correlation_id VARCHAR(100),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    heartbeat_at TIMESTAMP WITH TIME ZONE,
    progress JSONB,
    result JSONB,
    metrics JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job results table
CREATE TABLE job_results (
    job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dead letter queue
CREATE TABLE dead_letter_jobs (
    job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    retry_count INTEGER,
    max_retries INTEGER,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_worker ON jobs(worker_id) WHERE status = 'processing';
CREATE INDEX idx_jobs_pending ON jobs(status, priority DESC, created_at) 
    WHERE status = 'pending';
```
