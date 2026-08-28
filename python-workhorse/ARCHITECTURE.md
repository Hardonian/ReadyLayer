# Python Workhorse Architecture

## Overview
Additive Python subsystem for CPU-intensive background tasks without disrupting existing TypeScript workers.

## Design Decisions

### 1. Queue Strategy: Shared Postgres Job Table
- **Why**: Existing Prisma `Job` model already supports this
- **Python worker polls**: `status='pending' AND type IN ('python.*')`
- **TypeScript enqueues**: Same `queueService.enqueue()` API
- **Benefits**: Single source of truth, transactional safety, no Redis dependency for Python

### 2. Worker Types (Python-specific)
```
python.report.generate    - PDF/SARIF export generation
python.batch.export       - Bulk evidence export
python.analytics.score    - AI risk exposure scoring
python.ingest.document    - Large document chunking (RAG fallback)
python.reconcile.violations - Pattern detection across repos
```

### 3. Security Model
- **Least privilege**: Python DB user has SELECT/INSERT/UPDATE only on Job table
- **No RLS bypass**: Python reads jobs but doesn't write to tenant tables directly
- **RPC pattern**: Python calls Supabase functions for any tenant data writes
- **Env isolation**: Separate `.env.python` file, never committed

### 4. Observability
- Structured JSON logging to stdout (CloudWatch/Vector compatible)
- Job duration metrics written to Job.result
- Health check endpoint for load balancer
- Dead letter handling via Job.status='failed' with error JSON

## File Structure
```
python-workhorse/
├── README.md                    # Setup and operation guide
├── requirements.txt             # Python deps (psycopg2, pydantic, etc.)
├── .env.example                 # Template for env vars
├── src/
│   ├── __init__.py
│   ├── config.py               # Typed env validation with pydantic-settings
│   ├── database.py             # Postgres connection pool + Job queries
│   ├── worker.py               # Main polling loop + job executor
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── report_generator.py # PDF/SARIF export logic
│   │   ├── batch_exporter.py   # Bulk data export
│   │   ├── analytics_scorer.py # AI risk scoring
│   │   └── document_ingest.py  # Large doc processing
│   └── utils/
│       ├── logging_config.py   # Structured JSON logging
│       └── retry.py            # Exponential backoff decorator
├── scripts/
│   ├── run-local.py           # Dev runner
│   ├── health-check.py        # Health probe
│   └── smoke-test.py          # Integration test
└── tests/
    ├── test_config.py
    ├── test_worker.py
    └── test_handlers/
```

## Database Schema (Additive Only)

### New: Python Job Types Enum
Extends existing Job.type field, no schema change needed:
```python
PYTHON_JOB_TYPES = {
    'python.report.generate',
    'python.batch.export',
    'python.analytics.score',
    'python.ingest.document',
    'python.reconcile.violations'
}
```

### Job Payload Schema (JSONB)
```typescript
// TypeScript enqueue side
interface PythonJobPayload {
  organizationId: string;  // Required for tenant isolation
  userId?: string;         // For audit trail
  repositoryId?: string;   // Optional repo context
  jobType: string;         // One of PYTHON_JOB_TYPES
  parameters: Json;        // Job-specific params
  priority?: number;       // 1-5, default 3
  timeoutSeconds?: number; // Max runtime, default 300
}
```

## Integration Points

### TypeScript → Python (Enqueue)
```typescript
// lib/jobs/python-jobs.ts
export async function enqueuePythonJob(
  type: PythonJobType,
  payload: PythonJobPayload
): Promise<string> {
  return queueService.enqueue(`python.${type}`, {
    type: `python.${type}`,
    data: payload,
    organizationId: payload.organizationId,
    userId: payload.userId,
    maxRetries: 3
  });
}
```

### Python → TypeScript (Results)
```python
# After job completion, Python updates Job.result with:
{
  "status": "completed",
  "output": {
    "downloadUrl": "...",
    "recordCount": 1500,
    "fileSize": 2450000,
    "checksum": "sha256:..."
  },
  "metrics": {
    "durationMs": 45000,
    "cpuTimeMs": 12000,
    "peakMemoryMb": 512
  }
}
```

## Graceful Degradation
1. **Python offline**: Jobs accumulate in `pending` status, UI shows "queued"
2. **Python error**: Job moves to `failed` after 3 retries, notification sent
3. **Timeout**: Job killed after timeoutSeconds, marked `failed`
4. **TypeScript unaffected**: All existing workers continue normally

## Local Development
```bash
cd python-workhorse
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in values
python scripts/run-local.py
```

## Deployment Options
1. **Vercel Function** (lightweight): As serverless function for sporadic jobs
2. **Container** (recommended): Docker container on Railway/Fly/ECS for continuous polling
3. **VM/Bare metal**: For heavy analytics workloads

## Monitoring
- Health endpoint: `GET /health` → `{"status": "healthy", "queue_depth": 5}`
- Metrics logged: Job duration, success rate, queue depth
- Alert when: queue_depth > 100, failure_rate > 5%, no heartbeat > 5min
