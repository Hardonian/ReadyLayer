# ReadyLayer

**ReadyLayer provides governance tooling for AI-assisted software delivery.** It ships a web app, CLI, and a deterministic runner that help teams capture policy decisions, evidence, and review signals around generated code.

**Landing strip**
- **Deterministic policy runner** with schema-defined input/output and evidence bundles (Go binary).  
- **Web app + API** for viewing governance runs, policies, and evidence (Next.js + Prisma).  
- **CLI workflows** for reviewing files and triggering governance-related actions (Node).  
- **JobForge queue** for background processing and webhook/report workflows.  
- **Self-hosted first**: runs locally with your infrastructure and credentials.

**Who this is for:** engineering teams, platform teams, and OSS contributors who need auditable governance around AI-assisted code changes.

**Quick start:** Follow the steps in [Quick Start](#quick-start) to run the web app locally.

---

## Why This Exists
AI-assisted coding makes it easy to ship faster than teams can review or audit. ReadyLayer exists to keep governance (policy checks, evidence capture, traceability) deterministic and reviewable without replacing your CI/CD or existing tooling.

## What This Project Is
- A **Next.js application** that surfaces governance runs, policies, and audit evidence.  
- A **CLI** for interacting with ReadyLayer APIs and JobForge workflows.  
- A **deterministic runner** that executes checks and emits structured JSON evidence.  
- A **job queue subsystem (JobForge)** for background tasks and integrations.  

## What This Project Is NOT
- Not a replacement for your CI/CD pipeline, linters, or test frameworks.  
- Not an AI code generator or IDE.  
- Not a hosted SaaS-only product; this repo is self-hostable and must be run with your own infrastructure.

## Where This Fits (If Part of a Larger System)
ReadyLayer is designed to sit alongside your source control and CI/CD workflows:
- **Inputs:** repositories, pull requests, policy configuration, and evidence from tests/scans.  
- **Outputs:** deterministic governance results (pass/fail + evidence) surfaced in the UI or exported as JSON.  
- **Dependencies:** Postgres + Supabase auth are required; Redis is optional for queue performance.  

## Core Capabilities
- Deterministic runner with schema-based input/output (`tools/ready-layer-runner`).  
- Next.js web app with API routes under `app/` and supporting UI/components.  
- CLI for review/test operations and JobForge administration (`cli/readylayer-cli.ts`).  
- JobForge queue implementation and workers (`lib/jobforge`, `services/jobforge-worker`).  
- Policy and SARIF helper scripts (`scripts/readylayer-*.mjs`).
- AI Provenance Packs (internal + external) with hashed payloads, redaction controls, and pack-level drill-down views.
- Deterministic evidence ZIP export that merges run/stage evidence, provenance artifacts, and policy checksums.

## Quick Start
**Prerequisites:** Node.js 20, Postgres, Supabase project keys, and at least one LLM API key (OpenAI or Anthropic).

```bash
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
npm install
cp .env.example .env
# Fill in DATABASE_URL, Supabase keys, and an LLM API key in .env
npm run dev
```

Open http://localhost:3000

## Demo Mode
ReadyLayer includes a deterministic demo mode that showcases the full governance pipeline without requiring external credentials, a database, or a real repository. Every run produces identical results so the output is safe to snapshot in tests and CI.

### Running demo mode locally

```bash
# Start the dev server in demo mode (no secrets needed)
npm run demo:start

# Or set the flag yourself
DEMO_MODE_ENABLED=true npm run dev
```

Open http://localhost:3000 and navigate to **Dashboard > Runs > Sandbox Demo**, or call the API directly:

```bash
# Full pipeline
curl http://localhost:3000/api/demo | jq .

# Filter to specific checks
curl -X POST http://localhost:3000/api/demo \
  -H 'Content-Type: application/json' \
  -d '{"checkIds":["rg-security","te-unit"]}' | jq .
```

### What the demo covers

| Stage | Findings |
|---|---|
| **Review Guard – Security** | SQL injection (critical), hardcoded secret (high) |
| **Review Guard – Performance** | Missing pagination (medium) |
| **Review Guard – Quality** | Unsafe regex / ReDoS (critical) |
| **Test Engine** | 3 unit test scaffolds generated, +5 % coverage delta |
| **Doc Sync** | OpenAPI spec, README update, changelog entry |

The pipeline decision is **blocked** because critical findings are present.

### Seeding the database for demo mode

If you have a database running, you can populate it with deterministic demo records:

```bash
DEMO_MODE_ENABLED=true npm run prisma:seed
```

This creates a demo organization, user, repository, and a completed run record using fixed IDs and timestamps.

### Running demo E2E tests

The demo E2E tests exercise the full pipeline via the real Next.js server with Playwright. They require **zero external secrets**.

```bash
# Run demo E2E locally (builds, starts server, runs tests)
npm run demo:e2e
```

CI runs the demo E2E tests automatically (see `.github/workflows/ci.yml`, job `demo-e2e`).

### API Endpoints

- `GET /api/demo` – Execute the full deterministic demo pipeline
- `POST /api/demo` – Execute with optional check filtering: `{ "checkIds": ["rg-security", "te-unit"] }`

## Architecture Overview
- `app/`: Next.js App Router pages, API routes, and UI surfaces.  
- `lib/`: shared business logic (auth helpers, JobForge client, secrets redaction).  
- `cli/`: ReadyLayer CLI entrypoint.  
- `tools/ready-layer-runner/`: Go-based deterministic runner with JSON schemas.  
- `services/`: worker services and supporting subsystems (including JobForge worker).  
- `prisma/`: database schema and migrations.  

## Extending the Project
- **Add UI or API routes** in `app/` while respecting existing route contracts.  
- **Add runner checks** by extending the Go runner and its JSON schemas in `tools/ready-layer-runner`.  
- **Add background workflows** by implementing new JobForge handlers in `services/jobforge-worker` and queueing jobs via `lib/jobforge`.  
- **CLI extensions** live in `cli/readylayer-cli.ts`; keep exit codes deterministic and redact secrets in output.  

## Failure & Degradation Model
- If required environment variables are missing, the app fails fast with clear validation errors.  
- The runner exits non-zero for failed checks and emits a JSON summary that callers can inspect.  
- CLI commands return non-zero exit codes on errors or policy failures.  
- Optional integrations (Redis, JobForge) are gated by environment flags and fail closed when disabled.

## Security & Safety Considerations
- Treat `.env` values and API keys as secrets; never commit them.  
- The codebase includes secret redaction utilities for CLI/log output.  
- Run ReadyLayer behind HTTPS and restrict access to the admin UI in production.  
- Review and rotate credentials regularly; keep database access scoped to least privilege.

## Contributing
We welcome issues, documentation improvements, and code contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflows, and discussion guidance. Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License & Governance
ReadyLayer is licensed under the [Apache 2.0 License](./LICENSE). Governance and maintainer responsibilities are described in [GOVERNANCE.md](./GOVERNANCE.md).
