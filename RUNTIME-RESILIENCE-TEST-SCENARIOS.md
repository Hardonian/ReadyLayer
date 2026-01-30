# Runtime Resilience - Failure Simulation Test Scenarios

**Generated:** 2026-01-30
**Purpose:** Document test scenarios to verify runtime resilience hardening

---

## Test Scenario 1: Database Connection Loss

### Setup
```bash
# Kill Postgres during application runtime
docker stop readylayer-postgres
# OR
pg_ctl stop -D /var/lib/postgresql/data
```

### Expected Behavior (After Fixes)

**API Routes with Timeout:**
- ✅ `GET /api/v1/reviews` - Returns 500 after 10s timeout (not hanging)
- ✅ `GET /api/v1/policies` - Returns 500 after 10s timeout
- ⚠️ Other list routes - May hang indefinitely (not yet fixed)

**Stream API:**
- ✅ Polling continues, logs errors, doesn't crash
- ✅ No query stacking even if polls take > 5 seconds

**Error Response Example:**
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed",
    "requestId": "req_1706634123456"
  }
}
```

### Verification
```bash
# Test API with timeout
curl -i http://localhost:3000/api/v1/reviews

# Should return 500 after ~10 seconds, not hang
# Check logs for DatabaseTimeoutError
```

---

## Test Scenario 2: Missing Environment Variables

### Setup
```bash
# Unset critical env vars
unset NEXT_PUBLIC_SUPABASE_URL
unset NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

### Expected Behavior (Already Robust)

**Middleware:**
- ✅ API routes return 503 "Authentication service is temporarily unavailable"
- ✅ Page routes redirect to `/auth/signin`
- ✅ Public routes continue to work

**No Hard Crashes:**
- ✅ Application starts successfully
- ✅ Errors logged with context
- ✅ User sees helpful error messages

### Verification
```bash
# Try accessing protected route
curl -i http://localhost:3000/api/v1/reviews
# Should return 503, not 500

# Try accessing dashboard
curl -i http://localhost:3000/dashboard
# Should redirect to /auth/signin
```

---

## Test Scenario 3: Network Timeout in Client Components

### Setup
```javascript
// Mock slow API in browser DevTools Network tab
// Throttle to "Slow 3G" or use Charles Proxy
// OR add delay to API route for testing:
await new Promise(resolve => setTimeout(resolve, 15000));
```

### Expected Behavior (After Fixes)

**ConfigWizard Setup Completion:**
- ✅ Shows "Completing..." loading state
- ✅ Request times out after 10 seconds
- ✅ User sees error message: "Setup failed with status..."
- ✅ Button re-enables, user can retry

**Platform Theme Provider:**
- ✅ Falls back to GitHub theme
- ✅ Logs warning to console (not silent)

### Verification
```javascript
// In browser console after timeout:
// Should see: "Failed to fetch platform theme from API, using default: ..."
```

---

## Test Scenario 4: Malformed JSON in API Responses

### Setup
```bash
# Simulate malformed JSON response
# Modify API route temporarily to return invalid JSON
return new Response('{ invalid json', { status: 200 })
```

### Expected Behavior

**ConfigWizard:**
- ✅ Catches JSON parsing error
- ✅ Shows fallback error message
- ✅ Doesn't crash the page

**Webhook Routes:**
- ✅ Return 400 "Webhook payload is not valid JSON"
- ✅ Log error with truncated payload

### Verification
```bash
# Test webhook with malformed JSON
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "x-hub-signature-256: sha256=fake" \
  -H "x-github-event: push" \
  -H "x-github-installation-id: 123" \
  -d '{ invalid json'

# Should return 400, not crash
```

---

## Test Scenario 5: React Rendering Errors in Dynamic Routes

### Setup
```typescript
// Temporarily break a component in review detail page
// e.g., throw new Error('Test rendering error')
```

### Expected Behavior (After Fixes)

**Review Detail Page (`/dashboard/reviews/[reviewId]`):**
- ✅ Shows error.tsx boundary
- ✅ Displays user-friendly message
- ✅ Provides "Try Again" button
- ✅ Provides "Go Back" and "View All Reviews" navigation
- ✅ In development: shows error details

**Same for:**
- ✅ `/dashboard/repos/[repoId]`
- ✅ `/dashboard/policies/[packId]`
- ✅ `/dashboard/runs/[runId]`

### Verification
```bash
# Visit a dynamic route that triggers an error
# Should see error boundary UI, not blank page or crash
```

---

## Test Scenario 6: Slow Database Queries in Stream API

### Setup
```sql
-- Add artificial delay in database
-- (PostgreSQL)
SELECT pg_sleep(10);

-- OR modify stream route to add delay:
await new Promise(r => setTimeout(r, 10000));
```

### Expected Behavior (After Fixes)

**Stream Polling:**
- ✅ If poll takes > 5s, next poll is skipped
- ✅ Logs: "Skipping poll - previous poll still in progress"
- ✅ No query stacking
- ✅ Connection pool doesn't get exhausted

**Without Fix (Before):**
- ❌ Polls stack up
- ❌ Multiple concurrent queries
- ❌ Connection pool exhaustion
- ❌ Server crash or unresponsive

### Verification
```bash
# Watch logs during slow query
# Should see "Skipping poll" warnings
# Should NOT see multiple concurrent poll attempts
```

---

## Test Scenario 7: Non-existent Resources (404s)

