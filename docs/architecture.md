# ReadyLayer Architecture

> Verified against the codebase (2026-09-30). Where a component is simulated or
> incomplete, it is labeled as such — this document describes what exists.

## What It Solves

ReadyLayer governs AI-generated code before it reaches `main`: deterministic
policy checks on pull requests, evidence trails for every decision, and
organization-level policy packs — model-agnostic, Git/CI native.

## System Overview

```
 GitHub/GitLab/Bitbucket          Browser (Next.js App Router)
   webhooks + OAuth                 (public) marketing / auth
        │                           (app) dashboard
        ▼                                  │
 ┌─────────────────────┐                   ▼
 │ middleware/proxy   │◄────────────  app/api/**
 │ default-deny auth  │               route handlers
 │ rate limiting      │                    │
 └─────────┬───────────┘                    ▼
           │                     ┌──────────────────────┐
           ▼                     │ services/            │
   Supabase (auth, RLS)          │  policy-engine       │
   Postgres (Prisma)             │  review-guard        │
           │                     │  test-engine         │
           ▼                     │  billing (Stripe)    │
   queue/ (Postgres job queue)──►│  outbox/run-pipeline │
   workers: webhook-processor    │  self-learning       │
            job-processor        └──────────┬───────────┘
            python worker (uv)              │
                                            ▼
                                 SDKs: TS / Python / Go / Java / C#
                                 (generated against sdk/openapi.json)
```

## Request Lifecycle (inbound provider webhook)

1. Provider POSTs to `/api/webhooks/{stripe,github,gitlab,bitbucket}`.
2. `middleware/proxy` sees the path in `PUBLIC_API_ROUTES` — these endpoints
   authenticate themselves (see security.md), so the middleware only applies
   rate limiting.
3. Route handler (Node runtime — required for raw-body signature checks)
   verifies the provider signature/timestamp before parsing business payload.
4. Events are enqueued on the Postgres-backed queue (`queue/`), processed by
   `workers/webhook-processor` with idempotency keys.
5. Every step emits structured logs (`observability/logging`, pino) and
   metrics counters; secrets pass through `lib/secrets/redaction` before any
   model call.

## Request Lifecycle (app/API call)

1. `middleware/proxy` default-denies: unauthenticated page routes redirect to
   `/auth/signin` with `callbackUrl`; unauthenticated API calls get 401 JSON
   (503 if the auth backend is down).
2. Session: Supabase SSR cookie validated server-side
   (`lib/middleware/edge-auth.getEdgeAuthUser`). API-key callers pass presence
   check at the edge; full key validation happens in-route (Prisma).
3. Tenant context derives from the session; data access is scoped by Prisma
   queries plus Supabase RLS (see `supabase/migrations`).

## AI / Model Architecture

- Model-agnostic by design: the governance pipeline treats model output as
  untrusted input. `lib/secrets/redaction` strips secret-shaped strings before
  prompts leave the process.
- Test generation (`services/test-engine`) is LLM-assisted with RAG evidence
  context and policy evaluation; generation failures are fail-open (never
  block a PR), policy enforcement is fail-closed where configured.
- Known limitation: `services/test-engine/executor.ts` framework executors are
  SIMULATED (documented in-code); real sandboxed execution is not implemented.

## Tool & MCP Architecture

- Provider integrations are OAuth apps + webhooks (GitHub App flows with CSRF
  state tokens, 10-minute expiry, redirect-URI allowlisting).
- Installation tokens are encrypted at rest (`lib/secrets/installation-helpers`).
- The webhook/action surface is intentionally narrow; dispatch endpoints that
  trigger repo operations stay user-authenticated.

## Multi-Tenancy

- Organization/user/repo hierarchy in Prisma; `organizationId` on tenant-owned
  tables.
- Supabase RLS policies in `supabase/migrations`; app-layer scoping is
  defense-in-depth, not the only boundary.
- Test infrastructure (E2E mock auth stub) validates sessions through the same
  middleware path as production — auth is never bypassed in tests.

## Observability

- Structured logs with request/run/tenant context; secrets redacted.
- Metrics counters (`observability/metrics`): webhook outcomes, OAuth flows,
  test execution, billing events, secret detections.
- Cost telemetry (`lib/telemetry/llm-costs`): per-org token usage, estimated
  cost, budget thresholds (50/75/90/100%), alert levels with `exceeded` state.

## Cost Governance

- Per-tenant monthly budgets with utilization tracking
  (`checkBudgetAlerts`, `getRemainingBudget`, `getBudgetUtilization`).
- Billing tiers enforced in middleware/route layer
  (`lib/billing-middleware`); over-limit calls raise `UsageLimitExceededError`
  with graceful client-side error states.

## Failure Modes

| Failure | Behavior |
|---|---|
| Auth backend down | API 503 with typed error body; pages redirect to sign-in |
| Provider webhook bad signature | 401/400 before payload parsing; metric incremented |
| Model/LLM timeout | Fail-open for reviews; static results returned first |
| Queue/DB outage | Webhook handler returns retryable status; provider retries |
| Budget exceeded | Typed error + UI state; no hard 500s on user routes |
| Test generation failure | Fail-open; PR not blocked |

## Deployment

- Vercel: production + staging deployments (CI `deploy.yml`, `deploy-staging.yml`)
  with post-deploy health checks (`scripts/ci-health-check.ts`, SSO-aware).
- Workers run separately (Node via tsx; Python via uv) — see `package.json`
  scripts `worker:*`.
- Note: the production Vercel deployment currently has Deployment Protection
  (SSO) enabled, so it is not publicly viewable.

## Testing Strategy

- Unit/integration: vitest (330 tests), DB-gated tests skip without
  `DATABASE_URL`.
- E2E: Playwright, chromium-first, authenticated via a local mock Supabase
  stub (real middleware session validation against a stubbed IdP).
- Visual regression: Playwright screenshots, reduced-motion emulation for
  determinism, baselines committed.
- UI consistency audit: 13 routes × 3 viewports — console errors, hydration,
  network failures, accessibility, reduced-motion, layout stability.

## Architecture Decisions (ADR summary)

1. **Default-deny middleware** — unknown paths are private unless allowlisted;
   safest posture for a multi-tenant SaaS (see `lib/access-control.ts`).
2. **Self-authenticating endpoints stay public at the middleware layer** —
   OAuth callbacks (CSRF state) and webhooks (provider signatures) verify
   themselves; blocking them at the edge broke both.
3. **Postgres-backed queue over external broker** — one operational surface,
   transactional enqueue with domain writes.
4. **Secrets redaction before any model call** — deterministic regex surface
   with non-overlapping span accounting; over-redaction preferred over leaks.
5. **Fail-open generation, fail-closed enforcement** — AI assistance never
   blocks merges; policy does when configured.
