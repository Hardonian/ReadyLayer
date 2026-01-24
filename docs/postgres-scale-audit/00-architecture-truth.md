# ReadyLayer Architecture Truth Table

**Generated:** 2026-01-24
**Purpose:** Comprehensive current-state assessment for Postgres scaling audit

---

## Executive Summary

ReadyLayer is a Next.js 14 + Prisma ORM application using Supabase PostgreSQL with a **multi-tenant SaaS architecture** serving code governance workloads. The system has **no explicit Postgres scaling optimizations** and is vulnerable to connection exhaustion, query saturation, and write amplification under moderate load.

**Critical Gap:** Architecture is optimized for correctness and security (good!) but **not for Postgres scalability**.

---

## Technology Stack

### Application Layer
- **Framework:** Next.js 14 (App Router) on Node.js 20.x
- **Runtime:** Serverless (Vercel) + Node workers (background jobs)
- **Database ORM:** Prisma 5.22.0
- **Database:** Supabase PostgreSQL (managed Postgres 15+)
- **Queue:** Redis 5.10.0 (via Bull/BullMQ pattern)
- **Auth:** Supabase Auth (separate from data layer)
- **State Management:**
  - Server: TanStack Query v5 (React Query)
  - Client: Zustand + React Query
- **Logging:** Pino (structured JSON logs)
- **Monitoring:** Custom metrics service (no APM integration detected)

### Database Schema
- **Total Models:** 70+ Prisma models
- **Tenant Model:** Organization-based (strict `organizationId` isolation)
- **RLS:** Enabled on all tenant-scoped tables (Supabase RLS policies active)
- **Hot Tables:**
  - `Review` (code review results, high read+write)
  - `AuditLog` (immutable append-only, high write)
  - `TokenUsage` (per-request writes, high write)
  - `CostTracking` (daily aggregates, medium write)
  - `Job` (queue persistence, high read+write+update)
  - `ReadyLayerRun` (pipeline orchestration, medium write)
  - `Repository`, `Organization`, `OrganizationMember` (high read, low write)

---

## Architecture Truth Table

### PRIMARY WRITE PATHS

| Path | Endpoint/Service | Operations | Est. Latency | Scaling Concern |
|------|-----------------|------------|--------------|-----------------|
| **Review Creation** | `POST /api/v1/reviews` | 1. Tenant check (2 queries)<br>2. Review insert<br>3. Violation inserts (N)<br>4. EvidenceBundle insert<br>5. AuditLog insert<br>6. TokenUsage insert<br>7. CostTracking upsert | 200-500ms | Write amplification: 1 review → 5+ writes |
| **Webhook Processing** | `POST /api/webhooks/{provider}` | 1. Installation lookup<br>2. Job create<br>3. AuditLog insert | 100-200ms | Fanout: 1 webhook → many jobs |
| **Background Jobs** | Redis workers → DB | 1. Job update (status)<br>2. Service execution (creates records)<br>3. Job update (result)<br>4. Metrics inserts | Variable | Update contention on Job table |
| **Audit Logging** | All mutating endpoints | Synchronous AuditLog insert | +50ms | Every action = DB write |
| **Usage Tracking** | LLM service calls | TokenUsage insert + CostTracking upsert | +20ms | Per-LLM-call writes |

### PRIMARY READ PATHS

| Path | Endpoint/Service | Query Pattern | Cache? | Scaling Concern |
|------|-----------------|---------------|--------|-----------------|
| **Dashboard Runs** | `GET /api/dashboard/runs` | `findMany` + `include: { repository }` | ❌ | N+1 potential, unbounded |
| **Reviews List** | `GET /api/v1/reviews` | `findMany` + `include: { repository }` | ❌ | Tenant scan, no covering index |
| **Metrics/Analytics** | `GET /api/dashboard/metrics` | Aggregates (COUNT, SUM) over time ranges | ❌ | Full table scans on hot tables |
| **Policy Evaluation** | Review service internal | PolicyPack + PolicyRule joins | ❌ | Per-review reads |
| **Tenant Checks** | All authenticated endpoints | OrganizationMember lookup (2 queries) | ❌ | Repeated on every request |
| **Stream/Polling** | `GET /api/stream` (SSE) | Polling findMany on ReadyLayerRun | ❌ | High query rate |

### CACHING LAYER

