# JobForge Operations Runbook

## Overview

This runbook describes operational procedures for managing, monitoring, troubleshooting, and recovering JobForge queue workers and tasks in ReadyLayer.

---

## 1. Routine Health & Worker Status

### Checking Worker Status
Run the worker status diagnostic script:
```bash
npm run worker:status
```

### Running MCP and JobForge Smokes
```bash
npm run jobforge:smoke
npm run mcp:smoke
```

### Enqueuing a Test Job
```bash
npm run jobforge:enqueue
```

---

## 2. Common Incidents & Remediation

### Incident: Worker Heartbeat Timeout / Stalled Jobs
**Symptoms:**
- Jobs remain in `processing` state without completion.
- Last heartbeat timestamp is older than `HEARTBEAT_TIMEOUT_SECONDS` (default: 60s).

**Resolution:**
1. Check running worker processes:
   ```bash
   ps aux | grep jobforge
   ```
2. Reclaim stalled jobs via Postgres RPC:
   ```sql
   SELECT jobforge_reclaim_stalled_jobs(interval '5 minutes');
   ```
3. Restart the background worker:
   ```bash
   npm run jobforge:worker
   ```

---

### Incident: Dead-Letter Queue (DLQ) Accumulation
**Symptoms:**
- Spike in jobs reaching `max_retries` with status `failed`.
- Webhook endpoints returning 5xx or external API outages.

**Resolution:**
1. Inspect failure reasons in `jobforge_attempts`:
   ```sql
   SELECT job_id, error_message, created_at 
   FROM jobforge_attempts 
   WHERE error_message IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 50;
   ```
2. Once the upstream provider or bug is resolved, re-enqueue or reset failed jobs:
   ```sql
   UPDATE jobforge_jobs 
   SET status = 'pending', retry_count = 0, next_run_at = NOW() 
   WHERE status = 'failed' AND type = 'webhook:dispatch';
   ```

---

## 3. Scaling & Concurrency Controls

- **Worker Concurrency**: Adjusted via `JOBFORGE_CONCURRENCY` (default: 5).
- **Batch Processing**: Configured via `JOBFORGE_BATCH_SIZE` (default: 10).
- **Tenant Isolation**: Multi-tenant quotas are enforced through `lib/usage-enforcement.ts` limits.

---

## 4. Verification Checklist
- [ ] Database schema is up to date: `npm run db:verify`
- [ ] Worker processes start cleanly without connection errors: `npm run jobforge:smoke`
- [ ] Dead-letter alert thresholds are configured in monitoring alerts
