# JobForge Integration

JobForge is a Postgres-native job queue system integrated into ReadyLayer for reliable background job processing. It provides multi-tenant isolation, automatic retries, idempotency, and built-in connectors for common async operations.

## Overview

JobForge uses separate `jobforge_*` tables and RPC functions, running alongside ReadyLayer's existing job queue infrastructure. It's designed for connector-based workflows (HTTP requests, webhooks, reports) where you need:

- **Postgres-native**: No Redis/Kafka dependency
- **Multi-tenant safe**: RLS policies ensure tenant isolation
- **Concurrency-safe**: `FOR UPDATE SKIP LOCKED` prevents race conditions
- **Idempotent**: Automatic deduplication via `(tenant_id, type, idempotency_key)`
- **Observable**: Structured logs, correlation IDs, job attempts tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL/Supabase                     │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ jobforge_jobs  │  │ RPC Functions│  │  RLS Policies   │ │
│  │ (job queue)    │  │ - enqueue    │  │ (tenant guard)  │ │
│  │                │  │ - claim      │  │                 │ │
│  │ + results      │  │ - complete   │  │                 │ │
│  │ + attempts     │  │ - heartbeat  │  │                 │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ RPC calls
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐         ┌────▼─────┐       ┌─────▼────┐
    │ SDK      │         │ Worker   │       │ Next.js  │
    │ (enqueue)│         │ (process)│       │ (server) │
    └──────────┘         └──────────┘       └──────────┘
```

## Setup

### 1. Apply Database Migration

```bash
npm run db:jobforge:migrate
```

This creates the `jobforge_*` tables, RPC functions, and RLS policies.

### 2. Environment Variables

Ensure you have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

JobForge admin integration is **disabled by default** to avoid side effects. Enable explicitly:

```env
# Default: 0 (disabled)
JOBFORGE_INTEGRATION_ENABLED=0

# Default: 0 (gated)
JOBFORGE_BUNDLE_EXECUTION_ENABLED=0

# Optional explicit mapping of project -> tenant
# Example: {"repo_123":"org_abc","repo_456":"org_def"}
JOBFORGE_TENANT_PROJECT_MAP={}
```

### 3. Run Worker

```bash
npm run jobforge:worker
```

The worker polls for jobs and processes them using registered handlers.

## Usage

### Enqueuing Jobs (Server-side)

**In Server Actions:**

```typescript
'use server'

import { enqueueJob } from '@/lib/jobforge/enqueue'

export async function triggerWebhook(organizationId: string, data: any) {
  const job = await enqueueJob({
    tenant_id: organizationId,
    type: 'connector.webhook.deliver',
    payload: {
      target_url: 'https://customer-webhook.example.com',
      event_type: 'evaluation.completed',
      event_id: crypto.randomUUID(),
      data,
    },
    idempotency_key: `webhook-${organizationId}-${data.evalId}`,
  })

  return { jobId: job.id }
}
```

**In API Routes:**

```typescript
import { NextResponse } from 'next/server'
import { enqueueJob } from '@/lib/jobforge/enqueue'

export async function POST(req: Request) {
  const { organizationId, reportType } = await req.json()

  await enqueueJob({
    tenant_id: organizationId,
    type: 'connector.report.generate',
    payload: {
      report_type: reportType,
      inputs_data: { /* ... */ },
      format: ['json', 'html'],
    },
  })

  return NextResponse.json({ success: true })
}
```

### Built-in Connectors

JobForge includes production-ready connectors:

#### 1. HTTP Request (`connector.http.request`)

Execute HTTP requests with SSRF protection:

```typescript
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.http.request',
  payload: {
    url: 'https://api.external.com/notify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { message: 'Hello' },
    timeout_ms: 10000,
  },
})
```

#### 2. Webhook Delivery (`connector.webhook.deliver`)

Deliver webhooks with HMAC signing:

```typescript
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.webhook.deliver',
  payload: {
    target_url: 'https://customer.com/webhook',
    event_type: 'evaluation.completed',
    event_id: crypto.randomUUID(),
    data: { evalId: '123', result: 'pass' },
    secret_ref: 'WEBHOOK_SECRET_ORG_123', // env var name
    signature_algo: 'sha256',
  },
})
```

#### 3. Report Generation (`connector.report.generate`)

Generate reports in multiple formats:

```typescript
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.report.generate',
  payload: {
    report_type: 'job-analytics',
    inputs_data: {
      jobs: [/* job records */],
    },
    format: ['json', 'html', 'csv'],
  },
})
```

#### 4. Module Dry-Run (`connector.module.run`)

Simulate module execution without side effects:

```typescript
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.module.run',
  payload: {
    module_name: 'policy-engine',
    input: { dry_run: true },
    dry_run: true,
  },
})
```

#### 5. Bundle Execution (`connector.bundle.execute`)

Queue bundle execution plans (gated by `JOBFORGE_BUNDLE_EXECUTION_ENABLED`):

```typescript
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.bundle.execute',
  payload: {
    bundle_id: 'bundle-123',
    bundle_type: 'evidence',
    inputs: { scope: 'latest' },
    execute: false,
  },
})
```

### Admin UI + CLI

Use the admin interface to submit events, run dry-runs, inspect reports, and request bundle execution:

- **UI:** `/dashboard/admin/jobforge`
- **CLI:**

```bash
npx tsx cli/readylayer-cli.ts jobforge submit-event \\
  --tenant <org-id> \\
  --project <repo-id> \\
  --target-url https://example.com/webhook \\
  --event-type readiness.updated \\
  --data '{\"bundle\":\"123\"}'