| Layer | Technology | TTL | Hit Rate | Coverage |
|-------|-----------|-----|----------|----------|
| **Client (Browser)** | React Query | 5min default | Unknown | Dashboard views only |
| **Server (API)** | ❌ None | N/A | N/A | N/A |
| **CDN** | ❌ None | N/A | N/A | Static assets only |
| **Database** | ❌ None | N/A | N/A | N/A |

**Verdict:** Zero server-side caching. Every API call = fresh DB query.

### RATE LIMITING

| Scope | Limit | Window | Storage | Enforcement |
|-------|-------|--------|---------|-------------|
| **Default** | 100 req | 60s | Redis (fallback: memory) | Per-user or per-IP |
| **Strict** | 10 req | 60s | Redis (fallback: memory) | Manually configured |
| **DB Query** | ❌ None | N/A | N/A | Unbounded |
| **Connection** | ❌ None | N/A | N/A | Prisma default pool |

**Gap:** Rate limits protect API but not database. Expensive queries can saturate DB despite API rate limits.

### BACKGROUND PROCESSING

| Queue | Worker | Concurrency | Job Persistence | Failure Mode |
|-------|--------|-------------|-----------------|--------------|
| **webhook** | `workers/webhook-processor.ts` | Unknown (likely 1-4) | PostgreSQL `Job` table | Retry 3x, then fail |
| **job** | `workers/job-processor.ts` | Unknown (likely 1-4) | PostgreSQL `Job` table | Retry 3x, then fail |

**Pattern:** Redis queue + Postgres durability (good for correctness, adds write load).

---

## Connection & Pooling

### Prisma Client Configuration

```typescript
// lib/prisma.ts
new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
// No explicit pool configuration
```

**Connection String Pattern:**
```
postgresql://user:password@host:port/database?schema=public
```

**Analysis:**
- ❌ No `connection_limit` parameter in connection string
- ❌ No `pool_timeout` configured
- ❌ No `statement_cache_size` tuning
- ✅ Singleton pattern prevents multiple clients
- ❌ No query timeout (`statement_timeout`)
- ❌ No idle timeout (`idle_in_transaction_session_timeout`)

**Default Prisma Pooling:**
- Pool size: `num_cpus * 2 + 1` (typically 5-10 on serverless)
- Connection lifetime: Unlimited
- Idle timeout: Unlimited

**Serverless Risk:**
- Next.js serverless functions can spawn **hundreds of concurrent instances**
- Each instance gets its own Prisma pool (5-10 connections)
- **Potential connection storm:** 100 instances × 5 connections = **500 DB connections**
- Supabase Postgres default: **Max 100 connections** (varies by plan)

**Mitigation Status:** ❌ No PgBouncer or connection pooler configured

### Observed Query Patterns

**From codebase analysis:**
- **38 `findMany` calls** across 24 API route files
- **46 `include` statements** (eager loading with joins)
- **13 `create` calls** (direct writes)
- Pagination implemented but not enforced globally
- No query result size caps

---

## Query Discipline & Indexing

### Current Index Coverage

**From `prisma/schema.prisma` analysis:**

**Single-Column Indexes (60+):**
- `@@index([organizationId])` - Present on all tenant tables ✅
- `@@index([userId])` - User lookups ✅
- `@@index([status])` - Status filtering ✅
- `@@index([createdAt])` - Time-series queries ✅

**Composite Indexes (Limited):**
```prisma
// Review model - P1-FIX markers indicate recent additions
@@index([repositoryId, createdAt]) // Repository timeline
@@index([repositoryId, status, createdAt]) // Filtered repo queries

// Violation model
@@index([repositoryId, detectedAt]) // Violation history
```

**Unique Constraints:**
- All multi-column uniques create indexes ✅

**Missing Indexes (Identified):**
- ❌ No covering indexes (SELECT without table lookup)
- ❌ No partial indexes (e.g., `WHERE status = 'pending'` only)
- ❌ No indexes for JOIN columns on relations
- ❌ No BRIN indexes for time-series tables (AuditLog, TokenUsage)

### Query Anti-Patterns Detected

**1. N+1 Queries (46 instances of `include`):**
```typescript
// Example: GET /api/dashboard/runs
const runs = await prisma.readyLayerRun.findMany({
  include: { repository: true }, // Joins Repository for each run
})
// Better: Use Prisma's query batching or denormalize hot paths
```

