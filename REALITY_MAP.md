# ReadyLayer Reality Map

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ReadyLayer Platform                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  External Integrations                    │  Internal Core                      │
├───────────────────────────────────────────┼────────────────────────────────────┤
│  GitHub (Webhooks + OAuth + API)          │  Next.js App Router (app/)         │
│  GitLab (Webhooks + OAuth)                 │  Prisma ORM + PostgreSQL            │
│  Bitbucket (Webhooks)                      │  Supabase Auth                      │
│  Stripe (Billing)                          │  Job Queue (Redis/Postgres)         │
│                                            │  CLI (cli/readylayer-cli.ts)       │
│                                            │  Go Runner (tools/ready-layer-runner)│
└───────────────────────────────────────────┴────────────────────────────────────┘
```

## 2. Authentication & Authorization Flow

```
User Request
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Auth Pipeline (lib/auth.ts)                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ API Key Auth    │  │ Supabase Session │  │ Organization Membership     │  │
│  │ rl_<hash>       │  │ JWT Token        │  │ Role: owner/admin/member    │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────────┘  │
│           │                   │                          │                      │
│           └───────────────────┼──────────────────────────┘                      │
│                               ↓                                                 │
│                    ┌──────────────────────┐                                    │
│                    │ requireAuth(request) │                                    │
│                    └──────────┬───────────┘                                    │
│                               ↓                                                 │
│                    ┌──────────────────────┐                                    │
│                    │ RBAC Enforcement     │                                    │
│                    │ (authz.ts)           │                                    │
│                    └──────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3. Database Schema (Prisma) - Core Models

```
Organizations (Organization)
├── OrganizationMember (User ↔ Organization, roles: owner/admin/member)
├── Repository (connected repos, provider: github/gitlab/bitbucket)
├── Installation (app installations, encrypted tokens)
├── PolicyPack (policy bundles)
├── GovernanceRun (run records)
├── Job (background jobs)
├── CostTracking / TokenUsage
└── RepositoryConfig (.readylayer.yml parsed)

Users (User - Supabase Auth compatible)
├── OrganizationMember
├── ApiKey (rl_<hash> prefixed)
├── Review (review results)
├── Job
└── AuditLog

Repositories
├── Review (PR reviews)
├── Test (generated tests)
├── Doc (documentation)
├── Waiver (policy waivers)
├── ReadyLayerRun (pipeline runs)
└── Violation (policy violations)
```

## 4. UI Routes → Actions/API → Services → DB

| UI Route | API/Action | Service Layer | DB Tables |
|----------|-----------|--------------|-----------|
| `/dashboard` | server components | runPipelineService | ReadyLayerRun, Review |
| `/dashboard/runs` | `/api/v1/runs` | runPipelineService | ReadyLayerRun |
| `/dashboard/runs/sandbox` | `/api/v1/runs/sandbox` | runPipelineService.createSandboxRun() | ReadyLayerRun (sandboxId) |
| `/dashboard/reviews` | `/api/v1/reviews` | reviewGuardService | Review, Issue |
| `/dashboard/policies` | `/api/v1/policies` | policyEngineService | PolicyPack, PolicyRule |
| `/dashboard/repos` | `/api/v1/repos` | repository service | Repository, Installation |
| `/dashboard/repos/connect` | GitHub OAuth flow | githubOAuth.ts | OAuthState |
| `/dashboard/findings` | server components | staticAnalysisService | Issue, Violation |
| `/dashboard/evidence` | `/api/v1/evidence` | rag service | Document (evidence index) |
| `/dashboard/billing` | `/api/v1/billing` | billing service | Subscription, CostTracking |
| `/dashboard/admin/*` | authenticated + admin role | admin services | All tables |

## 5. PR Event → Ingestion → Analysis → Outputs Pipeline

