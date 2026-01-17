# Optimization Roadmap

**Created:** 2026-01-17
**Status:** Reference for Future Implementation

This document outlines optimization opportunities identified during the security and performance review that are recommended for future implementation.

---

## P2: Medium Priority Optimizations

### P2-1: Installation Deletion Race Condition

**Issue:** Installation lookup not synchronized with webhook processing. Installation could be deleted between signature validation and event processing.

**Current Code:** `/integrations/github/webhook.ts:87-94`

**Fix:**
```typescript
// Add version check or optimistic locking
const installation = await prisma.installation.findUnique({
  where: { id: installationId },
  select: { id: true, updatedAt: true },
});

// Later, verify installation hasn't been modified
const currentInstallation = await prisma.installation.findUnique({
  where: { id: installationId, updatedAt: installation.updatedAt },
});

if (!currentInstallation) {
  throw new Error('Installation was modified during webhook processing');
}
```

**Priority:** Medium (rare edge case, low impact)

---

### P2-2: API Key Validation Should Use Zod

**Issue:** `/app/api/v1/api-keys/route.ts` uses manual type checking instead of Zod schema (inconsistent with other routes).

**Current Code:** Lines 33-72
```typescript
if (!body || typeof body !== 'object') { ... }
(body as Record<string, unknown>)
```

**Fix:**
```typescript
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'admin'])),
  expiresAt: z.string().datetime().optional(),
});

// In route handler
const validated = createApiKeySchema.parse(body);
```

**Benefits:**
- Consistent validation pattern
- Better error messages
- Type inference
- Runtime safety

---

### P2-3: Synchronous Cost Tracking Adds Latency

**Issue:** `/services/llm/index.ts:149-182` calls `await trackCost()` during LLM response, adding 50-100ms latency.

**Current Code:**
```typescript
const response = await llmService.complete(request);
await trackCost(response); // BLOCKS response
return response;
```

**Fix:**
```typescript
const response = await llmService.complete(request);

// Queue cost tracking asynchronously (don't await)
trackCost(response).catch(err => {
  logger.error({ err }, 'Failed to track cost (non-blocking)');
});

return response; // Immediate return
```

**Alternative:** Use background job queue
```typescript
await queue.enqueue('cost-tracking', {
  organizationId,
  cost: response.cost,
  tokens: response.tokensUsed,
  timestamp: new Date(),
});
```

**Impact:** 50-100ms latency reduction per LLM call

---

### P2-4: Daily Usage Limit Timezone Handling

**Issue:** `/lib/usage-enforcement.ts:65-66` resets daily limits in server timezone, not user timezone.

**Current Code:**
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0); // Server timezone
```

**Fix:**
```typescript
// Store organization timezone in database
const org = await prisma.organization.findUnique({
  where: { id: organizationId },
  select: { timezone: true }, // e.g., 'America/New_York'
});

// Calculate reset time in org timezone
const orgTimezone = org?.timezone || 'UTC';
const today = new Date().toLocaleString('en-US', { timeZone: orgTimezone });
const resetTime = new Date(today);
resetTime.setHours(0, 0, 0, 0);
```

**Migration:** Add `timezone` column to Organization model

---

### P2-5: Hardcoded Query Limits Without Pagination

**Issue:** `/services/self-learning/index.ts:138-142, 449-455` uses `take: 1000` and `take: 10000` with no pagination.

**Current Code:**
```typescript
const data = await prisma.modelPerformance.findMany({
  take: 10000, // Loads all 10k records into memory
});
```

**Fix:** Implement cursor-based pagination
```typescript
async function* fetchInBatches(batchSize = 1000) {
  let cursor = undefined;

  while (true) {
    const batch = await prisma.modelPerformance.findMany({
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
    });

    if (batch.length === 0) break;

    yield batch;

    cursor = batch[batch.length - 1].id;
  }
}