**2. Unbounded Queries:**
```typescript
// Missing default pagination
prisma.review.findMany({ where }) // No take/skip
```

**3. JSON Column Queries:**
```typescript
// Review.issuesFound, Review.result are Json columns
// Querying JSON in Postgres is slower than indexed columns
```

**4. Eager Loading Overhead:**
```typescript
// Dashboard queries load full relations
include: {
  repository: true,
  review: true,
  evidenceBundle: true,
}
// Often only need selected fields
```

---

## Write Pressure & MVCC Concerns

### High-Write Tables (Risk of Bloat)

| Table | Write Pattern | Volume Est. | Bloat Risk | Mitigation |
|-------|--------------|-------------|------------|------------|
| **AuditLog** | Append-only INSERT | High (every action) | Medium | Partitioning candidate |
| **TokenUsage** | INSERT per LLM call | High | Medium | Batch inserts |
| **CostTracking** | Daily UPSERT | Medium | Low | Aggregate offline |
| **Job** | UPDATE (status changes) | High | **High** | Hot row contention |
| **Review** | INSERT + UPDATE (status) | Medium | Medium | Partition by date |

### Write Amplification Pattern

**Example: Single review creation generates 5+ writes:**
1. `Review` INSERT
2. `Violation` INSERT (× N issues found)
3. `EvidenceBundle` INSERT
4. `AuditLog` INSERT
5. `TokenUsage` INSERT
6. `CostTracking` UPSERT

**Problem:** Synchronous writes block response time and amplify write load on primary.

### Hot Row Contention

**Job Table Updates:**
```typescript
// Worker pattern (simplified):
1. UPDATE Job SET status = 'processing' WHERE id = ?
2. ... execute job ...
3. UPDATE Job SET status = 'completed', result = ? WHERE id = ?
```

**Risk:** Multiple workers updating same job rows can cause lock contention.

---

## Operational Guardrails

### Protection Mechanisms (Current)

| Guard | Implemented? | Scope | Failure Mode |
|-------|--------------|-------|--------------|
| **API Rate Limit** | ✅ Yes | 100 req/min per user/IP | 429 response |
| **Query Timeout** | ❌ No | N/A | Hung connections |
| **Result Size Limit** | ❌ No | N/A | OOM on large result sets |
| **Connection Pool Max** | ⚠️  Implicit | Prisma default (~10) | Connection exhaustion |
| **Transaction Timeout** | ❌ No | N/A | Long transactions block vacuum |
| **Circuit Breaker** | ❌ No | N/A | Cascading failures |
| **Backpressure** | ❌ No | N/A | Queue overflow |

### Missing Safeguards

**1. Query Execution Guardrails:**
- No `statement_timeout` (queries can run indefinitely)
- No max rows per query enforcement
- No slow query logging/alerting at app layer

**2. Write Safeguards:**
- No batch size limits on bulk operations
- No write rate limiting (separate from API rate limit)
- No backfill throttling

**3. Connection Management:**
- No max connections per tenant
- No connection draining on deploy
- No connection pool monitoring

---

## Observability & Monitoring

### Current Instrumentation

**Logging:**
- ✅ Pino structured logs (JSON)
- ✅ Query logging in dev (`log: ['query', 'error', 'warn']`)
- ❌ No query logging in production
- ❌ No slow query detection

**Metrics:**
```typescript
// observability/metrics (custom service)
metrics.increment('reviews.completed', { status })
metrics.increment('reviews.issues_found', { severity })
// ...but no DB-specific metrics observed
```

**Missing Metrics:**
- ❌ DB query duration (p50, p95, p99)
- ❌ Connection pool saturation
- ❌ Query cache hit rate (N/A - no cache)
- ❌ Active connections count
- ❌ Transaction duration
- ❌ Lock wait time
- ❌ Index hit rate
- ❌ Tuple fetch ratio (table scans vs index scans)

**Alerting:**
- ❌ No DB performance alerts detected
- ❌ No connection pool alerts
- ❌ No slow query alerts

---

## Read/Write Separation

**Current State:** ❌ **No separation**

All queries (reads + writes) go to Supabase primary connection via Prisma.

**Supabase Read Replicas:**
- Available in Supabase Pro/Team/Enterprise plans
- Requires separate `DIRECT_URL` for writes
- Requires query routing logic in app

**Current Implementation:**
```typescript
// .env.example
DATABASE_URL="postgresql://..." // Used for all operations
// No DIRECT_URL configured (no replica setup)
```