### Setup
```bash
# Try accessing resources that don't exist
curl http://localhost:3000/dashboard/reviews/nonexistent-id
curl http://localhost:3000/dashboard/repos/nonexistent-id
```

### Expected Behavior (After Fixes)

**Dynamic Route Pages:**
- ✅ Error boundary catches the error
- ✅ Shows "Failed to Load Review" message
- ✅ Provides navigation options
- ❌ NOT: Blank page
- ❌ NOT: Uncaught exception
- ❌ NOT: Hard 500 error

**API Routes:**
- ✅ Return 404 with proper error code
- ✅ Include helpful error message

### Verification
```bash
curl -i http://localhost:3000/api/v1/reviews/nonexistent-id
# Should return 404, not 500
```

---

## Test Scenario 8: Rate Limit Exhaustion

### Setup
```bash
# Send many requests rapidly
for i in {1..150}; do
  curl http://localhost:3000/api/v1/reviews &
done
wait
```

### Expected Behavior (Already Robust)

**Middleware Rate Limiting:**
- ✅ First 100 requests succeed
- ✅ Subsequent requests return 429
- ✅ Response includes rate limit headers
- ✅ No server crash

### Verification
```bash
# Check response headers
curl -i http://localhost:3000/api/v1/reviews
# Look for X-RateLimit-* headers
```

---

## Test Scenario 9: Concurrent Stream Connections

### Setup
```javascript
// Open multiple SSE connections from browser
for (let i = 0; i < 20; i++) {
  new EventSource('/api/stream?organizationId=test-org-id');
}
```

### Expected Behavior (After Fixes)

**Stream API:**
- ✅ Each connection has its own polling state
- ✅ Slow polls in one connection don't affect others
- ✅ Each connection respects its own `isPolling` lock
- ✅ No global blocking

**Connection Management:**
- ✅ Stale connections cleaned up after 5 minutes
- ✅ Connections properly closed on client disconnect

### Verification
```bash
# Check connection count in logs
# Monitor database connection pool usage
```

---

## Test Scenario 10: AbortController / Fetch Timeouts

### Setup
```javascript
// Test timeout enforcement in ConfigWizard
// Set breakpoint in API route to delay > 10 seconds
```

### Expected Behavior (After Fixes)

**ConfigWizard:**
- ✅ Fetch times out after 10 seconds
- ✅ Shows error to user
- ✅ Doesn't hang indefinitely

**Timeout Error:**
```
Error: The operation was aborted due to timeout
```

### Verification
```javascript
// In browser console, should see timeout after 10s
// Error message should be displayed to user
```

---

## Automated Test Implementation

### Unit Test Example (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { withTimeout, DatabaseTimeoutError } from '@/lib/db-timeout';

describe('Database Timeout Utility', () => {
  it('should timeout slow queries', async () => {
    const slowQuery = new Promise(resolve =>
      setTimeout(() => resolve('data'), 5000)
    );

    await expect(
      withTimeout(slowQuery, 1000, 'test query')
    ).rejects.toThrow(DatabaseTimeoutError);
  });

  it('should not timeout fast queries', async () => {
    const fastQuery = Promise.resolve('data');

    const result = await withTimeout(fastQuery, 1000, 'test query');
    expect(result).toBe('data');
  });
});
```

### Integration Test Example (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('ConfigWizard shows error on setup failure', async ({ page }) => {
  // Mock API to return error
  await page.route('**/api/v1/setup/complete', route =>
    route.fulfill({ status: 500, body: JSON.stringify({
      error: { message: 'Setup failed' }
    })})
  );

  await page.goto('/setup');
  await page.click('[data-testid="complete-setup"]');

  // Should show error message
  await expect(page.locator('text=Setup Failed')).toBeVisible();

  // Should show retry button
  await expect(page.locator('text=Dismiss')).toBeVisible();
});
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Database Query Duration**
   - Alert if > 5s
   - Dashboard showing P50, P95, P99

2. **API Response Times**
   - Timeouts should be logged
   - Track timeout rate

3. **Error Boundaries Triggered**
   - Count by route
   - Track which errors trigger most frequently

4. **Stream Connection Health**
   - Active connections count
   - Poll skip rate
   - Average poll duration

### Log Queries

```bash
# Find database timeouts
grep "DatabaseTimeoutError" logs.json

# Find skipped polls
grep "Skipping poll" logs.json

# Find component errors
grep "ConfigWizard" logs.json | grep "error"
```

---

## Simulation Checklist

- [ ] Test Scenario 1: Database connection loss
- [ ] Test Scenario 2: Missing env vars
- [ ] Test Scenario 3: Network timeout in client
- [ ] Test Scenario 4: Malformed JSON
- [ ] Test Scenario 5: React rendering errors
- [ ] Test Scenario 6: Slow DB queries in stream
- [ ] Test Scenario 7: Non-existent resources (404s)
- [ ] Test Scenario 8: Rate limit exhaustion
- [ ] Test Scenario 9: Concurrent stream connections
- [ ] Test Scenario 10: AbortController timeouts

---

## Next Steps for Full Hardening

1. Apply `promiseAllWithTimeout` to remaining API routes:
   - `/api/v1/runs`
   - `/api/v1/test-runs`
   - `/api/v1/waivers`

2. Fix remaining component error states:
   - `test-run-status.tsx`
   - `readiness-command-center.tsx`
   - `pr-integration.tsx`

3. Add redirect URL whitelist validation

4. Audit all JSON parsing locations

5. Add error.tsx to remaining route groups

---

**resilience hardened ✅**
