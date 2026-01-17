# ReadyLayer Security & Performance Review Plan

**Review Date:** 2026-01-17
**Status:** In Progress
**Reviewers:** Principal Engineer, Security Reviewer, Performance Specialist

---

## Executive Summary

ReadyLayer is a well-architected Next.js application with strong foundational security patterns (Prisma ORM, Supabase Auth, secret redaction, RBAC). However, critical gaps exist in:
- **CI/CD**: Tests never execute in pipelines
- **Race Conditions**: Async job queueing creates timing vulnerabilities
- **Distributed Systems**: In-memory caching/rate limiting fails under load
- **Database Performance**: N+1 queries and missing indexes
- **Test Coverage**: Only 9% of services have unit tests

**Risk Level:** 🔴 HIGH - Production stability and security at risk

---

## Priority Buckets

### 🔴 P0 - CRITICAL (Must Fix Immediately)

These issues can cause **data corruption, security vulnerabilities, or production outages**.

#### P0-1: Review Guard Async Job Race Condition
- **File:** `/services/review-guard/index.ts:172-180`
- **Issue:** Job created with empty review ID before review inserted in database
- **Impact:** If job processes before review created → database constraint violation
- **Fix:** Insert review first, then queue job with valid review ID
- **Verification:** Add integration test for concurrent job processing
- **Est. Effort:** 30 min

#### P0-2: Tests Not Running in CI/CD
- **Files:** `.github/workflows/quality.yml`, `.github/workflows/lint-typecheck.yml`
- **Issue:** Neither unit tests (Vitest) nor E2E tests (Playwright) execute in any pipeline
- **Impact:** Broken tests, regressions, security issues can reach production undetected
- **Fix:** Add test execution steps to quality gates
- **Verification:** Break a test and verify CI fails
- **Est. Effort:** 1 hour

#### P0-3: In-Memory LLM Cache (Not Distributed)
- **File:** `/lib/cache/llm-cache.ts`
- **Issue:** Uses `Map<string, CachedLLMResponse>` instead of Redis
- **Impact:**
  - Cache not shared across server instances (horizontal scaling breaks)
  - Lost on restart/deployment (cache warming overhead)
  - Memory leak potential (no eviction limit)
- **Fix:** Switch to Redis-backed cache (pattern exists in `lib/rag/cache-redis.ts`)
- **Verification:** Load test with multiple instances
- **Est. Effort:** 2 hours

#### P0-4: In-Memory Rate Limiting (Not Distributed)
- **File:** `/lib/rate-limiting/index.ts`
- **Issue:** Uses `Map<string, RateLimitEntry>` instead of Redis
- **Impact:**
  - Not shared across instances (attackers bypass by targeting different servers)
  - Memory leak (cleanup only runs every 60s)
- **Fix:** Switch to Redis-backed rate limiter (use `rate-limiter-flexible` package with Redis)
- **Verification:** Test distributed rate limiting with 2+ instances
- **Est. Effort:** 1.5 hours

#### P0-5: N+1 Query in Self-Learning Service
- **File:** `/services/self-learning/index.ts:249-272`
- **Issue:** Loop-based upserts execute N separate database queries
  ```typescript
  for (const insight of insights) {
    await prisma.aggregatedInsight.upsert({...})  // N queries
  }
  ```
- **Impact:** If 100 insights generated → 100 DB round-trips (2-5 second delay)
- **Fix:** Use `createMany()` with batch operations or transaction with bulk upsert
- **Verification:** Add unit test with 100 insights, measure query count
- **Est. Effort:** 1 hour

---

### 🟠 P1 - HIGH (Security/Stability Risks)

These issues create **exploitable vulnerabilities or reliability problems** under load.

#### P1-1: API Key Scope Validation Inconsistency
- **File:** `/lib/authz.ts:38-58`
- **Issue:** Session-based auth defaults to `['read']` scope without verifying existing user roles
- **Risk:** Potential privilege escalation if scope checks bypassed
- **Fix:** Audit all scope validation paths, ensure consistent RBAC checks
- **Verification:** Add authorization matrix tests (all roles × all endpoints)
- **Est. Effort:** 3 hours

#### P1-2: Legacy Plaintext Token Support
- **File:** `/lib/secrets/encrypt.ts:84-88`
- **Issue:** Decryption accepts plaintext tokens for migration compatibility
  ```typescript
  if (!encrypted.includes(':')) { return encrypted; }  // Plaintext passthrough
  ```
- **Risk:** If encryption key compromised, legacy plaintext tokens exposed
- **Fix:**
  1. Migrate all plaintext tokens (use `scripts/migrate-tokens.ts`)
  2. Remove plaintext fallback
  3. Add strict validation requiring encrypted format
- **Verification:** Search database for non-encrypted tokens, verify zero results
- **Est. Effort:** 2 hours

