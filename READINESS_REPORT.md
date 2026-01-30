# ReadyLayer — Technical Readiness Discovery Report

> **Generated:** 2026-01-30
> **Branch:** `claude/technical-readiness-audit-CENd6`
> **Commit:** `34977f6`
> **Auditor:** Claude Opus 4.5 (Read-Only)

---

## 1. Executive Summary

1. **Build is broken**: `npm run type-check` fails — `@types/node`, `@types/react`, `@types/react-dom` are missing from `node_modules`. This blocks `npm run build` (which chains lint → type-check → next build). Root cause: incomplete `npm install` or dependency resolution failure.
2. **Tests cannot run**: `vitest` binary not found (`sh: 1: vitest: not found`), indicating broken dependency installation.
3. **No "Stitch" UI exists**: `git log -S "Stitch"` returns zero results. The string "Stitch" has never appeared in this repo's history. This is a non-issue — no restoration needed.
4. **Open redirect in auth callback**: `app/(public)/auth/callback/route.ts:22` redirects to a user-controlled `redirect` query parameter without origin validation — an attacker can redirect authenticated users to a malicious domain.
5. **GitHub webhook signature verification is delegated but not visible**: The route at `app/api/webhooks/github/route.ts` passes the signature to `githubWebhookHandler.handleEvent()` but the route handler itself never calls a crypto HMAC comparison. Verification depends entirely on the downstream handler.
6. **Many routes are redirect stubs**: 15+ pages under `app/(public)/` are single-line `redirect()` calls (e.g., `/pricing` → `/enterprise`, `/features/*` → `/open-source`, `/help/*` → `/docs`). These are functional but represent dead route surface area.
7. **`dangerouslySetInnerHTML` used for JSON-LD**: Two instances in `app/(public)/layout.tsx:48,52` — safe pattern (serialized JSON), low risk.
8. **30+ unguarded `JSON.parse()` calls**: Many in services and workers parse LLM responses, Redis cache entries, and user-uploaded files without try/catch or schema validation wrapping.
9. **Encryption key fallback allows dev bypass**: `lib/env.ts` only validates encryption keys in production. Dev/build modes silently proceed without any encryption key, which could mask missing config.
10. **Next.js 16 + React 19**: Cutting-edge versions. `next@^16.1.3` and `react@^19.2.3` — verify Vercel platform support for Next.js 16.

---

## 2. Reality Map

### Router Root
**Canonical root:** `app/` (no `src/app/` directory exists)

### Route Group Layout
```
app/
├── layout.tsx              ← Root layout (ThemeProvider, QueryProvider, PlatformThemeProvider, RuntimeUiConfigProvider, Toaster)
├── error.tsx               ← Root error boundary
├── global-error.tsx        ← Global error boundary
├── not-found.tsx           ← 404 page
├── globals.css
├── robots.ts / sitemap.ts
│
├── (app)/                  ← Authenticated route group
│   ├── layout.tsx          ← App layout
│   ├── error.tsx
│   ├── loading.tsx
│   └── dashboard/          ← 30+ dashboard pages (admin, analytics, audit, billing, evidence, findings, etc.)
│       ├── layout.tsx      ← Dashboard layout
│       └── error.tsx       ← Dashboard error boundary
│
├── (public)/               ← Public/marketing route group
│   ├── layout.tsx          ← Public layout (includes JSON-LD structured data)
│   ├── error.tsx
│   ├── loading.tsx
│   ├── page.tsx            ← Landing page
│   ├── auth/               ← Auth flows (signin, callback, signout)
│   └── [25+ public pages]  ← about, changelog, contact, docs, enterprise, etc.
│
├── _internal/review/       ← Internal review tool
├── api/                    ← 60+ API routes
├── content/page.tsx
├── evaluate/page.tsx
└── partnerships/page.tsx
```