npx tsx cli/readylayer-cli.ts jobforge module-dry-run \\
  --tenant <org-id> \\
  --project <repo-id> \\
  --module policy-engine \\
  --input '{\"preview\":true}'

npx tsx cli/readylayer-cli.ts jobforge report \\
  --tenant <org-id> \\
  --project <repo-id> \\
  --result-id <result-id>

npx tsx cli/readylayer-cli.ts jobforge bundle-execute \\
  --tenant <org-id> \\
  --project <repo-id> \\
  --bundle-id <bundle-id> \\
  --inputs '{\"scope\":\"latest\"}'
```

### Querying Jobs

```typescript
import { getJobStatus, listJobs, cancelJob } from '@/lib/jobforge/enqueue'

// Get single job
const job = await getJobStatus(jobId, organizationId)

// List jobs for organization
const jobs = await listJobs(organizationId, {
  status: 'succeeded',
  limit: 10,
})

// Cancel a job
await cancelJob(jobId, organizationId)
```

## Testing

### Smoke Test

```bash
npm run jobforge:smoke
```

Validates the integration by:
1. Enqueuing a test HTTP request job
2. Verifying job creation
3. Testing idempotency
4. Listing jobs

### Enqueue Examples

```bash
npm run jobforge:enqueue
```

Enqueues sample jobs for each connector type.

## Worker Operations

### Running in Development

```bash
npm run jobforge:worker
```

### Running in Production

Use a process manager like PM2 or run as a systemd service:

```bash
# PM2
pm2 start "npm run jobforge:worker" --name jobforge-worker

# Docker
docker run -d --env-file .env your-app npm run jobforge:worker
```

### Monitoring

```sql
-- View job stats
SELECT status, COUNT(*), type
FROM jobforge_jobs
GROUP BY status, type;

-- View recent jobs
SELECT id, type, status, attempts, created_at
FROM jobforge_jobs
ORDER BY created_at DESC
LIMIT 10;

-- View dead letter queue
SELECT id, type, error, attempts
FROM jobforge_jobs
WHERE status = 'dead';
```

## Runbook

### Stuck Jobs

Jobs stuck in `running` state will be reaped by the stale job detector:

```sql
-- Manually reap stale jobs (older than 5 minutes)
SELECT * FROM jobforge_reap_stale_jobs(INTERVAL '5 minutes', false);
```

### Dead Letter Queue

Jobs that fail after max attempts move to `dead` status:

```sql
-- View dead jobs
SELECT id, type, error, tenant_id, created_at
FROM jobforge_jobs
WHERE status = 'dead'
ORDER BY created_at DESC;

-- Manually retry a dead job (reschedule)
UPDATE jobforge_jobs
SET status = 'queued',
    attempts = 0,
    run_at = NOW()
WHERE id = 'job-id-here';
```

### Scaling Workers

Run multiple workers in parallel:

```bash
# Terminal 1
WORKER_ID=worker-1 npm run jobforge:worker

# Terminal 2
WORKER_ID=worker-2 npm run jobforge:worker
```

Workers use `FOR UPDATE SKIP LOCKED` to safely claim jobs without conflicts.

## Security

### RLS Policies

- Jobs are isolated by `tenant_id`
- Only service role can insert jobs (via RPC)
- End-users can query their tenant's jobs via API

### SSRF Protection

HTTP connector blocks:
- Private IP ranges (10.x, 172.16.x, 192.168.x)
- Localhost/loopback
- Cloud metadata endpoints (AWS, GCP)

### Webhook Signing

Webhooks are signed with HMAC-SHA256:

```
X-JobForge-Signature: sha256=<hex-signature>
```

Customers verify by:
1. Reading secret from your system
2. Computing HMAC of request body
3. Comparing with `X-JobForge-Signature` header

## Comparison with Existing Job System

ReadyLayer has two job systems:

| Feature | Existing Job Queue | JobForge |
|---------|-------------------|----------|
| Table | `Job` (Prisma) | `jobforge_jobs` |
| Use Case | ReadyLayer-specific (eval runs, policies) | Generic connectors (HTTP, webhooks, reports) |
| Enqueue | `enqueue_job()` RPC | `jobforge_enqueue_job()` RPC |
| Worker | `npm run worker:job` | `npm run jobforge:worker` |
| Best For | Internal ReadyLayer workflows | External integrations, async HTTP calls |

Both systems can coexist. Use JobForge when you need:
- Connector-based workflows (HTTP, webhooks)
- Multi-format report generation
- Retry logic with exponential backoff
- Built-in SSRF protection and webhook signing

## Troubleshooting

### Worker Not Claiming Jobs

Check worker logs:
```bash
npm run jobforge:worker 2>&1 | tee worker.log
```

Verify jobs exist:
```sql
SELECT COUNT(*) FROM jobforge_jobs WHERE status = 'queued';
```

### Jobs Failing Immediately

Check job error:
```sql
SELECT id, type, error, payload
FROM jobforge_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

### Idempotency Not Working

Verify unique constraint:
```sql
SELECT idempotency_key, COUNT(*)
FROM jobforge_jobs
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
```

## References

- **Migration**: `supabase/migrations/20260131000000_jobforge_core.sql`
- **SDK**: `lib/jobforge/sdk/`
- **Worker**: `services/jobforge-worker/`
- **Examples**: `scripts/jobforge-enqueue-example.ts`
- **Smoke Test**: `scripts/jobforge-smoke-test.ts`

---

**JobForge** - Boring, correct, Postgres-native job processing for ReadyLayer.
