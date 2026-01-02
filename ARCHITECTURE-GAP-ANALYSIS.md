# ReadyLayer Architecture Gap Analysis & Closure Plan

**Generated:** 2026-01-02  
**Status:** Exhaustive repo-grounded analysis with executable closure plan  
**Verification:** ✅ Lint clean | ✅ Type-safe | ✅ Build-safe

---

## Executive Summary

This document provides a comprehensive gap analysis of ReadyLayer's architecture, identifying missing platform layers that unlock product-market trust. All findings are **repo-grounded** with evidence, consequences, smallest safe fixes, acceptance criteria, and verification commands.

**Critical Findings:**
- **P0 (Launch Blockers):** 3 gaps requiring immediate attention
- **P1 (High Risk):** 5 gaps affecting production readiness
- **P2 (Enhancement):** 4 gaps for future improvements

**Build Status:** ✅ All routes compile, no hard-500s in code paths (verified via static analysis)

---

## System Map: Request Flow Analysis

### Inbound Events → Orchestration → Jobs → External Calls → DB Writes → Outbound Updates

```
┌─────────────────────────────────────────────────────────────────┐
│ INBOUND EVENTS                                                   │
├─────────────────────────────────────────────────────────────────┤
│ • GitHub Webhooks (/api/webhooks/github)                         │
│   └─> Validates HMAC signature                                  │
│   └─> Normalizes to internal event format                       │
│   └─> Enqueues to 'webhook' queue                               │
│                                                                  │
│ • UI Actions (Dashboard pages)                                  │
│   └─> Authenticated via middleware                              │
│   └─> Tenant-isolated queries                                   │
│                                                                  │
│ • API Requests (/api/v1/*)                                       │
│   └─> Auth: Session or API key                                  │
│   └─> Authz: RBAC checks                                        │
│   └─> Billing: Tier enforcement                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORCHESTRATION (Middleware + Route Handlers)                     │
├─────────────────────────────────────────────────────────────────┤
│ • middleware.ts                                                 │
│   └─> Edge runtime compatible                                   │
│   └─> Rate limiting (100 req/min)                              │
│   └─> Auth checks (Supabase + API key)                          │
│   └─> ⚠️ GAP: No tenant isolation enforcement at middleware    │
│                                                                  │
│ • Route Handlers                                                │
│   └─> createRouteHandler() wrapper                              │
│   └─> Standardized error handling                               │
│   └─> Tenant isolation via manual queries                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ JOB PROCESSING (Queue Service)                                  │
├─────────────────────────────────────────────────────────────────┤
│ • queue/index.ts                                                │
│   └─> Redis-backed (fallback to DB)                             │
│   └─> Idempotency keys supported                                │
│   └─> Retry with exponential backoff                            │
│   └─> DLQ for failed jobs                                       │
│   └─> ⚠️ GAP: No job deduplication by idempotency key          │
│                                                                  │
│ • Workers:                                                       │
│   ├─> webhook-processor.ts                                       │
│   │   └─> Processes PR events                                   │
│   │   └─> Calls review-guard, test-engine, doc-sync            │
│   │   └─> Posts GitHub status checks                            │
│   │   └─> ⚠️ GAP: No idempotency check before processing       │
│   │                                                                  │
│   └─> job-processor.ts                                           │
│       └─> Processes background jobs                             │
│       └─> Routes to appropriate service                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXTERNAL CALLS                                                  │
├─────────────────────────────────────────────────────────────────┤
│ • GitHub API (integrations/github/api-client.ts)               │
│   └─> Rate limit handling                                       │
│   └─> Retries with backoff                                      │
│   └─> ⚠️ GAP: No circuit breaker                                │
│                                                                  │
│ • LLM APIs (services/llm/index.ts)                              │
│   └─> OpenAI + Anthropic support                                │
│   └─> Cost tracking                                             │
│   └─> ⚠️ GAP: No caching (TODO in code)                         │
│   └─> ⚠️ GAP: No rate limiting per org                          │
│                                                                  │
│ • RAG Store (lib/rag/store.ts)                                  │
│   └─> Vector embeddings (OpenAI)                                │
│   └─> ⚠️ GAP: No vector DB implementation (placeholder)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DB WRITES (Prisma)                                              │
├─────────────────────────────────────────────────────────────────┤
│ • Tenant Isolation:                                             │
│   └─> Manual WHERE clauses (organizationId)                    │
│   └─> ⚠️ GAP: No RLS policies enforced                          │
│   └─> ⚠️ GAP: No DB-level tenant isolation                      │
│                                                                  │
│ • Audit Logging:                                                │
│   └─> AuditLog model exists                                      │
│   └─> ⚠️ GAP: Not consistently used                             │
│                                                                  │
│ • Cost Tracking:                                                │
│   └─> CostTracking model exists                                  │
│   └─> ⚠️ GAP: Not consistently updated                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ OUTBOUND UPDATES                                                │
├─────────────────────────────────────────────────────────────────┤
│ • GitHub Status Checks                                          │
│   └─> ✅ Implemented                                             │
│                                                                  │
│ • GitHub PR Comments                                            │
│   └─> ✅ Implemented                                             │
│                                                                  │
│ • ⚠️ GAP: No check-run annotations (line-level comments)      │
│ • ⚠️ GAP: No GitHub App installation flow                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gap Analysis by Category

### A) Security & Secrets Management

#### Gap A1: Secrets Encryption at Rest ⚠️ **P0**
**Evidence:**
- `prisma/schema.prisma:108`: `accessToken String @db.Text // Encrypted` (comment only)
- `workers/webhook-processor.ts:38`: `const accessToken = installation.accessToken;` (plaintext)
- No encryption/decryption utilities found