```
GitHub/GitLab/Bitbucket Webhook
    ↓
POST /api/webhooks/{provider} (raw body, signature verification)
    ↓
Webhook Handler (integrations/{provider}/webhook.ts)
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Signature Validation (HMAC-SHA256 constant-time compare)                     │
│  - Validates raw payload against X-Hub-Signature-256 header                  │
│  - Installation lookup + webhook secret check                                 │
│  - Idempotency: event deduplication via queue                                 │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
Normalized Event (WebhookEvent contract)
    ↓
Queue: 'webhook' (Redis/Postgres backed)
    ↓
Webhook Processor Worker (workers/webhook-processor.ts)
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  processWebhookEvent(event)                                                   │
│  ├── pr.opened/pr.updated → processPREvent()                                 │
│  ├── merge.completed → processMergeEvent()                                   │
│  └── ci.completed → processCIEvent()                                         │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Run Pipeline Service (services/run-pipeline/index.ts)                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STAGE 1: Review Guard (parallel with 2,3)                            │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────┐ │  │
│  │  │ Static Analysis │  │ AI Review (LLM) │  │ Policy Evaluation     │ │  │
│  │  │ (rules-based)   │  │ (RAG-enhanced)  │  │ (severity → block)   │ │  │
│  │  └────────┬────────┘  └────────┬────────┘  └───────────┬───────────┘ │  │
│  │           └─────────────────────┬───────────────────────┘             │  │
│  │                               ↓                                      │  │
│  │                    ReviewResult {issues[], isBlocked}                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STAGE 2: Test Engine (parallel with 1,3)                            │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────┐ │  │
│  │  │ AI-touched file │  │ Generate Tests │  │ Coverage Check        │ │  │
│  │  │ detection       │  │ (Jest/Vitest)   │  │ (if CI results)      │ │  │
│  │  └────────┬────────┘  └────────┬────────┘  └───────────┬───────────┘ │  │
│  │           └─────────────────────┬───────────────────────┘             │  │
│  │                               ↓                                      │  │
│  │                    TestEngineResult {testsGenerated, meetsThreshold} │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STAGE 3: Doc Sync (parallel with 1,2)                              │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────┐ │  │
│  │  │ Drift Detection │  │ Generate Docs  │  │ OpenAPI Spec Update   │ │  │
│  │  │ (code vs docs) │  │ (README/API)    │  │ (on merge)           │ │  │
│  │  └────────┬────────┘  └────────┬────────┘  └───────────┬───────────┘ │  │
│  │           └─────────────────────┬───────────────────────┘             │  │
│  │                               ↓                                      │  │
│  │                    DocSyncResult {driftDetected, missingEndpoints}  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Output Actions                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ GitHub Checks API (prAdapter.createOrUpdateCheckRun)                  │  │
│  │ - 'ReadyLayer' check run with conclusion (success/failure/action_req) │  │
│  │ - Output.annotations for specific file/line findings                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ PR Comments (formatPolicyComment)                                      │  │
│  │ - Only on blocking findings                                            │  │
│  │ - Summary + top issues + link to dashboard                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Evidence Index (RAG)                                                  │  │
│  │ - Ingest review_result, test_precedent, doc_convention, pr_diff      │  │
│  │ - For future AI context / audit trail                                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Database Persistence                                                  │  │
│  │ - ReadyLayerRun (run record)                                          │  │
│  │ - Review (findings), Test (generated tests), Doc (docs)               │  │
│  │ - Violation (waived/non-waived issues)                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6. Policy Engine Architecture (services/policy-engine/)

```
Policy Configuration
├── PolicyPack (bundle)
│   ├── name, description, severity baseline
│   ├── enabled: boolean
│   ├── rules: PolicyRule[]
│   └── inheritance: from parent packs
│
├── PolicyRule
│   ├── id: string (e.g., 'security.sql-injection')
│   ├── category: 'security' | 'quality' | 'performance'
│   ├── severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
│   ├── enabled: boolean
│   ├── action: 'block' | 'warn' | 'info'
│   └── evidence: { patterns, examples }
│
└── Templates (templates.ts)
    ├── oss-baseline: minimum viable rules
    ├── strict: all rules enabled
    └── enterprise: custom configurations

Evaluation Flow
    ↓
policyEngineService.evaluate(request, ruleset)
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Rule Matching                                                                │
│  1. Pattern matching (regex/globs)                                            │
│  2. Severity determination                                                  │
│  3. Waiver check (hasWaiver(ruleId, repoId))                                │
│  4. Blocking decision (critical always blocks)                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 7. Go Runner (tools/ready-layer-runner/)

```
Schema Contracts
├── Input: schemas/runner_input.schema.json
│   └── { repo_path, checks[], output_dir, mode: local|ci }
│
├── Output: schemas/runner_output.schema.json
│   └── { findings[], evidence[], exit_code }
│
└── Fixtures: tools/ready-layer-runner/fixtures/

Execution Model
├── Standalone binary (Go)
├── No network calls (OSS-first)
├── Deterministic output (hashed evidence)
└── Exit codes: 0=success, 1=failure
```

## 8. Sandbox/Demo Mode

