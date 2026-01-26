# ReadyLayer Postgres Operations Runbook

**Purpose:** Operational playbook for maintaining Postgres performance at scale.

---

## Daily Operations

### Morning Health Check (5 minutes)

```bash
# 1. Check connection pool utilization
psql "$DATABASE_URL" -c "
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = current_database();
"
```

**Healthy Ranges:**
- Total: 5-20 (Supabase pooler should keep this low)
- Active: <10
- Idle: <10

**Alert Thresholds:**
- Total >50: Investigate connection leak or pooler misconfiguration
- Active >20: High query load or slow queries blocking pool

---

```bash
# 2. Check slow queries (last 24 hours)
# Via application logs:
grep "Slow query detected" logs/$(date -d yesterday +%Y-%m-%d).log | wc -l
```

**Healthy:** <50 slow queries per day
**Alert:** >200 slow queries per day → Query optimization needed

---

```bash
# 3. Cache hit rate check
curl https://app.readylayer.com/api/metrics | jq '{
  cache_hit_rate: .cache.hit_rate,
  cache_hits: .cache.hits,
  cache_misses: .cache.misses
}'
```

**Healthy:** Hit rate >70%
**Alert:** Hit rate <50% → Investigate cache misses, increase TTLs

---

### Weekly Maintenance (30 minutes)

```bash
# 1. Index health check
psql "$DATABASE_URL" -c "
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
"
```

**Action:**
- Indexes with 0 scans → Candidate for removal (after 30 days)
- High tuples_read but low tuples_fetched → Inefficient index

---

```bash
# 2. Table bloat check
psql "$DATABASE_URL" -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) as dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY dead_pct DESC NULLS LAST
LIMIT 10;
"
```

**Alert Thresholds:**
- `dead_pct` >20% → Schedule VACUUM ANALYZE
- AuditLog table >1GB → Consider partitioning

**Manual VACUUM (if needed):**
```sql
VACUUM ANALYZE "AuditLog";
VACUUM ANALYZE "TokenUsage";
```

---

```bash
# 3. Long-running queries
psql "$DATABASE_URL" -c "
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND (now() - pg_stat_activity.query_start) > interval '30 seconds'
ORDER BY duration DESC;
"
```

**Action:**
- Queries >5 minutes → Investigate or terminate
- Terminate stuck query: `SELECT pg_terminate_backend(<pid>);`

---

## Incident Response

### Incident: "Database Connection Exhaustion"

**Symptoms:**
- API returns 500 errors
- Error: "too many connections"
- Dashboard unresponsive

**Diagnosis:**
```bash
# 1. Check connection count
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"

# 2. Check connection sources
psql "$DATABASE_URL" -c "
SELECT
  application_name,
  state,
  count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY count(*) DESC;
"
```

**Immediate Mitigation:**
1. Verify `DATABASE_URL` uses pooler (port 6543)
   ```bash
   echo $DATABASE_URL | grep ":6543"
   ```

2. If not using pooler, update immediately:
   ```bash
   # Update DATABASE_URL to pooler endpoint
   DATABASE_URL="postgresql://...pooler.supabase.com:6543/..."
   ```

3. Restart application servers to clear connections

**Long-term Fix:**
- Ensure all environments use pooler
- Add connection monitoring alerts
- Review query patterns for connection leaks

---

### Incident: "Slow Dashboard Performance"

**Symptoms:**
- Dashboard loads >5 seconds
- User reports "site is slow"
- High DB query latency

**Diagnosis:**
```bash
# 1. Check cache hit rate
curl https://app.readylayer.com/api/metrics | jq '.cache.hit_rate'
# If <50%, cache is ineffective

# 2. Check for missing indexes (query planner)
psql "$DATABASE_URL" -c "
SELECT
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  idx_scan as index_scans,
  seq_tup_read as seq_tuples_read
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 1000
  AND seq_scan > idx_scan
ORDER BY seq_scan DESC
LIMIT 10;
"
```

**Mitigation:**
1. **High sequential scans:** Add indexes for hot query paths
   ```sql
   -- Example: Add index for frequently scanned column
   CREATE INDEX CONCURRENTLY idx_<table>_<column> ON "<Table>" ("<column>");
   ```

2. **Low cache hit rate:**
   - Increase cache TTLs (edit `lib/db/cache.ts` TTL constants)
   - Verify Redis is healthy: `redis-cli ping`
   - Check cache logs for errors

3. **Immediate relief:** Restart application to clear any in-memory state

---

### Incident: "Write Performance Degradation"

**Symptoms:**
- API mutations slow (>1s)
- Review creation timeouts
- High DB write latency

**Diagnosis:**
```bash
# 1. Check for lock contention
psql "$DATABASE_URL" -c "
SELECT
  locktype,
  relation::regclass,
  mode,
  granted,
  count(*)
FROM pg_locks
WHERE NOT granted
GROUP BY locktype, relation, mode, granted;
"
```

**Mitigation:**
1. **Lock contention on Job table:**
   - Check job queue depth: `SELECT count(*) FROM "Job" WHERE status = 'pending';`
   - If >10,000: Clear stale jobs
   - Consider scaling worker processes

2. **AuditLog write pressure:**
   - Verify audit worker is running: `ps aux | grep audit-worker`
   - Check audit queue depth
   - If worker down, restart: `npm run worker:audit`

3. **Table bloat (AuditLog, TokenUsage):**
   ```sql
   VACUUM ANALYZE "AuditLog";
   VACUUM ANALYZE "TokenUsage";
   ```

---