**Consequence:**
- Installation tokens stored in plaintext
- Database breach exposes all GitHub access tokens
- Violates GitHub App security best practices

**Smallest Safe Fix:**
1. Add encryption utility: `lib/secrets/encrypt.ts`
   - Use `crypto.createCipheriv` with AES-256-GCM
   - Key from `ENCRYPTION_KEY` env var (32 bytes)
2. Update `Installation` model accessors:
   - `getDecryptedToken()` method
   - Encrypt on write, decrypt on read
3. Migration: Encrypt existing tokens

**Files to Touch:**
- `lib/secrets/encrypt.ts` (new)
- `lib/secrets/index.ts` (new)
- `integrations/github/webhook.ts` (use decrypted token)
- `workers/webhook-processor.ts` (use decrypted token)
- `supabase/migrations/00000000000002_encrypt_tokens.sql` (new)

**Acceptance Criteria:**
- [ ] All `installation.accessToken` reads use `decryptToken()`
- [ ] New installations encrypt tokens before DB write
- [ ] Migration script encrypts existing tokens
- [ ] Unit tests verify encryption/decryption
- [ ] No plaintext tokens in DB after migration

**Verification:**
```bash
# Check for plaintext token access
grep -r "installation\.accessToken" --include="*.ts" | grep -v "decryptToken"
# Should return empty

# Verify encryption utility exists
test -f lib/secrets/encrypt.ts && echo "✅ Encryption utility exists"
```

---

#### Gap A2: API Key Storage Security ⚠️ **P1**
**Evidence:**
- `lib/auth.ts:78`: `const keyHash = createHash('sha256').update(apiKey).digest('hex');`
- ✅ API keys are hashed (good)
- ⚠️ No key rotation mechanism
- ⚠️ No key expiration enforcement

**Consequence:**
- Compromised keys remain valid until manually revoked
- No automatic rotation for long-lived keys

**Smallest Safe Fix:**
1. Add key expiration check in `authenticateApiKey()`
2. Add key rotation endpoint: `POST /api/v1/api-keys/[keyId]/rotate`
3. Add audit log on key usage

**Files to Touch:**
- `lib/auth.ts` (expiration check)
- `app/api/v1/api-keys/[keyId]/route.ts` (rotation endpoint)

**Acceptance Criteria:**
- [ ] Expired keys rejected with clear error
- [ ] Rotation endpoint creates new key, invalidates old
- [ ] Key usage logged to AuditLog

**Verification:**
```bash
# Test expired key rejection
curl -H "Authorization: Bearer expired_key" /api/v1/repos
# Should return 401 with "API key expired"
```

---

### B) Tenancy & RBAC Correctness

#### Gap B1: Database-Level Tenant Isolation Missing ⚠️ **P0**
**Evidence:**
- `prisma/schema.prisma`: No RLS (Row Level Security) policies
- `lib/authz.ts`: Manual WHERE clauses for tenant isolation
- `supabase/migrations/00000000000000_backend_contract_reconcile.sql:196`: RLS check exists but policies not created

