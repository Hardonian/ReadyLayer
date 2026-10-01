# ReadyLayer

<!-- BEGIN: REPO HERO -->
![ReadyLayer — hero generated locally on the GPU stack](assets/repo-hero.png)
<!-- END: REPO HERO -->

**ReadyLayer is the open-source governance and trust plane for autonomous AI coding agents.** It bridges the critical enterprise gap between raw agent velocity (Cursor, Claude Code, Windsurf, Devin) and strict software delivery integrity with deterministic policy evaluation, package slopsquatting defense, and cryptographically verifiable in-toto/SLSA provenance.

**Landing strip**
- **AI Package Slopsquatting & Hallucination Guardrail**: Intercepts AI-hallucinated package additions before dependency installation or CI execution.
- **Agent Blast Radius Containment Engine**: Enforces strict perimeter boundaries (Tier 0 to Tier 3) and dual-custody cryptographic gating for CI/CD, Terraform, IAM, and DB schema mutations.
- **Cryptographic in-toto v1.0 & CycloneDX AIBOM**: Mints signed SLSA Level 2+ provenance statements and Generative AI Software Bill of Materials.
- **Model Context Protocol (MCP) Agent Suite**: Real-time stdio/SSE MCP gateway for Cursor, Claude Code, and autonomous agent loops (`readylayer.preflight_check`, `readylayer.scan_package`).
- **Turn-Key Regulatory Policies**: Pre-configured policy packs for OWASP LLM Top 10 (2025/2026), NIST AI RMF (SP 1270), and EU AI Act (Articles 14 & 50).
- **Deterministic Policy Runner**: Single static Go binary sidecar with zero network calls and schema-validated JSON evidence bundles.
- **Self-hosted & Air-Gapped First**: Runs 100% locally with zero external telemetry or cloud dependency.

**Who this is for:** engineering leaders, security teams, platform architects, and open-source contributors deploying autonomous coding agents in production codebases.

**Quick start:** Follow the steps in [Quick Start](#quick-start) to run the web app locally.

---

## Why This Exists
Autonomous coding agents can write code orders of magnitude faster than humans can review. However, this creates three critical enterprise vectors:
1. **Supply Chain Slopsquatting**: LLMs hallucinate non-existent package dependencies that attackers register on package registries to gain RCE.
2. **Blast Radius Escalation**: Agents silently modify CI/CD pipelines, IAM policies, and database migrations without human awareness.
3. **The Accountability Void**: Regulated enterprises (finance, healthcare, defense) cannot merge agent-generated code without verifiable, signed cryptographic provenance.

ReadyLayer provides the deterministic control plane to solve all three without slowing down developer velocity.

## Core Capabilities
- **Agent Guard CLI & MCP Gateway**: Run preflight containment checks directly from agent sessions (`readylayer agent-guard`, `readylayer attest`, `readylayer aibom`).
- **Deterministic Go Policy Runner**: Schema-defined inputs and outputs with hashed artifacts (`tools/ready-layer-runner`).
- **Cryptographic Attestation Vault**: Signed in-toto v1.0 statements and CycloneDX 1.6 Generative AI BOMs (`lib/agent-guard/attestation.ts`).
- **Enterprise Web App & API**: Next.js App Router dashboard for real-time run inspection, policy overrides, and compliance reporting (`app/`).
- **JobForge Queue Subsystem**: Resilient background job queue for async webhooks and compliance exports (`lib/jobforge`).

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
