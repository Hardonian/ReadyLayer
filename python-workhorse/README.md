# Python Workhorse for ReadyLayer

CPU-intensive background task processor that complements the TypeScript worker fleet.

## Quick Start

```bash
cd python-workhorse
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and SUPABASE_URL
python scripts/run-local.py
```

## Architecture

This Python subsystem:
- **Polls the same Postgres Job table** used by TypeScript workers
- **Processes only `python.*` job types** to avoid conflicts
- **Maintains tenant isolation** via `organizationId` in every payload
- **Writes results back to Job.result** for TypeScript to consume

## Job Types

| Type | Purpose | Trigger |
|------|---------|---------|
| `python.report.generate` | PDF/SARIF export | User clicks "Export Report" |
| `python.batch.export` | Bulk evidence export | API call or scheduled job |
| `python.analytics.score` | AI risk exposure calculation | Daily cron or manual run |
| `python.ingest.document` | Large document chunking | RAG ingestion fallback |
| `python.reconcile.violations` | Cross-repo pattern detection | Weekly analysis |

## Environment Variables

See `.env.example` for required and optional variables.

## Development

```bash
# Run tests
pytest

# Run smoke test
python scripts/smoke-test.py

# Check health
python scripts/health-check.py
```

## Deployment

### Option 1: Docker (Recommended)

```dockerfile
# Dockerfile (create at repo root)
FROM python:3.11-slim
WORKDIR /app
COPY python-workhorse/requirements.txt .
RUN pip install -r requirements.txt
COPY python-workhorse/src ./src
CMD ["python", "-m", "src.worker"]
```

### Option 2: Railway/Fly.io

Use the provided `railway.toml` or `fly.toml` configs.

### Option 3: Systemd Service

See `systemd/python-workhorse.service` template.

## Monitoring

- **Logs**: Structured JSON to stdout (collected by Vector/Fluentd)
- **Metrics**: Job duration, queue depth, success rate
- **Health**: `python scripts/health-check.py` returns exit code 0/1

## Security

- Python DB user has **least privilege**: SELECT/UPDATE only on Job table
- All tenant data access goes through **Supabase RPC functions**
- No secrets in logs (redacted automatically)
- Job payload validation with Pydantic

## Integration with TypeScript

```typescript
// From Next.js app - enqueue a Python job
import { enqueuePythonJob } from '@/lib/jobs/python-jobs';

const jobId = await enqueuePythonJob('report.generate', {
  organizationId: 'org_xxx',
  repositoryId: 'repo_yyy',
  parameters: { format: 'pdf', reviewId: 'rev_zzz' }
});

// Poll for completion or use webhook callback
```

## Troubleshooting

**Jobs not processing?**
- Check `SELECT COUNT(*) FROM Job WHERE status='pending' AND type LIKE 'python.%'`
- Verify DATABASE_URL in .env
- Check logs: `python scripts/run-local.py --verbose`

**High memory usage?**
- Adjust `JOB_TIMEOUT_SECONDS` (default 300)
- Lower `MAX_CONCURRENT_JOBS` (default 3)
- Enable swap or use container with more RAM

**Database connection errors?**
- Check connection pool: `POOL_SIZE` (default 5)
- Verify Supabase connection limits
- Consider connection string with `?connection_limit=10`