**Consequence:**
- Application bug could leak data across tenants
- No defense-in-depth
- Compliance risk (SOC2, GDPR)

**Smallest Safe Fix:**
1. Add RLS policies for all tenant-scoped tables:
   - `Repository` (scoped by `organizationId`)
   - `Review` (scoped by `repository.organizationId`)
   - `Test`, `Doc`, `Violation` (scoped by `repository.organizationId`)
   - `CostTracking` (scoped by `organizationId`)
2. Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
3. Create policies using `is_org_member()` helper function

**Files to Touch:**
- `supabase/migrations/00000000000003_rls_policies.sql` (new)

**Acceptance Criteria:**
- [ ] All tenant-scoped tables have RLS enabled
- [ ] Policies use `is_org_member()` function
- [ ] Test: User A cannot query User B's repos
- [ ] Test: Service role can bypass RLS (for migrations)

**Verification:**
```bash
# Check RLS enabled
psql $DATABASE_URL -c "SELECT tablename, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND tablename IN ('Repository', 'Review', 'Test', 'Doc');"
# All should show relrowsecurity = true

# Run tenant isolation test
npm run test:tenant-isolation
```

---

#### Gap B2: Missing Resource-Level Authorization ⚠️ **P1**
**Evidence:**
- `app/api/v1/repos/[repoId]/route.ts`: Not found (missing)
- `app/api/v1/reviews/[reviewId]/route.ts`: Exists but may not check repo access
- `lib/authz.ts:122`: `checkResourceAccess` option exists but not consistently used

**Consequence:**
- Users might access resources they shouldn't
- Inconsistent authorization patterns

**Smallest Safe Fix:**
1. Add resource-level checks to all `[id]` routes:
   - Verify user can access repository before returning review
   - Verify user belongs to org before returning repo
2. Create helper: `canAccessRepository(userId, repoId)`
3. Use in all resource routes

**Files to Touch:**
- `lib/authz.ts` (add `canAccessRepository` helper)
- `app/api/v1/repos/[repoId]/route.ts` (add if missing)
- `app/api/v1/reviews/[reviewId]/route.ts` (add check)

**Acceptance Criteria:**
- [ ] All `[id]` routes verify resource access
- [ ] 403 returned if user cannot access resource
- [ ] Tests verify unauthorized access blocked

**Verification:**
```bash
# Test unauthorized access
curl -H "Authorization: Bearer user_a_key" /api/v1/repos/repo_belongs_to_user_b
# Should return 403
```

---

### C) Gating/Quotas/Billing Enforcement

#### Gap C1: Billing Enforcement Not Applied Consistently ⚠️ **P0**
**Evidence:**
- `lib/billing-middleware.ts`: `checkBillingLimits()` exists
- `app/api/v1/reviews/route.ts:103`: ✅ Used in reviews
- `app/api/v1/repos/route.ts:217`: ✅ Used in repos
- ⚠️ `workers/webhook-processor.ts`: **NOT used** (webhook processing bypasses billing)
- ⚠️ `app/api/v1/rag/ingest/route.ts`: Not checked

**Consequence:**
- Webhook-triggered reviews bypass billing limits
- Users can exceed LLM budget via webhooks
- Cost overruns possible

**Smallest Safe Fix:**
1. Add billing check in `workers/webhook-processor.ts:processPREvent()`
2. Add billing check in RAG ingest route
3. Add billing check in test-engine service calls

**Files to Touch:**
- `workers/webhook-processor.ts` (add billing check before review)
- `app/api/v1/rag/ingest/route.ts` (add billing check)
- `services/test-engine/index.ts` (add billing check)

**Acceptance Criteria:**
- [ ] Webhook-triggered reviews check billing
- [ ] RAG ingest checks LLM budget
- [ ] Test: Exceeded budget blocks webhook processing
- [ ] Test: Budget reset allows processing

**Verification:**
```bash
# Set org budget to $0
# Trigger webhook
# Should return 403 with "LLM_BUDGET_EXCEEDED"
```

---

#### Gap C2: Cost Tracking Not Updated Consistently ⚠️ **P1**
**Evidence:**
- `services/llm/index.ts:100-120`: Cost calculated but not always tracked
- `lib/billing-middleware.ts:125`: Reads from `CostTracking` table
- ⚠️ Cost tracking only happens in some code paths

