# Middleware 500 Error - Postmortem

## Summary

The ReadyLayer homepage was returning 500 errors on Vercel due to middleware crashing in Edge runtime. The root cause was middleware importing Node-only dependencies (Prisma, Redis, pino) that cannot run in Edge runtime.

## Root Cause

**Why build passed but runtime failed:**

Next.js middleware runs on Edge runtime by default, which has strict limitations:
- No Node.js built-in modules (except Web APIs)
- No file system access
- No native modules (Prisma, Redis, etc.)
- Limited memory and CPU

The middleware was importing:
1. `lib/authz.ts` → imports `lib/auth.ts` → imports `lib/prisma.ts` (Node-only Prisma client)
2. `lib/rate-limit.ts` → imports `redis` (Node-only) and `rate-limiter-flexible` (Node-only)
3. `observability/logging.ts` → imports `pino` (Node-only)

**Build-time vs Runtime:**
- Build-time: Next.js bundles code but doesn't validate Edge runtime compatibility
- Runtime: Edge runtime throws when trying to import Node-only modules
- Result: Build succeeds, but first request to `/` crashes middleware → 500 error

## Failure Signature

- **Error**: Middleware crash on Edge runtime
- **Failing file**: `middleware.ts` (transitive imports)
- **Route**: `/` (homepage) and all routes matching middleware matcher
- **Runtime**: Edge (default for Next.js middleware)
- **Trigger**: Importing Node-only modules (`@prisma/client`, `redis`, `pino`)

## Fix Summary

### 1. Created Edge-Safe Modules

Created three new edge-safe modules in `lib/middleware/`:

- **`edge-logging.ts`**: Console-based logging (no pino dependency)
- **`edge-auth.ts`**: Supabase-only auth (no Prisma dependency)
- **`edge-rate-limit.ts`**: In-memory rate limiting (no Redis dependency)

### 2. Refactored Middleware

- Removed all Node-only imports
- Uses only Edge-safe modules
- Fail-open for public routes (homepage, auth pages, health checks)
- Proper error handling that never throws

### 3. Fixed Matcher Configuration

- Excludes static assets (`/_next/*`, `*.png`, `*.css`, etc.)
- Only matches routes that need middleware processing
- Prevents middleware from running on static files

### 4. Added Guardrails

- **Health check enhancement**: Added env var validation to `/api/health`
- **Webhook runtime**: Explicitly set `runtime = 'nodejs'` for GitHub webhook route (needs crypto for signature verification)
- **Smoke test**: Added `npm run middleware:smoke` script to catch regressions

## Guardrails Preventing Recurrence

1. **Edge-safe module isolation**: All middleware code in `lib/middleware/` is explicitly Edge-safe
2. **Smoke test**: `scripts/middleware-smoke.ts` verifies middleware doesn't crash on common routes
3. **Type checking**: TypeScript catches import errors at build time
4. **Lint rules**: ESLint enforces code quality
5. **Build validation**: `npm run build` must pass before deployment

## Verification

- ✅ `npm run lint` - passes
- ✅ `npm run type-check` - passes
- ✅ `npm run build` - passes
- ✅ Middleware smoke test script created
- ✅ All routes use appropriate runtime (Edge for middleware, Node for webhooks/API routes)

## Files Changed

- `middleware.ts` - Complete rewrite using edge-safe modules
- `lib/middleware/edge-logging.ts` - New edge-safe logger
- `lib/middleware/edge-auth.ts` - New edge-safe auth helpers
- `lib/middleware/edge-rate-limit.ts` - New edge-safe rate limiter
- `app/api/health/route.ts` - Added env validation
- `app/api/webhooks/github/route.ts` - Added explicit Node runtime
- `scripts/middleware-smoke.ts` - New smoke test script
- `package.json` - Added `middleware:smoke` script

## Lessons Learned

1. **Edge runtime limitations**: Always verify middleware imports are Edge-compatible
2. **Build vs Runtime**: Build success doesn't guarantee runtime success for Edge code
3. **Fail-open design**: Public routes should work even if auth services are down
4. **Explicit runtime**: Always specify `runtime = 'nodejs'` for routes that need Node APIs

## Next Steps

1. Deploy to Vercel Preview and verify `/` returns 200
2. Monitor Vercel logs for middleware errors
3. Run smoke test in CI/CD pipeline
4. Consider adding Edge runtime validation to build process