**Gap:** Zero replica usage. All dashboard/analytics queries hit write primary.

---

## Cost & Scaling Metrics

### Current Performance Baseline (Estimated from Code)

| Metric | Current | At 10x Load | At 100x Load |
|--------|---------|-------------|--------------|
| **Concurrent Users** | 10-50 | 500 | 5,000 |
| **API Requests/min** | 100-500 | 5,000 | 50,000 |
| **DB Queries/min** | 500-2,000 | 20,000 | 200,000 |
| **DB Connections** | 5-20 | 50-200 | **500-2,000** ⚠️ |
| **Write IOPS** | 10-50 | 500 | 5,000 |

**Bottleneck Prediction:**
1. **Connection exhaustion** at 10x (500 connections needed, Supabase limit ~100-200)
2. **Primary write saturation** at 10x (write amplification)
3. **Lock contention** on Job table at 10x
4. **Memory exhaustion** on unbounded queries

---

## Security & Compliance Posture

### Strengths ✅
- Strict tenant isolation via `organizationId` filtering in app code
- Supabase RLS enabled as defense-in-depth
- No raw SQL (Prisma ORM prevents SQL injection)
- Audit logging on all mutations
- Secret redaction before LLM calls

### Weaknesses ⚠️
- RLS adds query overhead (~10-20% latency) with no caching
- Audit log writes are synchronous (blocks user response)
- No query result size limits (potential data leak via pagination bypass)

---

## Technology Constraints

### Supabase Postgres Limitations
- **Connection Limit:** 100-500 depending on plan (default: 100)
- **Read Replicas:** Requires Pro plan ($25/month minimum)
- **PgBouncer:** Available but not configured
- **Connection Pooler:** Supabase Pooler available (port 6543)
- **Extensions:** pgvector available (for RAG, currently disabled)

### Prisma ORM Constraints
- No built-in query result streaming (loads all into memory)
- No native read replica support (requires manual connection management)
- Connection pooling is basic (not PgBouncer-level)
- No query plan analysis in app code

---

## Failure Modes Under Load

### Scenario 1: Traffic Spike (10x normal)
1. Serverless functions scale to 100+ instances
2. Each creates 5-10 DB connections
3. **Connection pool exhausted** (Supabase limit reached)
4. New requests fail with "too many connections"
5. Existing connections held by slow queries
6. **Cascading failure:** API returns 500, no graceful degradation

### Scenario 2: Expensive Query Execution
1. User requests large time range for analytics
2. Query scans millions of rows (no limit)
3. Query holds connection for 30+ seconds
4. Other requests queue waiting for connections
5. **Connection starvation** for other tenants
6. No circuit breaker to stop the query

### Scenario 3: Write Storm (Webhook Fanout)
1. Popular repo receives 50 PRs/hour
2. Each PR triggers webhook → job → review
3. Each review writes to 5+ tables
4. **Write primary saturated** (IOPS limit)
5. Job status updates contend for locks
6. Vacuum falls behind on AuditLog bloat
7. **Database performance degradation**

---

## Summary: Scalability Verdict

### Current State
- **Works well for:** Single-tenant workloads, < 50 concurrent users, < 10k queries/hour
- **Breaks at:** 100+ concurrent users, connection storms, large analytics queries
- **Missing:** Caching, connection pooling, read replicas, query guardrails, write buffering

### Most Likely Failure Mode Under 10x Growth
**Connection exhaustion** leading to cascading 500 errors.

### Cost-Effective Next Steps (Before Replicas/Sharding)
1. Configure Supabase connection pooler (PgBouncer mode)
2. Implement server-side caching (Redis for hot queries)
3. Add query timeouts and result size limits
4. Batch audit log writes
5. Add composite indexes for hot query paths
6. Implement circuit breakers for expensive endpoints

### When to Add Replicas
- After implementing caching (to verify read load is high enough to justify cost)
- When read queries exceed 70% of total DB time
- When analytics queries impact transactional performance

### When to Consider Sharding
- **Not yet needed.** Optimize single-DB performance first.
- Consider only when single DB with replicas + caching + pooling cannot handle load
- Requires fundamental architecture changes (tenant routing, cross-shard joins)

---

## Next Steps

Proceed to **Phase 1: Gap Analysis** to evaluate each scaling dimension in detail.