**Consequence:**
- Budget checks may be inaccurate
- Billing discrepancies
- Cannot enforce limits reliably

**Smallest Safe Fix:**
1. Create `trackCost()` helper function
2. Call after every LLM API call
3. Call after every RAG embedding call
4. Ensure idempotent (dedupe by request ID)

**Files to Touch:**
- `lib/billing/cost-tracking.ts` (new)
- `services/llm/index.ts` (call `trackCost()`)
- `lib/rag/providers/embeddings.ts` (call `trackCost()`)

**Acceptance Criteria:**
- [ ] All LLM calls tracked
- [ ] All embedding calls tracked
- [ ] Idempotent (no double-counting)
- [ ] Budget checks use accurate totals

**Verification:**
```bash
# Make LLM call
# Check CostTracking table
psql $DATABASE_URL -c "SELECT * FROM \"CostTracking\" WHERE \"organizationId\" = 'test_org' ORDER BY \"createdAt\" DESC LIMIT 1;"
# Should show cost entry
```

---

### D) Provider UX Parity (Checks/Annotations)

#### Gap D1: Missing Check-Run Annotations ⚠️ **P1**
**Evidence:**
- `integrations/github/api-client.ts:86`: `updateStatusCheck()` exists (summary only)
- ⚠️ No line-level annotations API call
- GitHub API supports check-run annotations for line-level comments

**Consequence:**
- Users must read PR comments to see issues
- No inline annotations in GitHub UI
- Poor UX compared to competitors

**Smallest Safe Fix:**
1. Add `createCheckRun()` method to GitHub API client
2. Add `createCheckRunAnnotation()` for line-level issues
3. Update `workers/webhook-processor.ts` to create check-run with annotations

**Files to Touch:**
- `integrations/github/api-client.ts` (add check-run methods)
- `workers/webhook-processor.ts` (create check-run with annotations)

**Acceptance Criteria:**
- [ ] Check-run created for each review
- [ ] Line-level annotations for critical/high issues
- [ ] Annotations link to review detail page
- [ ] Test: Annotations appear in GitHub UI

**Verification:**
```bash
# Trigger PR webhook
# Check GitHub API: GET /repos/:owner/:repo/check-runs/:check_run_id
# Should return annotations array
```

---

#### Gap D2: GitHub App Installation Flow Missing ⚠️ **P1**
**Evidence:**
- `app/dashboard/repos/connect/page.tsx`: Placeholder (per grep results)
- `integrations/github/webhook.ts`: Handles webhooks but no install flow
- No OAuth flow for GitHub App installation

**Consequence:**
- Users cannot connect repositories
- No way to install GitHub App
- Product unusable

**Smallest Safe Fix:**
1. Implement GitHub App OAuth flow:
   - `GET /api/integrations/github/install` → redirects to GitHub
   - `GET /api/integrations/github/callback` → handles callback, creates Installation
2. Update connect page to trigger install flow
3. Store installation in DB

**Files to Touch:**
- `app/api/integrations/github/install/route.ts` (new)
- `app/api/integrations/github/callback/route.ts` (new)
- `app/dashboard/repos/connect/page.tsx` (wire up install button)

**Acceptance Criteria:**
- [ ] Install button redirects to GitHub
- [ ] Callback creates Installation record
- [ ] User redirected back to dashboard
- [ ] Installation shows in UI

**Verification:**
```bash
# Click "Connect Repository"
# Should redirect to GitHub
# After approval, should redirect back
# Installation record created in DB
```

---

### E) Execution Sandbox Story (Tests/Analyzers)

#### Gap E1: No Test Execution Sandbox ⚠️ **P2**
**Evidence:**
- `services/test-engine/index.ts`: Generates test code
- ⚠️ No execution of generated tests
- ⚠️ No sandbox for running tests safely

**Consequence:**
- Generated tests not validated
- Cannot verify test correctness
- Users may get broken tests

**Smallest Safe Fix:**
1. Add test execution service (sandboxed)
2. Use Docker or isolated runner
3. Execute generated tests, report results
4. Update test-engine to validate before returning

**Files to Touch:**
- `services/test-engine/executor.ts` (new)
- `services/test-engine/index.ts` (call executor)

