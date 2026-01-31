# Quick Deployment Guide

Deploy the ReadyLayer Python worker to production in 5 minutes.

## Prerequisites

- Database URL with write access
- Render.com or Fly.io account (or Docker server)
- Environment variables configured

## Option 1: Deploy to Render.com (Easiest)

```bash
# 1. Navigate to worker directory
cd services/worker-py

# 2. Deploy with one command
./scripts/deploy-production.sh render
```

Or manually:
```bash
# Set secrets on Render dashboard or CLI
render env set DATABASE_URL "postgresql://..." --service readylayer-worker-py

# Deploy
render deploy --service readylayer-worker-py
```

## Option 2: Deploy to Fly.io

```bash
# 1. Navigate to worker directory
cd services/worker-py

# 2. Set database secret
fly secrets set DATABASE_URL="postgresql://..."

# 3. Deploy
./scripts/deploy-production.sh fly
```

## Option 3: Docker Compose (Self-hosted)

```bash
# 1. Create production docker-compose file
cat > docker-compose.prod.yml << 'EOF'
version: "3.8"
services:
  worker-py:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - WORKER_ID=docker-prod-01
      - MAX_CONCURRENT_JOBS=5
      - LOG_LEVEL=INFO
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# 2. Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Verification

After deployment, verify everything works:

```bash
# Check worker status
npm run worker:status

# Run smoke tests
npm run jobs:smoke

# Check health endpoint
curl http://<worker-url>/health

# View metrics
curl http://<worker-url>/metrics
```

## Monitoring

The worker exposes these endpoints:

- `GET /health` - Health check (returns 200 if healthy)
- `GET /ready` - Readiness probe for Kubernetes
- `GET /metrics` - Prometheus-style metrics

### Key Metrics

| Metric | Description |
|--------|-------------|
| `worker_jobs_processed_total` | Total jobs processed |
| `worker_jobs_failed_total` | Total jobs failed |
| `worker_status` | 1 if running, 0 if stopped |
| `worker_uptime_seconds` | Worker uptime |

### Alerts

Configure alerts using environment variables:

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# PagerDuty (for critical alerts)
ALERT_PAGERDUTY_KEY=your-integration-key

# Generic webhook
ALERT_WEBHOOK_URL=https://your-monitoring.com/webhook
```

## Troubleshooting

### Worker won't start
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check migrations
npm run db:worker:setup

# View logs
docker logs worker-py  # or render logs, fly logs
```

### Jobs not processing
```bash
# Check queue depth
npm run worker:status

# Verify worker is running
curl http://<worker-url>/health
```

### High failure rate
```bash
# Check dead letter queue
psql $DATABASE_URL -c "SELECT type, COUNT(*) FROM \"Job\" WHERE status='dead' GROUP BY type"
```

## Rollback

```bash
# Docker
docker-compose -f docker-compose.prod.yml down
docker pull worker-py:previous-tag
docker-compose -f docker-compose.prod.yml up -d

# Render/Fly.io
# Use their respective CLI/dashboard to rollback to previous deploy
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `WORKER_ID` | ❌ | hostname | Unique worker identifier |
| `MAX_CONCURRENT_JOBS` | ❌ | 3 | Parallel job limit |
| `LOG_LEVEL` | ❌ | INFO | DEBUG, INFO, WARNING, ERROR |
| `HEALTH_CHECK_PORT` | ❌ | 8080 | Health endpoint port |

## Next Steps

1. Set up monitoring dashboard (Datadog, Grafana, etc.)
2. Configure alerting rules
3. Add more workers for horizontal scaling
4. Set up log aggregation

## Support

- Documentation: `services/worker-py/OPS-README.md`
- Issues: File in GitHub repository
- Logs: Check provider dashboard or `npm run worker:py:docker:logs`
