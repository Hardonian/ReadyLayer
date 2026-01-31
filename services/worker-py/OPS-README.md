# Worker Deployment & Operations Guide

## Overview

This document provides operational guidance for deploying and managing the ReadyLayer Python worker service (`services/worker-py/`).

**Key Principle**: The worker is deployed **separately** from the main Vercel application to avoid disrupting existing infrastructure.

---

## Deployment Strategy (Recommended)

### Option 1: Docker Container on Render/Fly.io (Preferred)

**Why**: Simple, cost-effective, no infrastructure management.

**Steps**:

```bash
# 1. Build and push image
docker build -t worker-py:latest services/worker-py/
docker tag worker-py:latest registry.render.com/your-app/worker-py:latest
docker push registry.render.com/your-app/worker-py:latest

# 2. Deploy to Render
# Use render.yaml or web dashboard
```

**Render Dashboard Setup**:
1. Create "Background Worker" service
2. Set root directory: `services/worker-py`
3. Build command: `pip install -r requirements.txt` (or use Dockerfile)
4. Start command: `python -m src.worker`
5. Set environment variables (see below)

### Option 2: Docker Compose on VPS

**Why**: Full control, predictable costs.

```yaml
# docker-compose.worker.yml
version: "3.8"

services:
  worker-py:
    build:
      context: ./services/worker-py
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - WORKER_ID=worker-prod-01
      - POLL_INTERVAL_SECONDS=5
      - MAX_CONCURRENT_JOBS=5
      - LOG_LEVEL=INFO
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    healthcheck:
      test: ["CMD", "python", "-c", "import sys; sys.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Run multiple workers
  worker-py-02:
    extends: worker-py
    environment:
      - WORKER_ID=worker-prod-02
```

Deploy:
```bash
docker-compose -f docker-compose.worker.yml up -d
```

### Option 3: GitHub Actions Scheduled Runner (For Non-Critical Jobs Only)

**Why**: Zero additional infrastructure, but limited to schedule intervals.

```yaml
# .github/workflows/worker-scheduled.yml
name: Scheduled Worker

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  run-worker:
    runs-on: ubuntu-latest
    timeout-minutes: 4  # Must be less than interval
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: astral-sh/setup-uv@v3
        with:
          version: '0.5.x'
      
      - name: Run worker batch
        working-directory: services/worker-py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          WORKER_ID: github-actions-worker
          POLL_INTERVAL_SECONDS: 1
          MAX_CONCURRENT_JOBS: 10
          MAX_RUNTIME_SECONDS: 240  # 4 minutes
        run: |
          uv sync
          timeout 240 uv run python -m src.worker --batch-mode
```

**⚠️ Limitations**:
- Max 6 hours per run (GitHub limit)
- No guaranteed execution time
- Not suitable for real-time processing

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `WORKER_ID` | ❌ | hostname | Unique worker identifier |
| `POLL_INTERVAL_SECONDS` | ❌ | 5 | Seconds between job polls |
| `JOB_TIMEOUT_SECONDS` | ❌ | 300 | Max seconds per job |
| `MAX_CONCURRENT_JOBS` | ❌ | 3 | Parallel job limit |
| `MAX_RETRIES` | ❌ | 3 | Retry attempts before DLQ |
| `LOG_LEVEL` | ❌ | INFO | DEBUG, INFO, WARNING, ERROR |
| `HEARTBEAT_INTERVAL_SECONDS` | ❌ | 30 | Seconds between heartbeats |

**Production Example**:
```bash
DATABASE_URL=postgresql://user:pass@db.example.com:5432/readylayer
WORKER_ID=worker-prod-us-east-01
POLL_INTERVAL_SECONDS=5
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT_SECONDS=600
MAX_RETRIES=3
LOG_LEVEL=INFO
```

---

## Rollout Steps

### First-Time Deployment

1. **Apply Database Migrations** (one-time):
   ```bash
   npm run db:worker:setup
   # Or manually:
   psql "$DATABASE_URL" -f supabase/migrations/20260130000000_job_queue_phase1.sql
   ```

2. **Verify Migrations Applied**:
   ```bash
   npm run worker:status
   ```

3. **Deploy Worker** (choose your strategy from above)

4. **Run Smoke Test**:
   ```bash
   npm run jobs:smoke
   ```

5. **Verify in Logs**:
   - Worker starts successfully
   - Polling for jobs
   - No connection errors

### Updating Worker Code

1. **Build new image**:
   ```bash
   cd services/worker-py
   docker build -t worker-py:v1.1 .
   ```

2. **Test locally**:
   ```bash
   docker run --env-file .env worker-py:v1.1
   ```

3. **Rolling deploy** (zero-downtime):
   ```bash
   # If using Docker Compose with multiple replicas:
   docker-compose -f docker-compose.worker.yml up -d --scale worker-py=2
   # Wait for new worker to be healthy
   docker-compose -f docker-compose.worker.yml up -d --scale worker-py=1
   ```

### Rollback

