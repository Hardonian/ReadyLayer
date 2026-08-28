# Performance Optimization Guide

## Hot Paths & Caching Strategy

### Critical Hot Paths

#### 1. Webhook Processor (`workers/webhook-processor.ts`)
**Frequency**: Every PR event (opened, updated, merged)
**Impact**: Direct user experience (PR checks)
**Optimizations**:
- Repository lookup uses `getCachedRepository()` with 5s in-memory + Redis cache
- Organization data cached for 30s
- Batch database queries where possible

```typescript
// Line 64 - Critical path for every PR event
const repoRecord = await getCachedRepository(String(repository.id));
```

#### 2. Readiness Command Center (`components/dashboard/readiness-command-center.tsx`)
**Frequency**: Dashboard page load, real-time polling
**Impact**: Dashboard UX
**Optimizations**:
- Consider React Query caching with stale-while-revalidate
- Implement server-side caching for metrics aggregation
- Use SWR for automatic background refresh

**Recommended**:
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: metrics, isLoading } = useQuery({
  queryKey: ['readiness-metrics', organizationId, repositoryId],
  queryFn: fetchMetrics,
  staleTime: 30000, // 30s stale time
  cacheTime: 60000, // 1min cache
});
```

#### 3. Policy Engine (Security Scanning)
**Frequency**: Every file in PR
**Impact**: PR merge time
**Optimizations**:
- File content cached in webhook processor (lines 444-461)
- AST parsing results can be memoized
- Rule evaluation uses immutable caches

#### 4. Test Engine (Coverage Analysis)
**Frequency**: Every AI-touched file
**Impact**: PR feedback quality
**Optimizations**:
- Framework detection cached per repository
- Coverage reports cached by commit SHA

#### 5. LLM Cache (`lib/cache/llm-cache.ts`)
**Frequency**: Every AI generation request
**Impact**: API costs + latency
**Optimizations**:
- Redis-backed semantic cache
- Hash-based deduplication
- TTL: 24 hours for generation results

### Caching Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: In-Memory (Fastest)           │
│  • 5 second TTL for transactional data │
│  • Repository, Organization objects      │
│  • Uses SimpleCache utility              │
├─────────────────────────────────────────┤
│  Layer 2: Redis (Fast)                  │
│  • 5-30 second TTL                      │
│  • Shared across workers                 │
│  • Falls back to in-memory on miss       │
├─────────────────────────────────────────┤
│  Layer 3: Database (Source of Truth)    │
│  • Prisma ORM                          │
│  • PostgreSQL                          │
│  • Optimized with proper indexes         │
└─────────────────────────────────────────┘
```

### Benchmarks

Run performance benchmarks:

```bash
# Load test webhook processor
npm run benchmark:webhook

# Test cache hit rates
npm run benchmark:cache

# Dashboard metrics latency
npm run benchmark:dashboard
```

### Optimization Checklist

- [ ] Enable Redis caching in production
- [ ] Set `REDIS_URL` environment variable
- [ ] Monitor cache hit rates (target: >80%)
- [ ] Use `getCachedRepository()` for all repo lookups
- [ ] Batch DB queries where possible
- [ ] Add React Query for dashboard data fetching
- [ ] Monitor webhook processing latency (target: <500ms)

### Cache Invalidation

Repository cache auto-invalidates on:
- Repository settings updates
- Organization tier changes
- Webhook reinstallation

Manual invalidation:
```typescript
import { invalidateRepositoryCache } from '@/lib/db/repository-cache';
await invalidateRepositoryCache(repoId);
```
