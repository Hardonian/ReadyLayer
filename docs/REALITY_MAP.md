# ReadyLayer Reality Map (Docs)

## 1) System Overview (Reality Pass)

ReadyLayer is a multi-surface governance platform with a single core pipeline:

- **Web app + API**: Next.js App Router under `app/`
- **Service layer**: orchestration in `services/`
- **Workers**: background processors in `workers/`
- **Deterministic runner**: Go binary in `tools/ready-layer-runner/`
- **CLI**: Node CLI in `cli/`

Primary data stores:
- **PostgreSQL** (Prisma): governance runs, reviews, audit logs, configs
- **Redis** (optional): rate limiting, job queues, cache

External dependencies:
- GitHub/GitLab/Bitbucket (webhooks + OAuth)
- Stripe (billing)
- Supabase (Auth)
- OpenAI/Anthropic (optional LLM)

## 2) Entry Points (Routes & Workers)

### Web UI (App Router)
- `app/(app)/dashboard/*`: admin + user surfaces
- `app/(public)/*`: marketing and docs
- `app/error.tsx`, `app/global-error.tsx`: error boundaries

### API Routes (Next.js)
- `/api/webhooks/*`: GitHub/GitLab/Bitbucket/Stripe/Slack ingress
- `/api/v1/*`: authenticated platform APIs (repos, runs, policies, waivers)
- `/api/health`, `/api/ready`: liveness/readiness
- `/api/demo`, `/api/v1/runs/sandbox`: demo mode endpoints

### Workers
- `workers/webhook-processor.ts`: webhook event processing
- `workers/job-processor.ts`: job execution + retries

## 3) Core Flows (Routes → Actions → Data Stores)

### A) PR Event → Governance Run

1. **Ingress**: `POST /api/webhooks/github`
2. **Validation**: raw-body signature + replay protection + rate limiting
3. **Normalize**: `integrations/github/webhook.ts`
4. **Queue**: `queueService.enqueue('webhook', …)`
5. **Worker**: `workers/webhook-processor.ts`
6. **Pipeline**: `services/run-pipeline`
7. **Persistence**: `ReadyLayerRun`, `Review`, `AuditLog`, `Job`, `OutboxIntent`

### B) Manual Run → Results

1. **Ingress**: `POST /api/v1/runs`
2. **AuthZ**: `requireAuth` + `authz` middleware
3. **Pipeline**: `services/run-pipeline`
4. **Persistence + Evidence**: `ReadyLayerRun`, `AuditLog`, `Document`

### C) Demo Mode (Deterministic Sandbox)

1. **Ingress**: `GET /api/demo` or `POST /api/v1/runs/sandbox`
2. **Fixtures**: `content/demo/sandboxFixtures.ts`
3. **Pipeline**: `lib/demo/pipeline.ts` (no external calls)
4. **Determinism**: fixed `DEMO_RUN_ID` + `DEMO_SANDBOX_ID`
5. **Reset**: `npm run demo:reset` clears sandbox runs

## 4) External Dependencies & Contracts

| Boundary | Contract | Validation |
|----------|----------|------------|
| GitHub Webhook | `lib/contracts/github-webhook.ts` | Zod validation + signature verification |
| Health API | `lib/contracts/health.ts` | Zod response validation in tests |
| Runs API | `lib/contracts/schemas.ts` | Zod validation in contract tests |

## 5) Invariants (Must Not Break)

- **No hard 500s** on user routes; always return structured errors.
- **Tenant isolation** enforced via `authz` + org membership checks.
- **Webhook security**: raw payload signature verification + replay protection.
- **Rate limiting** for public endpoints (Redis-backed, in-memory fallback).
- **Demo mode** must stay deterministic + resettable.
- **Secrets hygiene**: no secrets in code or logs; `.env` never committed.

## 6) Hot Paths (Observed)

| Hot Path | Notes |
|----------|-------|
| `/api/v1/runs/sandbox` | Demo run orchestration; tracked via hot-path metrics |
| `/api/demo` | Deterministic pipeline; tracked via hot-path metrics |
| Webhook ingestion | Rate-limited + replay-protected; contracts validated |

## 7) Operational Commands (Reality Map)

- Install: `npm install`
- Lint/typecheck: `npm run verify:fast`
- Unit tests: `npm test`
- Build: `npm run build`
- Smoke: `npm run middleware:smoke`
- Demo mode: `npm run demo:setup`, `npm run demo:start`, `npm run demo:reset`