```
Sandbox Endpoint: POST /api/v1/runs/sandbox
    ↓
runPipelineService.createSandboxRun()
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Deterministic Fixtures (content/demo/sandboxFixtures.ts)                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ File: src/auth.ts                                                     │ │
│  │ - SQL injection vulnerability                                         │ │
│  │ - Hardcoded secret 'FAKE_STRIPE_KEY_DEMO...'                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ File: src/api/users.ts                                                │ │
│  │ - Missing error handling                                             │ │
│  │ - Missing input validation                                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ File: src/utils/validation.ts                                         │ │
│  │ - Unsafe regex pattern                                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
Pipeline Execution (identical to webhook-triggered runs)
    ↓
Results with Deterministic Findings
├── Review Guard: 4-5 issues detected
├── Test Engine: Tests generated for touched files
└── Doc Sync: Drift detected on undocumented endpoints
```

## 9. Background Jobs & Queue System

```
Queue Backend: Redis (primary) or Postgres fallback
Queue Service: lib/queue.ts (queueService)
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Queue Types                                                                  │
│  ├── 'webhook': webhook processing (deduplicated by event_id)               │
│  ├── 'job': general background jobs                                          │
│  └── 'llm': LLM processing (async enrichment)                               │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
Workers
├── workers/webhook-processor.ts (npm run worker:webhook)
├── workers/job-processor.ts (npm run worker:job)
├── workers/test-executor-worker.ts
└── services/jobforge-worker/src/cli.ts (npm run jobforge:worker)
```

## 10. Webhook Security (Critical Path)

```
GitHub Webhook Flow (app/api/webhooks/github/route.ts)
    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  Validation Layers                                                           │
│  1. Headers: X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Installation-ID   │
│  2. Payload: raw body (not re-stringified) for signature verification       │
│  3. Schema: GitHubWebhookEventSchema (Zod validation)                        │
│  4. Signature: HMAC-SHA256 constant-time compare                             │
│  5. Installation: webhookSecret lookup + active check                        │
│  6. Idempotency: queue deduplication                                         │
└──────────────────────────────────────────────────────────────────────────────┘
    ↓
integrations/github/webhook.ts
├── validateSignature(payload, signature, secret) → boolean
├── handleEvent(event, installationId, signature, rawPayload)
└── Optimistic locking: updatedAt check prevents race conditions
```

## 11. Observability Stack

```
Logging: lib/logger.ts (Pino)
├── Request-scoped logs (correlationId)
├── Structured JSON output
└── Secret redaction (redactSecrets())

Metrics: observability/metrics.ts
├── webhooks.received/processed/failed
├── runs.completed (by conclusion)
└── llm.tokens.used

Health: observability/health.ts
├── /api/health endpoints
└── Readiness/liveness probes
```

## 12. GitHub Integration Details

```
GitHub OAuth Flow (integrations/github/oauth.ts)
├── OAuth app configuration (CLIENT_ID, CLIENT_SECRET)
├── Authorization URL: https://github.com/login/oauth/authorize
├── Token exchange: POST https://github.com/login/oauth/access_token
└── Installation flow: GitHub App manifest

GitHub API Client (integrations/github/api-client.ts)
├── getPRDiff(fullName, prNumber, token)
├── getFileContent(fullName, path, sha, token)
├── createOrUpdateCheckRun(fullName, headSha, checkRun, token)
└── postPRComment(fullName, prNumber, comment, token)

GitHub Webhook Events Supported
├── pull_request (opened, synchronize, closed)
├── push (merge completed)
├── check_run / workflow_run (CI completed)
└── installation (app installed/uninstalled)
```

## 13. Key File Locations

### Core Application
- `app/` - Next.js App Router pages and API routes
- `lib/` - Shared business logic (auth, jobs, middleware, observability)
- `services/` - Worker services (JobForge, Review Guard, Test Engine, Doc Sync)
- `prisma/` - Database schema and migrations
- `workers/` - Background workers (webhook, job processors)
- `integrations/` - Git provider adapters, OAuth handlers

### Pipeline Services
- `services/run-pipeline/index.ts` - Main pipeline orchestrator
- `services/review-guard/index.ts` - Review Guard implementation
- `services/test-engine/index.ts` - Test Engine implementation
- `services/doc-sync/index.ts` - Doc Sync implementation
- `services/policy-engine/index.ts` - Policy engine with rules

### Configuration
- `lib/env.ts` - Environment variable validation (Zod)
- `config/feature-flags.ts` - Feature flags
- `tailwind.config.ts` + `app/globals.css` - Styling

### Testing
- `__tests__/` - Unit tests
- `e2e/` - Playwright tests (visual + functional)
- `scripts/` - Utility scripts for testing

### Documentation
- `docs/` - Architecture docs, runbooks, integration guides
- `README.md` - Quick start and architecture overview
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security model and reporting