#### P1-3: Missing Database Composite Indexes
- **File:** `/prisma/schema.prisma`
- **Issue:** Dashboard queries filter by `(repositoryId, createdAt)` but no composite index exists
- **Impact:** Table scans on large datasets (1000+ reviews → 500ms+ latency)
- **Fix:** Add composite indexes:
  - `@@index([repositoryId, createdAt])` on Review
  - `@@index([repositoryId, status, createdAt])` on Review
  - `@@index([repositoryId, detectedAt])` on Violation
- **Verification:** Use `EXPLAIN ANALYZE` to verify index usage
- **Est. Effort:** 1 hour

#### P1-4: Dashboard Findings Query N+1 Pattern
- **File:** `/app/api/dashboard/findings/route.ts:73-107`
- **Issue:** Two-step query loads violations with nested relations, then fetches runs separately
- **Impact:** 1 + N queries for N violations (50 violations → 51 queries)
- **Fix:** Use single-pass loading with Prisma's nested `include` or batch `findMany`
- **Verification:** Log query count, verify single batch load
- **Est. Effort:** 1.5 hours

#### P1-5: Untested Critical Services
- **Files:** `services/billing/`, `services/llm/`, `services/governance-engine/`
- **Issue:** Only 3 of 34 services have unit tests (9% coverage)
- **Risk:** Billing errors, LLM failures, governance bugs go undetected
- **Fix:** Add unit tests for:
  1. `services/billing/` - Cost calculation, Stripe integration
  2. `services/llm/` - Multi-provider fallback, timeout handling
  3. `services/governance-engine/` - Run orchestration
- **Verification:** Coverage report shows >60% line coverage for these services
- **Est. Effort:** 6 hours

---

### 🟡 P2 - MEDIUM (Tech Debt, Maintainability)

These issues create **maintenance burden or optimization opportunities** but don't pose immediate risk.

#### P2-1: Installation Deletion Race Condition
- **File:** `/integrations/github/webhook.ts:87-94`
- **Issue:** Installation lookup not synchronized with webhook processing
- **Risk:** Installation deleted between validation and event processing (rare but possible)
- **Fix:** Add version check or transaction on Installation record
- **Verification:** Add concurrent test deleting installation during webhook
- **Est. Effort:** 1 hour

#### P2-2: API Key Validation Should Use Zod
- **File:** `/app/api/v1/api-keys/route.ts:33-72`
- **Issue:** Manual type checking instead of Zod schema (inconsistent pattern)
  ```typescript
  if (!body || typeof body !== 'object') { ... }
  (body as Record<string, unknown>)
  ```
- **Fix:** Replace with Zod schema like `/api/v1/reviews/route.ts`
- **Verification:** Add input validation tests for malformed requests
- **Est. Effort:** 45 min

#### P2-3: Synchronous Cost Tracking Adds Latency
- **File:** `/services/llm/index.ts:149-182`
- **Issue:** `await trackCost()` called during LLM response (adds 50-100ms)
- **Fix:** Queue cost tracking asynchronously with background job
- **Verification:** Measure LLM response time before/after
- **Est. Effort:** 2 hours

#### P2-4: Daily Usage Limit Timezone Handling
- **File:** `/lib/usage-enforcement.ts:65-66`
- **Issue:** Daily resets in server timezone, not user timezone
- **Risk:** Teams in different timezones see inconsistent reset times
- **Fix:** Store organization timezone preference, reset per timezone
- **Verification:** Add test with multiple org timezones
- **Est. Effort:** 2 hours

#### P2-5: Hardcoded Query Limits Without Pagination
- **File:** `/services/self-learning/index.ts:138-142, 449-455`
- **Issue:** `take: 1000`, `take: 10000` limits with no offset/pagination
- **Risk:** For large orgs, loads massive result sets into memory (OOM possible)
- **Fix:** Implement cursor-based pagination or windowing
- **Verification:** Load test with 50,000 records
- **Est. Effort:** 3 hours

#### P2-6: Missing Code Splitting on Landing Page
- **File:** `/components/landing/*`
- **Issue:** All landing components statically imported (increases initial bundle size)
- **Fix:** Lazy load below-the-fold components with `next/dynamic`
- **Verification:** Lighthouse score, bundle size analysis
- **Est. Effort:** 1 hour

---

### 🟢 P3 - LOW (Nice-to-Have, Best Practices)

These are **improvements and optimizations** that enhance quality but aren't urgent.

#### P3-1: Add Pre-commit Hooks
- **Issue:** No Husky configuration, developers can commit failing tests
- **Fix:** Install Husky, add pre-commit hooks for lint + type-check + tests
- **Verification:** Try committing broken code
- **Est. Effort:** 30 min

#### P3-2: Bundle Analysis Tooling
- **Issue:** No webpack-bundle-analyzer or @next/bundle-analyzer configured
- **Fix:** Add to Next.js config, integrate with CI/CD
- **Verification:** Generate bundle report
- **Est. Effort:** 30 min