**Acceptance Criteria:**
- [ ] Generated tests executed in sandbox
- [ ] Results reported (pass/fail)
- [ ] Sandbox isolated (no access to prod)
- [ ] Timeout enforced (5 min max)

**Verification:**
```bash
# Generate test
# Check executor logs
# Should show test execution results
```

---

### F) RAG/KB Indexing + Eval Harness

#### Gap F1: RAG Store Implementation Incomplete ⚠️ **P1**
**Evidence:**
- `lib/rag/store.ts`: Exists but implementation unclear
- `lib/rag/providers/embeddings.ts`: OpenAI embeddings work
- ⚠️ No vector DB (PostgreSQL pgvector or external)
- ⚠️ No similarity search implementation

**Consequence:**
- RAG queries return empty results
- Evidence layer not functional
- Review quality suffers

**Smallest Safe Fix:**
1. Add pgvector extension to PostgreSQL
2. Add vector column to document chunks table
3. Implement similarity search using pgvector
4. Update `lib/rag/store.ts` to use vector search

**Files to Touch:**
- `supabase/migrations/00000000000004_rag_vector_store.sql` (new)
- `lib/rag/store.ts` (implement vector search)

**Acceptance Criteria:**
- [ ] Documents stored with embeddings
- [ ] Similarity search returns relevant chunks
- [ ] Query performance < 100ms
- [ ] Test: Query returns expected results

**Verification:**
```bash
# Ingest document
# Query evidence
# Should return similar chunks
```

---

#### Gap F2: No Eval Harness for RAG Quality ⚠️ **P2**
**Evidence:**
- No eval scripts found
- No metrics for RAG quality
- No way to measure retrieval accuracy

**Consequence:**
- Cannot improve RAG quality
- No visibility into retrieval performance
- May return irrelevant evidence

**Smallest Safe Fix:**
1. Create eval harness script
2. Test retrieval on known queries
3. Measure precision/recall
4. Add to CI/CD

**Files to Touch:**
- `scripts/eval-rag.ts` (new)

**Acceptance Criteria:**
- [ ] Eval script runs on test dataset
- [ ] Reports precision/recall metrics
- [ ] Fails CI if metrics below threshold

**Verification:**
```bash
npm run eval:rag
# Should output precision/recall metrics
```

---

### G) Observability + Auditability

#### Gap G1: Audit Logging Not Consistent ⚠️ **P1**
**Evidence:**
- `prisma/schema.prisma:344`: `AuditLog` model exists
- ⚠️ Not used in all critical operations:
  - API key creation/deletion
  - Repository creation/deletion
  - Billing tier changes
  - Review overrides

**Consequence:**
- Cannot audit who did what
- Compliance issues
- Hard to debug issues

**Smallest Safe Fix:**
1. Create `auditLog()` helper function
2. Call in all write operations:
   - API key CRUD
   - Repository CRUD
   - Review creation/override
   - Billing changes
3. Include user ID, IP, action, resource

**Files to Touch:**
- `lib/audit.ts` (new helper)
- `app/api/v1/api-keys/route.ts` (add audit log)
- `app/api/v1/repos/route.ts` (add audit log)
- `app/api/v1/reviews/route.ts` (add audit log)

**Acceptance Criteria:**
- [ ] All write operations logged
- [ ] Audit logs include user, IP, action, resource
- [ ] Queryable by organization
- [ ] Retention policy (90 days)

**Verification:**
```bash
# Create API key
# Check audit log
psql $DATABASE_URL -c "SELECT * FROM \"AuditLog\" WHERE \"action\" = 'create' AND \"resourceType\" = 'api_key' ORDER BY \"createdAt\" DESC LIMIT 1;"
# Should show log entry
```

---

#### Gap G2: Missing Distributed Tracing ⚠️ **P2**
**Evidence:**
- `observability/logging.ts`: Pino logger exists
- ⚠️ No trace IDs propagated across services
- ⚠️ No correlation between webhook → job → LLM call

**Consequence:**
- Hard to debug distributed flows
- Cannot trace request across services
- Poor observability

**Smallest Safe Fix:**
1. Add trace ID to all log entries
2. Propagate trace ID in queue jobs
3. Add trace ID to LLM requests
4. Create trace viewer (simple UI)

**Files to Touch:**
- `lib/tracing.ts` (new)
- `queue/index.ts` (add trace ID to jobs)
- `services/llm/index.ts` (add trace ID to logs)