### Key Providers (root layout)
1. `ThemeProvider` — `@/components/providers/theme-provider`
2. `QueryProvider` — `@/components/providers/query-provider` (TanStack Query)
3. `PlatformThemeProvider` — `@/components/providers/platform-theme-provider`
4. `RuntimeUiConfigProvider` — `@/components/providers/runtime-ui-config-provider`
5. `Toaster` — `@/components/ui/toaster`

### Error Boundaries
- ✅ Root: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`
- ✅ `(app)` group: `app/(app)/error.tsx`
- ✅ Dashboard: `app/(app)/dashboard/error.tsx`
- ✅ `(public)` group: `app/(public)/error.tsx`
- ✅ Help: `app/(public)/help/error.tsx`
- ❌ Missing: No `loading.tsx` at root level
- ❌ Missing: No error boundary for `app/api/` (N/A for route handlers)
- ❌ Missing: No error boundaries for `app/_internal/`, `app/content/`, `app/evaluate/`, `app/partnerships/`

### Pages Outside Route Groups (orphan routes)
These pages sit at the `app/` root, outside `(app)` and `(public)` groups:
- `app/content/page.tsx`
- `app/evaluate/page.tsx`
- `app/partnerships/page.tsx`
- `app/_internal/review/page.tsx`

These use the **root layout only** (no `(public)` or `(app)` layout wrapping). This may cause visual inconsistency.

---

## 3. Stitch/UI Restoration Findings

### Finding: "Stitch" Never Existed in This Repo
- `git log -S "Stitch" --oneline --decorate` → **zero results**
- `rg -n "Stitch|stitch|google stitch"` → **zero matches**
- **Conclusion:** There are no Stitch UI components to restore. If this was an expected feature, it was never committed to this repository.

### UI Component Library Status
The project uses a custom `components/ui/` directory with 30+ Radix UI-based components (button, toaster, loading, error-boundary, etc.). These are intact and referenced throughout.

### Route Restructuring History
Recent commits (within HEAD~30) performed a major restructuring:
- Dashboard pages moved from `app/dashboard/*` → `app/(app)/dashboard/*` (route groups)
- Public pages moved from `app/*` → `app/(public)/*`
- Multiple new public pages added (about, changelog, enterprise, features, etc.)
- Many of the "new" public pages are redirect stubs pointing to consolidated destinations

**Key commit:** `c7ba21f feat: Master Agent Implementation Pack - v1.0.0-Go-Live` — major structural addition

---

## 4. ENV MATRIX

| NAME | SCOPE | REQUIRED? | DEFAULT | WHERE USED | FEATURE DEPENDENCY | FAILURE MODE | SAFE TO LOG? |
|------|-------|-----------|---------|------------|-------------------|-------------|-------------|
| `DATABASE_URL` | Server | Y | Build placeholder | `lib/prisma.ts`, `lib/env.ts`, `services/llm/index.ts`, scripts | All DB operations | **Runtime crash**: Prisma client fails to connect; all API routes 500 | N |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Y | `''` at build | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/auth.ts` | Authentication | Auth fails; dashboard inaccessible; 500 on protected routes | Y |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Y | `''` at build | `lib/supabase/client.ts`, `lib/supabase/server.ts`, middleware, dashboard pages | Authentication | Same as above — Supabase client creation fails | Y (public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Y | `''` at build | `lib/env.ts`, `lib/supabase/server.ts` | Server-side auth, admin ops | Server-side auth operations fail; webhook processing fails | **N** |
| `REDIS_URL` | Server | N | None | `queue/index.ts`, `lib/db/cache.ts`, `lib/rate-limit*.ts`, `lib/cache/`, `lib/audit-async.ts` | Queue, caching, rate limiting | Falls back to DB queue (degraded); rate limiting disabled | Y |
| `OPENAI_API_KEY` | Server | Conditional* | `''` | `services/llm/index.ts` | LLM-powered reviews/tests | `throw new Error('OPENAI_API_KEY required')` — hard 500 on LLM calls | **N** |
| `ANTHROPIC_API_KEY` | Server | Conditional* | `''` | `services/llm/index.ts` | LLM-powered reviews/tests | Same — alternative to OpenAI | **N** |
| `DEFAULT_LLM_PROVIDER` | Server | N | `'openai'` | `lib/env.ts` | LLM routing | Falls back to openai | Y |
| `GITHUB_APP_ID` | Server | N | None | `lib/env.ts`, integrations | GitHub App integration | GitHub integration non-functional | Y |
| `GITHUB_APP_PRIVATE_KEY` | Server | N | None | `.env.example` | GitHub App auth | GitHub App can't sign JWTs | **N** |
| `GITHUB_WEBHOOK_SECRET` | Server | N | None | `lib/env.ts` | GitHub webhook verification | **Webhooks unverified** — security risk if secret missing | **N** |
| `STRIPE_SECRET_KEY` | Server | N | None | `app/api/webhooks/stripe/route.ts`, `lib/env.ts` | Billing/subscriptions | Stripe routes return 503; billing non-functional | **N** |
| `STRIPE_WEBHOOK_SECRET` | Server | N | None | `app/api/webhooks/stripe/route.ts` | Stripe webhook verification | Stripe webhooks rejected (400) | **N** |
| `STRIPE_PRICE_ID_GROWTH` | Server | N | None | `lib/env.ts` | Billing plan mapping | Growth plan checkout fails | Y |
| `STRIPE_PRICE_ID_SCALE` | Server | N | None | `lib/env.ts` | Billing plan mapping | Scale plan checkout fails | Y |
| `READY_LAYER_MASTER_KEY` | Server | Prod only | None | `lib/crypto.ts`, `lib/secrets/encrypt.ts` | Encryption at rest | **Production crash** if no encryption key set | **N** |
| `READY_LAYER_KMS_KEY` | Server | Prod only | None | `lib/crypto.ts` | KMS-backed encryption | Alternative to MASTER_KEY | **N** |
| `READY_LAYER_KEYS` | Server | Prod only | None | `lib/crypto.ts` | Key rotation | Alternative to single key | **N** |
| `ENCRYPTION_KEY` | Server | N | None | `lib/crypto.ts`, `lib/secrets/encrypt.ts` | Legacy encryption | Fallback encryption key | **N** |
| `NODE_ENV` | Server | N | `'development'` | Everywhere | Mode selection | Defaults to dev; validation relaxed | Y |
| `LOG_LEVEL` | Server | N | `'info'` | `lib/env.ts` | Logging verbosity | Defaults to info | Y |
| `API_BASE_URL` | Server | N | `'http://localhost:3000'` | `lib/env.ts` | API self-reference | Defaults to localhost | Y |
| `RAG_ENABLED` | Server | N | `false` | `lib/env.ts` | Evidence RAG layer | Disabled by default | Y |
| `NEXT_PUBLIC_APP_URL` | Client | N | `'https://readylayer.dev'` | `app/layout.tsx` (metadataBase) | SEO/OpenGraph URLs | Falls back to readylayer.dev | Y |
| `GOOGLE_VERIFICATION` | Server | N | None | `app/layout.tsx` (metadata.verification) | Google Search Console | No verification meta tag | Y |
| `NEXT_PUBLIC_SKIP_ENV_VALIDATION` | Client | N | `undefined` | `lib/env.ts` | Build bypass | Skips env validation at build | Y |
| `ANALYZE` | Server | N | `undefined` | `next.config.js` | Bundle analyzer | No analysis | Y |
| `DATABASE_POOL_SIZE` | Server | N | 5/20 | `lib/env.ts` | Connection pool tuning | Auto-sized by NODE_ENV | Y |

*\* At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY required at runtime (not build)*

---

## 5. Breakage Map

| Feature | Required Env/Config | Code Entrypoint | Symptom | Suggested Guard |
|---------|-------------------|-----------------|---------|----------------|
| Any page render | `@types/node`, `@types/react`, `@types/react-dom` installed | `tsc --noEmit` | Build fails; 3 type errors | Fix dependency installation |
| Test suite | `vitest` installed | `npm test` | `vitest: not found` | Fix dependency installation |
| All DB operations | `DATABASE_URL` | `lib/prisma.ts` | Prisma connection error; all API 500 | Already has build-time placeholder |
| Authentication | Supabase trio vars | `lib/supabase/client.ts` | Supabase client fails; middleware errors | Already has build-time empty fallback |
| LLM reviews | `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | `services/llm/index.ts:51` | `throw new Error('OPENAI_API_KEY required')` — hard 500 | Env validation catches at startup (except build) |
| Encryption | Any encryption key | `lib/crypto.ts` | Decrypt fails; sensitive data inaccessible | Validated in production only |
| Stripe billing | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts:62` | 503 on webhook; `throw` on API calls | `isStripeConfigured()` guard exists |
| GitHub webhooks | `GITHUB_WEBHOOK_SECRET` | `integrations/github/webhook.ts` | **Webhook payloads processed without signature verification** | Must verify secret exists |

---

## 6. Resilience Gaps

### Hard-500 Risks

| Location | Risk | Trigger |
|----------|------|---------|
| `services/llm/index.ts:51` | `throw new Error('OPENAI_API_KEY required')` | Missing LLM key at runtime |
| `services/llm/index.ts:85` | `throw new Error('OpenAI API request timed out')` | LLM timeout |
| `workers/webhook-processor.ts:104` | `throw new Error('Encryption keys not configured')` | Missing encryption keys |
| `services/review-guard/index.ts:635` | `JSON.parse(response.content) as Issue[]` | LLM returns non-JSON |
| `services/doc-sync/index.ts:657` | `JSON.parse(response.content) as OpenApiSpec` | LLM returns non-JSON |
| `services/governance-engine/run-orchestrator.ts:284` | `JSON.parse(content)` | Malformed content |
| `lib/crypto/index.ts:262` | `JSON.parse(encrypted) as EncryptionPayload` | Corrupted encrypted data |
| `queue/index.ts:152` | `JSON.parse(result.element) as { id: string }` | Corrupted Redis entry |

### Missing Error Boundaries
- `app/content/page.tsx` — no error.tsx
- `app/evaluate/page.tsx` — no error.tsx
- `app/partnerships/page.tsx` — no error.tsx
- `app/_internal/review/page.tsx` — no error.tsx (inherits root, but no specific boundary)

### Unsafe JSON.parse Patterns
30+ `JSON.parse()` calls found. Most dangerous are those parsing LLM responses (non-deterministic output). Key locations:
- `services/review-guard/index.ts:635` — LLM response parsed as `Issue[]`
- `services/review-guard/async-processor.ts:236` — regex-extracted JSON parsed
- `services/doc-sync/index.ts:657,690` — LLM response parsed as OpenAPI spec
- `services/governance-engine/run-orchestrator.ts:284` — content parsed as unknown
- `app/(public)/runner-import/page.tsx:67` — user-uploaded file parsed
- `app/(public)/policy-verification/page.tsx:80,99` — user-uploaded file parsed

**Recommended:** Wrap all LLM and user-input `JSON.parse()` calls in try/catch with fallback.

### Type Safety Erosions
- `components/ui/button.tsx:66` — `{...(props as any)}`
- `lib/prisma.ts:41,53,74` — 3x `@ts-ignore` for Prisma types
- `e2e/billing-workflow.spec.ts` — 6x `as any` in test fixtures
- `scripts/generate-openapi.ts` — 3x `as any`

---

## 7. Security Findings

### Critical

**S1: Open Redirect in Auth Callback**
- **File:** `app/(public)/auth/callback/route.ts:12,22`
- **Evidence:** `const redirect = requestUrl.searchParams.get('redirect') || '/'` then `NextResponse.redirect(new URL(redirect, request.url))` — no origin/host validation
- **Impact:** Attacker crafts URL like `/auth/callback?code=xxx&redirect=https://evil.com` — after successful auth, user is redirected to malicious site
- **Fix:** Validate that `redirect` starts with `/` and does not contain `//` or external protocol

### High

**S2: GitHub Webhook Signature Verification Not Visible in Route Handler**
- **File:** `app/api/webhooks/github/route.ts:124`
- **Evidence:** Signature is extracted (line 53) and passed to `githubWebhookHandler.handleEvent(eventData, installationId, signature)` but the route handler itself never performs HMAC verification. If the downstream handler skips verification, any payload is accepted.
- **Impact:** Forged webhook events could trigger code reviews, governance runs, and billing operations
- **Fix:** Verify signature in the route handler before processing, or audit `githubWebhookHandler.handleEvent` to confirm it validates

**S3: Bitbucket/GitLab Webhook Routes Parse JSON Without Signature Verification**
- **Files:** `app/api/webhooks/bitbucket/route.ts:54`, `app/api/webhooks/gitlab/route.ts:67`
- **Evidence:** Both routes do `event = JSON.parse(payload)` — need to verify if signature validation occurs
- **Impact:** Same as S2 for non-GitHub providers

### Medium

**S4: `dangerouslySetInnerHTML` for JSON-LD**
- **File:** `app/(public)/layout.tsx:48,52`
- **Evidence:** `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}`
- **Risk:** Low — `JSON.stringify` of a static object is safe. No user input flows into the JSON-LD.
- **Status:** Acceptable pattern

**S5: Error Messages Leak Internal Details**
- **File:** `app/api/webhooks/github/route.ts:154`
- **Evidence:** `message: error instanceof Error ? error.message : 'Unknown error'` — internal error messages returned to caller
- **Impact:** Information disclosure (stack traces, internal paths)

**S6: No CSP Header**
- **File:** `next.config.js:66-98`
- **Evidence:** Security headers include X-Frame-Options, HSTS, etc., but no `Content-Security-Policy` header
- **Impact:** Reduced XSS protection

### Low

**S7: `NEXT_PUBLIC_SUPABASE_ANON_KEY` Exposure**
- **Status:** Safe by design — Supabase anon keys are intentionally public. RLS enforces access control.

**S8: Request ID Generation Uses Math.random()**
- **Files:** Multiple route handlers (e.g., `app/api/webhooks/github/route.ts:49`)
- **Evidence:** `req_${Date.now()}` — not cryptographically unique, but used only for log correlation. Low risk.

---

## 8. Performance & Build Findings

### Build Issues
1. **Broken dependency installation**: `@types/node`, `@types/react`, `@types/react-dom` not installed. `vitest` binary missing. This is the **P0 blocker** — likely needs `npm install` in a clean environment or dependency version resolution.
2. **Next.js 16 with Turbopack**: `next.config.js:22` has `turbopack: {}` — verify Vercel supports Next.js 16 in production.
3. **`ignoreBuildErrors: false`**: Good — TypeScript errors correctly block builds.

### Bundle Opportunities
1. **No `@next/bundle-analyzer` installed**: Config exists in `next.config.js:4-14` but the package isn't in devDependencies. Enable to identify large bundles.
2. **Redirect stub pages**: 15+ pages that are just `redirect()` calls create unnecessary route segments. `next.config.js` already defines the same redirects — the page-level redirects are redundant.
3. **Large `.opencode_bundle.json` (24MB)**: Sitting in repo root. Should be in `.gitignore` if not needed for builds.
4. **Rust crates (`crates/`)**: `Cargo.toml` at root. Not part of Next.js build but adds repo size. Verify if these are built separately.

### SSR/Edge Considerations
- Middleware uses Node.js runtime (not Edge) — `middleware.ts` re-exports from `middleware/proxy.ts`
- Webhook routes correctly set `export const runtime = 'nodejs'`
- `vercel.json` sets `maxDuration: 60` for API routes — adequate for LLM calls

### Image Optimization
- `next.config.js` properly configures `images` with avif/webp formats and cache TTL
- `sharp` is in devDependencies — should be in `dependencies` for production image optimization

---

## 9. Maintainability & Refactor Candidates (NOT executed)

| # | Candidate | Why | Risk | Payoff | Scope |
|---|-----------|-----|------|--------|-------|
| R1 | Remove duplicate redirect pages | 15+ `redirect()` stub pages duplicate `next.config.js` redirects | Low | Reduced route surface, faster builds | Small |
| R2 | Centralize `JSON.parse` with safe wrapper | 30+ unguarded parse calls; LLM responses especially risky | Medium | Prevent runtime crashes from malformed JSON | Medium |
| R3 | Move orphan pages into route groups | `app/content/`, `app/evaluate/`, `app/partnerships/` lack layout wrapping | Low | Visual consistency, error boundary coverage | Small |
| R4 | Extract env validation to Zod schema | Current `EnvValidator` class is manual; Zod would provide better types and error messages | Low | Better DX, self-documenting config | Medium |
| R5 | Consolidate `@ts-ignore` in `lib/prisma.ts` | 3 ts-ignores for Prisma event types | Low | Type safety | Small |
| R6 | Move `sharp` to production dependencies | Currently in devDependencies; needed for image optimization in production | Low | Image optimization works in production | Trivial |
| R7 | Add CSP header | Missing Content-Security-Policy | Low | XSS protection | Small |
| R8 | Audit `as any` in `components/ui/button.tsx` | Props spread as any bypasses type checking | Low | Type safety for core UI component | Small |

---

## 10. Prioritized Fix Plan

### P0 — Must Fix for Build Stability

| # | Fix | Rationale | Blast Radius |
|---|-----|-----------|-------------|
| P0-1 | **Fix dependency installation** (`@types/node`, `@types/react`, `@types/react-dom`, `vitest`) | Build and tests are completely broken | Global — nothing works without this |
| P0-2 | **Fix open redirect in auth callback** (`app/(public)/auth/callback/route.ts`) | Critical security vulnerability — allows phishing post-auth | Auth flow |
| P0-3 | **Verify GitHub webhook signature validation** occurs in `githubWebhookHandler.handleEvent()` | If not validated, anyone can forge webhooks | Webhook processing pipeline |

### P1 — Resilience & Security Hardening

| # | Fix | Rationale | Blast Radius |
|---|-----|-----------|-------------|
| P1-1 | Wrap LLM-response `JSON.parse` calls in try/catch | LLM output is non-deterministic; malformed JSON causes hard 500 | Review guard, doc-sync, governance engine |
| P1-2 | Add CSP header to `next.config.js` | Defense-in-depth for XSS | All pages |
| P1-3 | Sanitize error messages in webhook responses | Internal error messages leak to callers | API security |
| P1-4 | Verify Bitbucket/GitLab webhook signature validation | Same risk as GitHub webhook | Webhook routes |
| P1-5 | Add error boundaries for orphan pages | `content/`, `evaluate/`, `partnerships/` have no error.tsx | 3 pages |

### P2 — Refactors & Performance

| # | Fix | Rationale | Blast Radius |
|---|-----|-----------|-------------|
| P2-1 | Remove duplicate redirect stub pages | Redundant with `next.config.js` redirects | 15+ files |
| P2-2 | Move `sharp` to production dependencies | Image optimization in prod | Build config |
| P2-3 | Add `.opencode_bundle.json` to `.gitignore` | 24MB file in repo | Repo size |
| P2-4 | Centralize safe JSON parsing utility | 30+ unguarded calls | Services layer |
| P2-5 | Move orphan pages into route groups | Layout/error boundary consistency | 3 pages |

### Ordering Rationale
P0 items block all development and deployment. P0-1 (deps) is prerequisite for everything. P0-2 (open redirect) is an immediately exploitable security flaw. P0-3 (webhook verification) could allow forged events in production. P1 items harden runtime resilience. P2 items improve maintainability without urgency.

---

Discovery complete: ready for Build Agent.
