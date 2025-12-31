# Systemic Findings - Build vs Runtime Disconnects

This document tracks additional "builds but breaks at runtime" issues discovered during the middleware fix audit.

## Fixed Issues (Low Risk)

### ✅ Edge Runtime Mismatches

**Status**: Fixed

**Issue**: Middleware imported Node-only modules (Prisma, Redis, pino)

**Fix**: Created edge-safe modules and refactored middleware

**Files**:
- `middleware.ts`
- `lib/middleware/edge-logging.ts`
- `lib/middleware/edge-auth.ts`
- `lib/middleware/edge-rate-limit.ts`

**Verification**: Build passes, middleware smoke test created

---

### ✅ Webhook Runtime Configuration

**Status**: Fixed

**Issue**: GitHub webhook route uses Node crypto but didn't explicitly set runtime

**Fix**: Added `export const runtime = 'nodejs'` to webhook route

**Files**:
- `app/api/webhooks/github/route.ts`

**Verification**: Build passes, route explicitly uses Node runtime

---

### ✅ Health Check Environment Validation

**Status**: Fixed

**Issue**: Health check didn't validate required env vars

**Fix**: Added env var presence check to `/api/health` endpoint

**Files**:
- `app/api/health/route.ts`

**Verification**: Health check now reports missing env vars

---

## Remaining Issues (Medium Risk)

### ⚠️ API Route Authorization Double-Check

**Status**: Documented

**Issue**: Some API routes (`/api/v1/repos`, `/api/v1/reviews`) use `createAuthzMiddleware` which imports Prisma. This is fine for API routes (Node runtime), but middleware also checks auth, creating a double-check pattern.

**Risk**: Low - API routes run on Node runtime, so Prisma is fine. However, middleware now only checks Supabase session, not API keys (API key validation happens in route handler).

**Location**:
- `app/api/v1/repos/route.ts`
- `app/api/v1/reviews/route.ts`
- `lib/authz.ts` (uses Prisma)

**Proposed Fix**: None needed - this is correct architecture:
- Middleware: Fast, edge-safe Supabase session check
- Route handler: Full authz with Prisma for API keys and scopes

**Verification**: API routes correctly require auth at both middleware and route level

---

### ⚠️ Rate Limiting Per-Instance

**Status**: Documented

**Issue**: Edge-safe rate limiting uses in-memory Map, which is per-instance. With multiple Edge instances, rate limits are per-instance, not global.

**Risk**: Medium - Users could exceed rate limits by hitting different Edge instances. However, this is acceptable for most use cases and avoids Redis dependency in middleware.

**Location**:
- `lib/middleware/edge-rate-limit.ts`

**Proposed Fix**: If global rate limiting is required:
1. Move rate limiting to API route handlers (Node runtime, can use Redis)
2. Or use Vercel Edge Config for shared state (if available)

**Verification**: Rate limiting works per-instance. Test with multiple concurrent requests.

---

## Potential Issues (Low Risk, Monitor)

### 📋 Static Asset Handling

**Status**: Fixed in matcher

**Issue**: Matcher was too broad, potentially matching static assets

**Fix**: Updated matcher to explicitly exclude static assets

**Location**:
- `middleware.ts` - `config.matcher`

**Verification**: Build passes, matcher excludes static assets

---

### 📋 Error Boundary Coverage

**Status**: Verified

**Issue**: Need to ensure all pages have error boundaries

**Current State**:
- `app/error.tsx` - Global error boundary ✅
- `app/global-error.tsx` - Root error boundary ✅
- `app/auth/error/page.tsx` - Auth error page ✅

**Verification**: Error boundaries present. Test by throwing errors in pages.

---

### 📋 Database Connection Pooling

**Status**: Verified

**Issue**: Prisma client singleton pattern ensures connection pooling

**Location**:
- `lib/prisma.ts`

**Verification**: Prisma client uses singleton pattern with connection pooling

---

## Testing Recommendations

1. **Middleware Smoke Test**: Run `npm run middleware:smoke` before each deploy
2. **Edge Runtime Validation**: Consider adding a build-time check that validates middleware imports are Edge-safe
3. **Rate Limit Testing**: Test rate limiting with concurrent requests from multiple IPs
4. **Error Boundary Testing**: Intentionally throw errors in pages to verify error boundaries work
5. **Env Var Testing**: Test health check with missing env vars

## Prevention Strategies

1. **Code Review Checklist**:
   - [ ] Middleware imports only Edge-safe modules
   - [ ] Webhook routes explicitly set `runtime = 'nodejs'`
   - [ ] API routes use Node runtime (default, but verify)
   - [ ] Error boundaries present for all page routes

2. **CI/CD Pipeline**:
   - Run `npm run middleware:smoke` in CI
   - Run `npm run lint` and `npm run type-check`
   - Run `npm run build` and verify no warnings

3. **Monitoring**:
   - Monitor Vercel logs for middleware errors
   - Alert on 500 errors from middleware
   - Track rate limit violations

## Follow-up Actions

- [ ] Add Edge runtime validation to build process (if possible)
- [ ] Consider moving rate limiting to API routes if global limits needed
- [ ] Document middleware architecture decisions
- [ ] Add integration tests for auth flow (middleware → route handler)