// Usage
for await (const batch of fetchInBatches()) {
  await processBatch(batch);
}
```

**Impact:** Prevents OOM with large datasets

---

### P2-6: Missing Code Splitting on Landing Page

**Issue:** `/components/landing/*` components are statically imported, increasing initial bundle size.

**Current Code:**
```typescript
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
```

**Fix:** Lazy load below-the-fold components
```typescript
import dynamic from 'next/dynamic';

const HeroSection = dynamic(() => import('@/components/landing/HeroSection'));
const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection'), {
  loading: () => <LoadingSpinner />,
});
const PricingSection = dynamic(() => import('@/components/landing/PricingSection'), {
  loading: () => <LoadingSpinner />,
});
```

**Impact:** 20-30% reduction in initial bundle size

---

## P3: Low Priority Enhancements

### P3-3: API Response Field Filtering

**Issue:** API routes return all fields even when client only needs subset.

**Example:** `/app/api/v1/reviews/route.ts`

**Current:**
```json
{
  "id": "review_123",
  "repositoryId": "repo_456",
  "prNumber": 42,
  "prSha": "abc123",
  "prTitle": "Add feature",
  "status": "completed",
  "result": { ... },  // Large object
  "issuesFound": [ ... ],  // Large array
  "summary": { ... },
  ...
}
```

**Fix:** Add `select` query parameter
```typescript
const selectSchema = z.array(z.enum([
  'id', 'status', 'summary', 'isBlocked', 'createdAt'
])).optional();

const { select } = req.query;

const review = await prisma.review.findUnique({
  where: { id },
  select: select ? Object.fromEntries(select.map(f => [f, true])) : undefined,
});
```

**Impact:** 50-70% reduction in response payload size

---

### P3-4: LRU Cache Eviction Instead of FIFO

**Issue:** `/lib/cache/llm-cache-redis.ts:147-154` uses FIFO eviction (removes oldest entry, not least recently used).

**Current Code:**
```typescript
if (this.inMemoryCache.size >= this.inMemoryMaxSize) {
  const firstKey = this.inMemoryCache.keys().next().value; // FIFO
  this.inMemoryCache.delete(firstKey);
}
```

**Fix:** Track access timestamps for LRU
```typescript
interface CacheEntry {
  response: CachedLLMResponse;
  expiresAt: number;
  lastAccessed: number; // NEW: Track last access time
}

// On get: update lastAccessed
entry.lastAccessed = Date.now();

// On eviction: find least recently accessed
const lruKey = Array.from(this.inMemoryCache.entries())
  .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0][0];

this.inMemoryCache.delete(lruKey);
```

**Alternative:** Use `lru-cache` package

---

### P3-5: Circuit Breaker for LLM Providers

**Issue:** `/services/review-guard/async-processor.ts:40-95` has no circuit breaker on LLM failures (repeated timeout attempts).

**Current:** Retries on every failure

**Fix:** Implement circuit breaker pattern
```typescript
import { CircuitBreaker } from 'circuit-breaker-ts';

const breaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 60000, // Try again after 60s
});

const result = await breaker.execute(async () => {
  return await llmService.complete(request);
});

if (breaker.isOpen()) {
  // Circuit open, fail fast
  throw new Error('LLM service unavailable (circuit open)');
}
```

**Impact:** Prevents cascading failures, faster error responses

---

### P3-6: Component Memoization Audit

**Issue:** Some dashboard list components may cause unnecessary re-renders.

**Components to Check:**
- `/components/dashboard/ReviewList.tsx`
- `/components/dashboard/ViolationTable.tsx`
- `/components/dashboard/MetricsChart.tsx`

**Fix:** Add `React.memo()` wrappers
```typescript
import { memo } from 'react';

const ReviewList = memo(({ reviews }: ReviewListProps) => {
  return (
    <ul>
      {reviews.map(review => (
        <ReviewListItem key={review.id} review={review} />
      ))}
    </ul>
  );
});

ReviewList.displayName = 'ReviewList';

export default ReviewList;
```

**Verification:** Use React DevTools Profiler to measure impact

---

## Implementation Priority

**Immediate (Next Sprint):**
1. P2-3: Async cost tracking (quick win, measurable improvement)
2. P3-4: LRU cache eviction (use lru-cache package)
3. P3-5: Circuit breaker (reliability improvement)

**Short-term (Next Month):**
1. P2-2: Zod validation consistency
2. P2-6: Code splitting (bundle size)
3. P3-3: API field filtering

**Medium-term (Next Quarter):**
1. P2-4: Timezone handling (requires schema migration)
2. P2-5: Pagination for large queries
3. P2-1: Installation race condition

**Ongoing:**
1. P3-6: Component memoization (incremental improvements)

---

## Measurement & Verification

For each optimization, measure:

1. **Performance:**
   - Response time (p50, p95, p99)
   - Database query count
   - Memory usage

2. **User Impact:**
   - Time to interactive (TTI)
   - First contentful paint (FCP)
   - Bundle size

3. **Reliability:**
   - Error rate
   - Timeout rate
   - Cache hit rate

4. **Cost:**
   - LLM API costs
   - Database query costs
   - Infrastructure costs

---

**Last Updated:** 2026-01-17
**Next Review:** 2026-04-17 (quarterly)