### Incident: "Circuit Breaker Open"

**Symptoms:**
- API returns 503 "Service temporarily unavailable"
- Error message mentions "circuit breaker"

**Diagnosis:**
```bash
# Check circuit breaker metrics
curl https://app.readylayer.com/api/health/circuit-breaker
# Expected: { "state": "CLOSED" }

# If OPEN or HALF_OPEN, check DB health
psql "$DATABASE_URL" -c "SELECT 1 as health;"
```

**Mitigation:**
1. If DB is healthy, circuit breaker should auto-recover in 30s
2. If DB is unhealthy, diagnose DB issue first
3. Manual reset (emergency only):
   ```typescript
   // Via admin console or direct code:
   import { dbCircuitBreaker } from '@/lib/prisma'
   dbCircuitBreaker.reset()
   ```

**Note:** Circuit breaker opening is **protective**, not a bug. It prevents cascading failures.

---

## Scaling Operations

### When to Add Read Replicas

**Indicators:**
1. Cache hit rate >80% but still high DB load
2. Read queries >70% of total DB time
3. Analytics queries impacting transactional performance
4. Metrics show consistent high read IOPS

**Cost-Benefit:**
- **Cost:** ~$25/month (Supabase Pro plan)
- **Benefit:** 10× read capacity, isolated analytics queries

**Implementation:**
1. Upgrade Supabase plan to enable read replicas
2. Create `lib/prisma-read.ts`:
   ```typescript
   export const prismaRead = new PrismaClient({
     datasources: { db: { url: process.env.DATABASE_READ_REPLICA_URL } }
   })
   ```
3. Route queries:
   - Analytics, dashboards → `prismaRead`
   - Mutations, real-time data → `prisma` (write primary)
4. Handle replica lag (up to 1s acceptable for dashboards)

---

### When to Partition Tables

**Indicators:**
1. AuditLog or TokenUsage >10M rows
2. VACUUM taking >1 hour
3. Index sizes >5GB
4. Queries on recent data slow despite indexes

**Candidates for Partitioning:**
- AuditLog (partition by month)
- TokenUsage (partition by month)
- CostTracking (partition by month)

**Implementation:**
```sql
-- Example: Partition AuditLog by month
CREATE TABLE "AuditLog_202601" PARTITION OF "AuditLog"
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE "AuditLog_202602" PARTITION OF "AuditLog"
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

**Migration Risk:** Medium (requires downtime or dual-write period)

---

### When to Consider Sharding

**Do NOT shard unless:**
1. Single DB with replicas + caching + pooling cannot handle load
2. Write load >10,000 writes/sec sustained
3. Dataset >1TB and growing >100GB/month
4. Specific tenants need geographic isolation (GDPR)

**Sharding is complex and should be last resort.**

**Cost-Effective Alternatives:**
1. Vertical scaling (larger DB instance)
2. More aggressive caching (99% hit rate)
3. Async writes (batch more operations)
4. Data retention policies (archive old data)

---

## Monitoring & Alerts

### Recommended Alerts

**Critical (Page on-call):**
- Connection pool >80% capacity
- Circuit breaker OPEN for >5 minutes
- Slow queries >100/hour
- Replica lag >10 seconds (if using replicas)

**High (Slack alert):**
- Cache hit rate <50%
- Table bloat >30%
- Long-running queries >5 minutes
- Job queue depth >5,000

**Medium (Email alert):**
- Index scans <50% of expected
- VACUUM needed (dead tuples >20%)

### Metrics to Track

**Database:**
- Connection count (gauge)
- Active connections (gauge)
- Query duration p50/p95/p99 (histogram)
- Slow query count (counter)
- Lock wait time (histogram)
- Index hit ratio (gauge, target >95%)
- Cache hit ratio (gauge, target >99%)

**Application:**
- Cache hit rate (gauge, target >70%)
- Circuit breaker state (gauge, 0=closed, 1=open)
- Audit queue depth (gauge)
- Job queue depth (gauge)

---

## Quarterly Review

**Every 3 months:**

1. **Index Audit:**
   - Remove unused indexes (0 scans in 90 days)
   - Add indexes for slow queries

2. **Table Size Projection:**
   - Estimate growth rate
   - Plan for partitioning if needed
   - Review data retention policies

3. **Query Pattern Analysis:**
   - Identify new slow query patterns
   - Update cache TTLs based on usage
   - Review read vs write ratio

4. **Capacity Planning:**
   - Estimate load at 2×, 5×, 10× current scale
   - Plan infrastructure upgrades
   - Budget for read replicas / larger instances

---

## Useful Queries

### Top 10 Slowest Queries (via pg_stat_statements, if enabled)

```sql
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Database Size

```sql
SELECT
  pg_size_pretty(pg_database_size(current_database())) as db_size;
```

### Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Index Hit Ratio (Should be >95%)

```sql
SELECT
  sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100 as index_hit_ratio
FROM pg_statio_user_indexes;
```

---

## Contact & Escalation

**For Postgres issues:**
1. Check this runbook
2. Check Supabase status page: status.supabase.com
3. Review recent code deployments
4. Escalate to infrastructure team if unresolved

**For performance degradation:**
1. Check monitoring dashboards
2. Run diagnostic queries above
3. Apply immediate mitigations
4. Schedule deeper investigation

**For data integrity issues:**
1. **Do not** run manual DELETE/UPDATE queries without backup
2. Consult with senior engineer
3. Test on staging environment first

---

**Runbook Version:** 1.0
**Last Updated:** 2026-01-24
**Next Review:** 2026-04-24