```bash
# Revert to previous image
docker-compose -f docker-compose.worker.yml down
docker pull worker-py:previous-tag
docker-compose -f docker-compose.worker.yml up -d
```

---

## Monitoring & Alerting

### Health Checks

The worker includes a simple health check endpoint (port 8080):

```bash
# Check worker health
curl http://worker-host:8080/health
# Expected: {"status": "healthy", "worker_id": "...", "jobs_processing": N}
```

### Log Aggregation

Worker logs in JSON format for easy parsing:

```json
{
  "timestamp": "2026-01-30T12:00:00Z",
  "level": "INFO",
  "worker_id": "worker-prod-01",
  "job_id": "job_123",
  "job_type": "ingest.normalize",
  "message": "Job completed successfully",
  "duration_ms": 1234
}
```

**Recommended**: Forward logs to:
- Datadog
- LogDNA
- CloudWatch Logs
- Grafana Loki

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Jobs processed/min | < 10 | < 1 |
| Job failure rate | > 5% | > 20% |
| Avg job duration | > 30s | > 2min |
| Stale jobs (reaped) | > 0 | > 5 |
| Worker heartbeat age | > 2min | > 5min |

### Alert Hooks

**Slack webhook example**:
```python
# Add to worker config
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Worker will POST alerts:
{
  "text": "🚨 Worker Alert",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Worker", "value": "worker-prod-01", "short": true},
      {"title": "Issue", "value": "High failure rate", "short": true},
      {"title": "Details", "value": "5 jobs failed in last 10min"}
    ]
  }]
}
```

**PagerDuty integration**:
```bash
ALERT_PAGERDUTY_KEY=your-integration-key
```

### Dashboard Queries

**Supabase/PostgreSQL monitoring queries**:

```sql
-- Jobs by status
SELECT status, COUNT(*) 
FROM "Job" 
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Slow jobs (>30s)
SELECT id, type, "startedAt", "completedAt",
       EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) as duration_sec
FROM "Job"
WHERE status = 'succeeded'
  AND "completedAt" > NOW() - INTERVAL '1 hour'
  AND EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) > 30;

-- Stuck jobs (running > 5min)
SELECT id, type, "lockedBy", "startedAt"
FROM "Job"
WHERE status = 'running'
  AND "startedAt" < NOW() - INTERVAL '5 minutes';
```

---

## Troubleshooting

### Worker Won't Start

```bash
# Check environment
python -c "import os; print(os.getenv('DATABASE_URL'))"

# Test database connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check migrations
psql "$DATABASE_URL" -c "SELECT proname FROM pg_proc WHERE proname = 'claim_jobs'"
```

### Jobs Not Being Processed

```bash
# Check queue depth
psql "$DATABASE_URL" -c "SELECT status, COUNT(*) FROM \"Job\" GROUP BY status"

# Check worker heartbeats
psql "$DATABASE_URL" -c "SELECT DISTINCT \"lockedBy\" FROM \"Job\" WHERE status = 'running'"

# Look for errors in logs
docker logs worker-py 2>&1 | grep ERROR
```

### High Failure Rate

```bash
# Check dead letter queue
psql "$DATABASE_URL" -c "SELECT type, COUNT(*) FROM \"Job\" WHERE status = 'dead' GROUP BY type"

# Review recent failures
psql "$DATABASE_URL" -c "SELECT id, type, error, \"createdAt\" FROM \"Job\" WHERE status = 'failed' ORDER BY \"createdAt\" DESC LIMIT 10"
```

### Database Connection Issues

```bash
# Check connection pool
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%worker%'"

# Monitor connection limits
psql "$DATABASE_URL" -c "SELECT max_conn, used, max_conn - used as available FROM (SELECT (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn, (SELECT count(*) FROM pg_stat_activity) as used) t"
```

---

## Security Considerations

1. **Database Credentials**: Use service role key, never expose in client
2. **Worker Isolation**: Run in separate container/VM from web app
3. **Network Security**: Use private subnets, VPC peering if possible
4. **Secrets Management**: Use Render/Fly secrets, AWS Secrets Manager, or similar
5. **Log Sanitization**: Secrets automatically redacted in logs

---

## Cost Optimization

**Render**:
- Starter: $7/month (suitable for low volume)
- Standard: $25/month (recommended for production)

**Fly.io**:
- ~$2-5/month for small workers
- Scale to zero option available

**Self-hosted VPS**:
- $5-10/month DigitalOcean droplet
- Can run multiple workers

---

## Support

- **Issues**: File in GitHub repo
- **Monitoring**: Check worker logs first
- **Database**: Verify migrations and connection
- **Emergency**: Stop worker, investigate queue, restart

---

## Quick Reference

```bash
# Start worker locally
pnpm worker:py

# Run smoke test
pnpm jobs:smoke

# Check worker status
pnpm worker:status

# View Docker logs
pnpm worker:py:docker:logs

# Build Docker image
cd services/worker-py && docker build -t worker-py .

# Deploy to production
cd services/worker-py && docker-compose up -d
```