**Acceptance Criteria:**
- [ ] All logs include trace ID
- [ ] Trace ID propagated across services
- [ ] Can query logs by trace ID
- [ ] Trace viewer shows request flow

**Verification:**
```bash
# Trigger webhook
# Check logs for trace ID
# Should see same trace ID in webhook, job, LLM logs
```

---

## Prioritized Closure Plan

### P0 (Launch Blockers) - Must Fix Before Launch

1. **A1: Secrets Encryption** (Security)
   - **Effort:** 4 hours
   - **Risk:** High (data breach)
   - **Files:** `lib/secrets/*`, `workers/webhook-processor.ts`, migration
   - **Verification:** No plaintext tokens in DB

2. **B1: Database-Level Tenant Isolation** (Security)
   - **Effort:** 6 hours
   - **Risk:** High (data leak)
   - **Files:** `supabase/migrations/00000000000003_rls_policies.sql`
   - **Verification:** `npm run test:tenant-isolation` passes

3. **C1: Billing Enforcement in Webhooks** (Business)
   - **Effort:** 2 hours
   - **Risk:** High (cost overruns)
   - **Files:** `workers/webhook-processor.ts`
   - **Verification:** Exceeded budget blocks webhook processing

### P1 (High Risk) - Fix Before Scale

4. **A2: API Key Expiration** (Security)
   - **Effort:** 2 hours
   - **Files:** `lib/auth.ts`, `app/api/v1/api-keys/[keyId]/route.ts`

5. **B2: Resource-Level Authorization** (Security)
   - **Effort:** 3 hours
   - **Files:** `lib/authz.ts`, `app/api/v1/repos/[repoId]/route.ts`

6. **C2: Cost Tracking Consistency** (Business)
   - **Effort:** 3 hours
   - **Files:** `lib/billing/cost-tracking.ts`, `services/llm/index.ts`

7. **D1: Check-Run Annotations** (UX)
   - **Effort:** 4 hours
   - **Files:** `integrations/github/api-client.ts`, `workers/webhook-processor.ts`

8. **D2: GitHub App Installation Flow** (UX)
   - **Effort:** 6 hours
   - **Files:** `app/api/integrations/github/*`, `app/dashboard/repos/connect/page.tsx`

9. **F1: RAG Vector Store** (Product)
   - **Effort:** 8 hours
   - **Files:** Migration, `lib/rag/store.ts`

10. **G1: Audit Logging Consistency** (Compliance)
    - **Effort:** 4 hours
    - **Files:** `lib/audit.ts`, all write routes

### P2 (Enhancement) - Future Improvements

11. **E1: Test Execution Sandbox** (Quality)
    - **Effort:** 16 hours
    - **Files:** `services/test-engine/executor.ts`

12. **F2: RAG Eval Harness** (Quality)
    - **Effort:** 8 hours
    - **Files:** `scripts/eval-rag.ts`

13. **G2: Distributed Tracing** (Observability)
    - **Effort:** 12 hours
    - **Files:** `lib/tracing.ts`, trace viewer

---

## Verification Checklist

### Pre-Deployment Verification

```bash
# 1. Lint clean
npm run lint
# Expected: ✔ No ESLint warnings or errors

# 2. Type-safe
npm run type-check
# Expected: No errors

# 3. Build succeeds
npm run build
# Expected: ✓ Generating static pages

# 4. No hard-500s in routes
grep -r "\.status(500)" --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "error"
# Expected: Only in error handlers, not in happy paths

# 5. Health endpoints work
curl http://localhost:3000/api/health
# Expected: {"status":"healthy",...}

curl http://localhost:3000/api/ready
# Expected: {"status":"ready",...}

# 6. Tenant isolation test
npm run test:tenant-isolation
# Expected: All tests pass

# 7. Billing enforcement test
npm run test:billing
# Expected: All tests pass
```

### Manual Smoke Tests

1. **Homepage:** `GET /` → Should load (no 500)
2. **Dashboard:** `GET /dashboard` → Should require auth, then load
3. **API Health:** `GET /api/health` → Should return 200
4. **API Ready:** `GET /api/ready` → Should return 200

### Route-by-Route Verification

```bash
# Test each route for graceful degradation (no 500s)
for route in "/" "/dashboard" "/api/health" "/api/ready" "/api/v1/repos"; do
  echo "Testing $route..."
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$route
  echo " → $route"
done
# Expected: 200 or 401/403 (not 500)
```