#### P3-3: API Response Field Filtering
- **File:** `/app/api/v1/reviews/route.ts`, `/app/api/dashboard/findings/route.ts`
- **Issue:** Returns all fields even when client only needs subset
- **Fix:** Implement `select` parameter for field filtering
- **Verification:** Measure response payload size reduction
- **Est. Effort:** 2 hours

#### P3-4: LRU Cache Eviction Instead of FIFO
- **File:** `/lib/cache/llm-cache.ts:91-98`
- **Issue:** FIFO eviction (removes oldest entry, not least recently used)
- **Fix:** Track last access timestamp, evict LRU entries
- **Verification:** Add cache eviction test
- **Est. Effort:** 1 hour

#### P3-5: Circuit Breaker for LLM Providers
- **File:** `/services/review-guard/async-processor.ts:40-95`
- **Issue:** No circuit breaker on LLM failures (repeated timeout attempts)
- **Fix:** Implement circuit breaker pattern (fail fast after N failures)
- **Verification:** Load test with failing LLM provider
- **Est. Effort:** 2 hours

#### P3-6: Component Memoization Audit
- **Files:** `/components/dashboard/*`
- **Issue:** Some list components may cause unnecessary re-renders
- **Fix:** Add `React.memo()` wrappers to expensive components
- **Verification:** React DevTools Profiler analysis
- **Est. Effort:** 2 hours

---

## Testing Requirements

Each fix MUST include:

1. **Unit Tests** (if code path testable in isolation)
   - Happy path
   - Error cases
   - Edge cases (empty data, large data, concurrent access)

2. **Integration Tests** (if involves multiple services/database)
   - End-to-end flow
   - Race condition scenarios
   - Rollback/cleanup verification

3. **Performance Tests** (if performance-critical)
   - Load test with realistic data volumes
   - Measure before/after metrics
   - Verify no regression

4. **Security Tests** (if security-critical)
   - Privilege escalation attempts
   - Input validation fuzzing
   - Rate limit bypass attempts

---

## Rollback Plan

For each production change:

1. **Database Migrations:** Use Prisma's migration system with revert scripts
2. **Code Changes:** Feature flags for critical paths (LLM cache, rate limiting)
3. **Configuration:** Environment variable toggles for fallback behavior
4. **Monitoring:** Set up alerts for error rate spikes, latency increases

---

## Acceptance Criteria

### P0 Tasks Complete When:
- [ ] All tests pass in CI/CD (not just locally)
- [ ] Review Guard jobs process successfully under concurrent load
- [ ] LLM cache shared across 2+ server instances (verified via load test)
- [ ] Rate limiting enforced across distributed instances
- [ ] N+1 queries eliminated (verified via query logging)

### P1 Tasks Complete When:
- [ ] Authorization matrix tests pass (all roles × all endpoints)
- [ ] Zero plaintext tokens in database (migration verified)
- [ ] Database indexes used (verified via EXPLAIN ANALYZE)
- [ ] Dashboard queries use single-pass loading (query count verified)
- [ ] Critical services have >60% test coverage

### P2 Tasks Complete When:
- [ ] Installation race condition test added and passing
- [ ] All API routes use consistent Zod validation
- [ ] Cost tracking non-blocking (latency measured)
- [ ] Timezone-aware usage limits (multi-timezone test passing)
- [ ] Pagination implemented for large queries

### P3 Tasks Complete When:
- [ ] Pre-commit hooks block bad commits
- [ ] Bundle analysis shows size reduction
- [ ] API field filtering reduces payload size by >30%
- [ ] LRU cache eviction implemented
- [ ] Circuit breaker prevents cascading failures

---

## Dependencies & Prerequisites

- **Redis:** Required for distributed cache/rate limiting (P0-3, P0-4)
- **Database Migrations:** Require `npm run prisma:migrate` (P1-3)
- **Test Data:** Need realistic test datasets for performance testing
- **Load Testing:** Requires k6 or Artillery for distributed testing

---

## Estimated Timeline

- **P0 Tasks:** 6-8 hours (complete in 1 day)
- **P1 Tasks:** 14-16 hours (complete in 2 days)
- **P2 Tasks:** 12-14 hours (complete over 1 week)
- **P3 Tasks:** 10-12 hours (ongoing, low priority)

**Total Effort:** ~40-50 hours of focused engineering work

---

## Next Actions

1. ✅ Review and approve this plan
2. ⏳ Set up Redis infrastructure (if not already available)
3. ⏳ Begin P0-1: Fix Review Guard race condition
4. ⏳ Begin P0-2: Add tests to CI/CD pipelines
5. ⏳ Continue through P0 tasks in order
6. ⏳ Create progress.md to track execution

---

## Notes

- **Blast Radius:** Most changes are isolated to specific services (low risk)
- **Production Verification:** Each change should be tested in staging first
- **Monitoring:** Add Datadog/Sentry alerts for error rate increases
- **Documentation:** Update CLAUDE.md with new patterns as they're established