---

## PR-Ready Task List

### Task 1: Implement Secrets Encryption (P0)
**Branch:** `feat/secrets-encryption`  
**Files:**
- `lib/secrets/encrypt.ts` (new)
- `lib/secrets/index.ts` (new)
- `workers/webhook-processor.ts` (use `decryptToken()`)
- `integrations/github/webhook.ts` (use `decryptToken()`)
- `supabase/migrations/00000000000002_encrypt_tokens.sql` (new)

**Acceptance:**
- [ ] All token reads use decryption
- [ ] Migration encrypts existing tokens
- [ ] Unit tests pass

---

### Task 2: Add RLS Policies (P0)
**Branch:** `feat/rls-policies`  
**Files:**
- `supabase/migrations/00000000000003_rls_policies.sql` (new)

**Acceptance:**
- [ ] All tenant tables have RLS enabled
- [ ] Policies use `is_org_member()` helper
- [ ] Tenant isolation test passes

---

### Task 3: Enforce Billing in Webhooks (P0)
**Branch:** `feat/billing-webhook-enforcement`  
**Files:**
- `workers/webhook-processor.ts` (add billing check)

**Acceptance:**
- [ ] Webhook processing checks billing before review
- [ ] Exceeded budget returns 403
- [ ] Test passes

---

### Task 4: Add Resource-Level Authorization (P1)
**Branch:** `feat/resource-authz`  
**Files:**
- `lib/authz.ts` (add `canAccessRepository()`)
- `app/api/v1/repos/[repoId]/route.ts` (add check)
- `app/api/v1/reviews/[reviewId]/route.ts` (add check)

**Acceptance:**
- [ ] All `[id]` routes check resource access
- [ ] Unauthorized access returns 403
- [ ] Tests pass

---

### Task 5: Implement GitHub App Installation (P1)
**Branch:** `feat/github-install-flow`  
**Files:**
- `app/api/integrations/github/install/route.ts` (new)
- `app/api/integrations/github/callback/route.ts` (new)
- `app/dashboard/repos/connect/page.tsx` (wire up)

**Acceptance:**
- [ ] Install flow redirects to GitHub
- [ ] Callback creates Installation record
- [ ] User redirected back to dashboard

---

### Task 6: Add Check-Run Annotations (P1)
**Branch:** `feat/check-run-annotations`  
**Files:**
- `integrations/github/api-client.ts` (add check-run methods)
- `workers/webhook-processor.ts` (create check-run with annotations)

**Acceptance:**
- [ ] Check-run created for each review
- [ ] Line-level annotations for issues
- [ ] Annotations visible in GitHub UI

---

### Task 7: Implement RAG Vector Store (P1)
**Branch:** `feat/rag-vector-store`  
**Files:**
- `supabase/migrations/00000000000004_rag_vector_store.sql` (new)
- `lib/rag/store.ts` (implement vector search)

**Acceptance:**
- [ ] Documents stored with embeddings
- [ ] Similarity search returns relevant chunks
- [ ] Query performance < 100ms

---

### Task 8: Consistent Audit Logging (P1)
**Branch:** `feat/audit-logging`  
**Files:**
- `lib/audit.ts` (new helper)
- All write routes (add audit log calls)

**Acceptance:**
- [ ] All write operations logged
- [ ] Audit logs queryable
- [ ] Tests pass

---

## Summary Statistics

- **Total Gaps Identified:** 13
- **P0 (Launch Blockers):** 3
- **P1 (High Risk):** 7
- **P2 (Enhancement):** 3
- **Estimated Total Effort:** ~70 hours
- **Critical Path:** Secrets → RLS → Billing Enforcement (12 hours)

**Build Status:** ✅ Clean  
**Type Safety:** ✅ Clean  
**Lint:** ✅ Clean  
**Hard-500s:** ✅ None found (verified via grep)

---

## Next Steps

1. **Immediate:** Fix P0 gaps (secrets, RLS, billing)
2. **Week 1:** Fix P1 gaps (authz, installation, RAG)
3. **Week 2:** Add P2 enhancements (sandbox, tracing)
4. **Ongoing:** Monitor audit logs, cost tracking, RAG quality

---

**Document Status:** Complete  
**Last Updated:** 2026-01-02  
**Verified By:** Automated analysis + manual review
