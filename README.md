# ReadyLayer

**Governance infrastructure for AI-generated code.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)

---

## What This Is

ReadyLayer is **governance infrastructure** for AI-generated code. It provides deterministic policy enforcement, immutable audit trails, and continuous validation that operates at the velocity of AI code generation.

### The Problem You Already Have

If your team uses GitHub Copilot, Cursor, Claude, or any AI coding assistant, you already face these questions:

- **"Who is accountable when this AI-generated code fails in production?"**
- **"How do we prove to auditors that security scans were reviewed?"**
- **"What was the prompt that generated this implementation?"**
- **"Why did the AI choose this approach instead of alternatives?"**

These are not hypothetical concerns. They are governance gaps that exist right now in every organization using AI code assistance.

Traditional tooling cannot answer these questions because:
- **Linters** validate syntax, not intent
- **Tests** validate behavior, not whether the AI understood requirements
- **Security scanners** detect known patterns, not novel AI-generated risks
- **Code review** assumes reviewers understand what they're approving
- **Git logs** show who committed, not why AI generated this specific solution

### The Core Problem

AI code generation introduces a category change in risk:

- **Authorship is non-human** — Models generate code from statistical patterns, not understanding
- **Velocity exceeds review capacity** — AI writes code 10x faster than humans can validate it
- **Accountability is unclear** — Who is responsible when generated code causes a security breach?
- **Audit trails are missing** — No record of generation context, rejected alternatives, or decision rationale

**This gap widens every day.** More teams adopt AI assistance. Models generate larger code artifacts. The distance between "what was requested" and "what was delivered" grows.

**ReadyLayer is purpose-built infrastructure to close that gap—permanently.**

It provides what existing tools cannot:
- **Provenance tracking** for AI-generated code (what model, what prompt, what alternatives)
- **Deterministic policy evaluation** (same inputs always produce same governance decision)
- **Immutable audit trails** (cryptographically verifiable records for compliance)
- **Continuous validation** (operates at AI velocity, not human review velocity)

For a detailed analysis of why this problem requires new infrastructure, see [Problem Statement](./docs/PROBLEM_STATEMENT.md).

---

## How ReadyLayer Works

ReadyLayer operates as a **composable middleware layer** in your existing workflow:

```
Developer writes code (human or AI-assisted)
    ↓
Pull request created
    ↓
ReadyLayer runs (CI/CD or GitHub Action)
    ↓
Security scan + test coverage check + doc validation
    ↓
Deterministic pass/fail decision (auditable)
    ↓
PR approved or blocked with specific feedback
```

### Key Characteristics

- **Workflow-native**: Runs in GitHub Actions, GitLab CI, or any CI/CD
- **Deterministic**: Same input + same policy = same output (cryptographically hashed)
- **Auditable**: Every decision includes policy version, input hash, and evidence bundle
- **Composable**: Use only what you need (security only, tests only, or all three)
- **Deterministic policy core**: Rust policy evaluator + SARIF generator (OSS, no telemetry)
- **Portable**: No vendor lock-in, runs anywhere Docker runs
- **Privacy-preserving**: Your code never leaves your infrastructure (self-hosted mode)

### ReadyLayer Runner (OSS)

ReadyLayer Runner is the optional, OSS-first execution engine that runs checks locally or in CI and emits verifiable JSON output for the UI to import. It has **no telemetry** and makes **no network calls**. Enterprise Cloud is optional and does not unlock OSS functionality.

- Quickstart: [`docs/runner/QUICKSTART.md`](./docs/runner/QUICKSTART.md)
- Contracts: [`docs/runner/CONTRACTS.md`](./docs/runner/CONTRACTS.md)

---

## Installation

### Local Development (5 minutes)

```bash
# Clone repository
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev

# Open http://localhost:3000
```

No database required for local sandbox mode (uses in-memory SQLite).

### Self-Hosted Production (Docker)

```bash
# Pull image
docker pull readylayer/readylayer:latest

# Run with your database
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e GITHUB_CLIENT_ID=... \
  -e GITHUB_CLIENT_SECRET=... \
  readylayer/readylayer:latest
```

See [Deployment Guide](./docs/DEPLOYMENT-GUIDE.md) for detailed setup.

### GitHub Action (Recommended)

```yaml
# .github/workflows/readylayer.yml
name: ReadyLayer Governance

on: [pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: readylayer/readylayer-action@v1
        with:
          policy: .readylayer/policy.yml
          token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Core Features

### 1. Review Guard (Security Scanner)

Detects security issues before they reach production:

- **OWASP Top 10**: SQL injection, XSS, CSRF, etc.
- **Secrets Detection**: API keys, private keys, credentials
- **Dependency Scanning**: Known CVEs in npm/pip/cargo packages
- **Policy Templates**: PCI-DSS, HIPAA, SOC 2 ready

**Example output:**
```
❌ BLOCKED: Critical security issues detected

Security Issues (2 blocking):
1. [CRITICAL] SQL injection risk at src/api/users.ts:42
   - User input directly in query string
   - Recommendation: Use parameterized queries

2. [HIGH] Exposed API key at config/env.ts:12
   - Pattern: sk-proj-[redacted]
   - Recommendation: Use environment variables
```

### 2. Test Engine (Coverage Enforcement)

Ensures AI-generated code has tests:

- **Framework Detection**: Auto-detects Jest, Vitest, pytest, Mocha
- **Coverage Thresholds**: Configurable per-repo (default 80%)
- **Delta Tracking**: Highlights coverage regressions
- **Smart Targeting**: Only tests files touched by AI assistants

**Example output:**
```
✅ PASSED: Test coverage meets requirements

Test Coverage:
- Overall: 85% (target: 80%)
- New files: 92%
- Changed files: 88%

Files needing attention: 0
```

### 3. Doc Sync (Documentation Validator)

Catches documentation drift:

- **OpenAPI/Schema Validation**: Detects API contract changes
- **Markdown Link Checking**: Finds broken links
- **Code Comment Analysis**: Ensures public APIs are documented
- **Changelog Generation**: Auto-generates from commits

**Example output:**
```
⚠️  WARNING: Documentation drift detected (non-blocking)

Documentation Issues:
1. API endpoint POST /api/users added without OpenAPI spec update
2. Public function createUser() missing JSDoc comments
3. Broken link in README.md → docs/setup.md (404)
```

---

## Integration Options

ReadyLayer integrates with your existing tools:

### Git Providers
- ✅ **GitHub**: OAuth app + GitHub Action
- ✅ **GitLab**: CI/CD integration
- ✅ **Bitbucket**: Pipelines integration

### CI/CD Systems
- ✅ **GitHub Actions** (first-class support)
- ✅ **GitLab CI** (native integration)
- ✅ **Bitbucket Pipelines**
- ✅ **Jenkins** (Docker executor)
- ✅ **CircleCI** (Docker executor)

### Notifications
- ✅ **Slack**: Real-time PR feedback
- ✅ **Email**: Digest reports
- ✅ **Webhooks**: Custom integrations

### IDE Extensions (planned)
- 🔄 **VS Code**: Inline governance feedback
- 🔄 **IntelliJ**: Live policy checking
- 🔄 **Vim**: CLI integration

---

## Configuration

ReadyLayer uses a simple YAML policy file:

```yaml
# .readylayer/policy.yml
version: "1.0"

review_guard:
  enabled: true
  severity_threshold: "high"  # Block on high/critical
  rules:
    - owasp_top_10
    - secrets_detection
    - dependency_scan

test_engine:
  enabled: true
  coverage_threshold: 80
  frameworks:
    - vitest
    - jest

doc_sync:
  enabled: true
  enforce: false  # Warn only, don't block
  formats:
    - openapi
    - markdown
```

See [Policy Templates](./docs/policies/) for pre-built configurations.

---

## What ReadyLayer Is Not

ReadyLayer is **not** a replacement for existing development tools. It is governance infrastructure that complements them.

**ReadyLayer does not**:
- Replace linters (use ESLint, Prettier, etc.)
- Replace testing frameworks (use Jest, pytest, etc.)
- Replace security scanners (use Snyk, Dependabot, etc.)
- Replace code review (humans still approve)
- Generate code (use AI assistants)
- Require vendor lock-in (works with all git providers, CI systems, AI models)

**ReadyLayer does**:
- Enforce governance policies on code (regardless of authorship)
- Create immutable audit trails for compliance
- Validate that security scans, tests, and documentation meet standards
- Operate at the velocity of AI generation (async, non-blocking)
- Provide deterministic, reproducible governance decisions

See [Non-Goals](./docs/NON_GOALS.md) for detailed boundaries and [Ecosystem Map](./docs/ECOSYSTEM_MAP.md) for positioning relative to other tools.

---

## Who Needs ReadyLayer

### You Need Governance Infrastructure If:

**You are already using AI code generation:**
- Your team uses GitHub Copilot, Cursor, Claude, or similar tools
- Code velocity has increased but review capacity has not
- You need audit trails for compliance (SOC 2, ISO 27001, PCI-DSS, FedRAMP)
- You cannot answer "who is accountable for this generated code?"
- Auditors have asked "how do you govern AI-generated code?"

**You are planning to adopt AI code generation:**
- You want governance in place before velocity outpaces review capacity
- Security/compliance teams require governance controls before approving AI tool adoption
- You want deterministic, auditable decisions from day one
- You need to demonstrate responsible AI use to stakeholders

**You have compliance or security requirements:**
- Auditors require immutable records of code review decisions
- Insurance underwriters require governance controls for cyber liability coverage
- You need cryptographically verifiable audit trails for regulatory compliance
- You must demonstrate consistent policy enforcement across teams
- You need evidence that security scans were reviewed and addressed

### The "I Don't Need This" Objection

**"We don't use AI assistance yet"**
→ You will. Developer productivity pressure and competitive dynamics make adoption inevitable. Implementing governance **before** AI adoption is 10x easier than retrofitting it after your codebase contains thousands of AI-generated lines.

**"Our team is small (< 5 developers)"**
→ Small teams move fast. AI assistance makes you move faster. When one developer generates 500 lines in an afternoon, who reviews it? Small teams benefit from automated governance because manual review becomes the bottleneck.

**"We deploy infrequently (< 1/week)"**
→ AI assistance will change that. Code generation velocity enables faster deployment cadence. The question is whether your governance scales with that velocity or becomes a constraint.

**"We don't have compliance requirements"**
→ Yet. Growth brings compliance. Enterprise customers require SOC 2. Regulated industries require audit trails. Insurance requires cybersecurity controls. Implementing governance infrastructure early means you're audit-ready when requirements arrive.

**"We do careful manual code review"**
→ Manual review assumes reviewers understand what they're approving. AI-generated code introduces epistemic opacity: the reviewer may not know *why* the AI chose this implementation, *what alternatives* were rejected, or *what edge cases* weren't considered. Governance infrastructure provides the context manual review requires.

### The Real Question

The question is not "Do I need governance?"

The question is "When will I implement it, and at what cost?"

**Options:**
1. **Now (proactive)** — Implement before AI adoption scales. Governance is embedded from the start. Audit trails are complete.
2. **Later (reactive)** — Wait until auditors demand it, security incidents force it, or compliance blocks feature launches. Retrofit governance into existing workflows under pressure.
3. **Never** — Accept that governance gaps are unaddressed risk. Hope auditors don't ask hard questions.

ReadyLayer makes Option 1 viable. Five minutes to evaluate locally. Ten minutes to integrate with CI/CD. Zero vendor lock-in.

The cost of delaying is not implementing later—it's losing the audit trail for everything that happened before.

---

## Architecture

ReadyLayer is built as a **modular monorepo**:

```
┌─────────────────────────────────────────┐
│  CLI / GitHub Action                    │
│  (Stateless, runs in CI/CD)             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Core Engines (Pure Functions)          │
│  ├─ Review Guard (security scanning)    │
│  ├─ Test Engine (coverage analysis)     │
│  └─ Doc Sync (validation)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Policy Engine (Deterministic)          │
│  • Same input → same output             │
│  • Cryptographically hashed             │
│  • Audit trail included                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Data Layer (Optional)                  │
│  • PostgreSQL (for persistence)         │
│  • Redis (for job queue)                │
│  • SQLite (local dev mode)              │
└─────────────────────────────────────────┘
```

**Key Design Principles:**
- **Determinism**: Same inputs always produce same outputs
- **Auditability**: Every decision is hashed and traceable
- **Composability**: Use only what you need
- **Portability**: No vendor-specific dependencies

See [Architecture Documentation](./docs/architecture/) for deep dives.

---

## Why ReadyLayer Is Trustworthy

Governance infrastructure requires trust. ReadyLayer provides it through binding commitments:

### Invariants (Never Change)

1. **Deterministic Evaluation** — Same inputs + same policy = same outputs (always)
2. **Human-in-the-Loop** — ReadyLayer can block, but never auto-approves
3. **Audit Trail Immutability** — Decisions are cryptographically hashed and permanent
4. **Open Source Core** — Evaluation logic is publicly auditable (MIT license)
5. **Model Agnosticism** — Works with any AI provider (no vendor lock-in)
6. **Fail-Safe Defaults** — When in doubt, block (never fail open)

### Neutrality Guarantees

- **No data monetization** — Your code and decisions are never sold
- **No exclusive integrations** — All git providers, CI systems, and AI models supported equally
- **No forced upgrades** — Security patches backported to LTS versions
- **Human-readable audit logs** — Always exportable in standard formats (JSON, CSV)

### Resistance to Capture

- **Open governance model** — Community input required for major changes
- **Fork-friendly architecture** — No hidden dependencies or vendor lock-in
- **Self-hosting viability** — Full functionality without managed service
- **Financial transparency** — No hidden fees, predictable pricing

These commitments are binding. Violating them would destroy ReadyLayer's reason to exist.

See [Long-Term Governance](./docs/LONG_TERM_GOVERNANCE.md) for full commitments and accountability mechanisms.

---

## Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: Redis + Bull (optional for async jobs)
- **Auth**: Supabase Auth + GitHub OAuth (self-hosted mode available)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions (reference implementation)

---

## Background Job Processing (JobForge)

ReadyLayer includes **JobForge**, a Postgres-native job queue for reliable background processing. JobForge handles async operations like webhook delivery, report generation, and HTTP requests with:

- **Multi-tenant isolation** via Row Level Security (RLS)
- **Automatic retries** with exponential backoff
- **Idempotency** to prevent duplicate processing
- **Concurrency-safe** job claiming (`FOR UPDATE SKIP LOCKED`)
- **Built-in connectors** for HTTP requests, webhooks, and reports

### Quick Start

```bash
# Apply JobForge migration
npm run db:jobforge:migrate

# Run worker
npm run jobforge:worker

# Enqueue a test job
npm run jobforge:smoke
```

### Usage Example

```typescript
import { enqueueJob } from '@/lib/jobforge/enqueue'

// Enqueue webhook delivery
await enqueueJob({
  tenant_id: organizationId,
  type: 'connector.webhook.deliver',
  payload: {
    target_url: 'https://customer.com/webhook',
    event_type: 'evaluation.completed',
    data: { evalId: '123', result: 'pass' },
  },
  idempotency_key: `webhook-${organizationId}-${evalId}`,
})
```

See [docs/jobforge.md](./docs/jobforge.md) for full documentation, including:
- Built-in connectors (HTTP, webhooks, reports)
- Job monitoring and dead letter queue handling
- Worker scaling and operations
- Security (SSRF protection, webhook signing)

---

## Development

### Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### Common Commands

```bash
# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open DB UI

# Testing
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Quality
npm run verify           # Lint + type-check + test
npm run clean            # Remove build artifacts
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guide.

---

## Documentation

### Strategic Context

| Topic | Link |
|-------|------|
| **Problem Definition** | [Problem Statement](./docs/PROBLEM_STATEMENT.md) — Why AI code governance requires new infrastructure |
| **Positioning** | [Non-Goals](./docs/NON_GOALS.md) — What ReadyLayer intentionally does not do |
| **Ecosystem Fit** | [Ecosystem Map](./docs/ECOSYSTEM_MAP.md) — Where ReadyLayer sits relative to other tools |
| **Trust & Commitments** | [Long-Term Governance](./docs/LONG_TERM_GOVERNANCE.md) — Binding invariants and guarantees |

### Technical Documentation

| Topic | Link |
|-------|------|
| **Getting Started** | [Quick Start Guide](./docs/QUICK-START.md) |
| **Installation** | [Deployment Guide](./docs/DEPLOYMENT-GUIDE.md) |
| **Configuration** | [Policy Templates](./docs/policies/) |
| **Architecture** | [Architecture Docs](./docs/architecture/) |
| **API Reference** | [API Documentation](./docs/API-ENDPOINTS-SUMMARY.md) |
| **Security** | [Security Model](./SECURITY.md) |
| **Contributing** | [Contribution Guide](./CONTRIBUTING.md) |

---

## Community & Support

- 💬 **[GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions)** — Ask questions, share ideas
- 🐛 **[GitHub Issues](https://github.com/Hardonian/ReadyLayer/issues)** — Report bugs, request features
- 📖 **[Documentation](./docs/)** — Guides, tutorials, references
- 🔒 **[Security Reports](./SECURITY.md)** — Responsible disclosure

---

## Contributing

We welcome contributions of all kinds:

- 🐛 **Bug reports**: Found an issue? Open a GitHub issue
- ✨ **Feature requests**: Have an idea? Start a discussion
- 📖 **Documentation**: Improve guides, fix typos, add examples
- 🧪 **Tests**: Help us reach 90%+ coverage
- 💻 **Code**: Fix bugs, implement features

**Before contributing:**
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Review [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
3. Check [Open Issues](https://github.com/Hardonian/ReadyLayer/issues)

We review PRs within 48 hours.

---

## Roadmap

**Current Focus (Q1 2026):**
- ✅ Core governance engines (Review Guard, Test Engine, Doc Sync)
- ✅ GitHub integration (OAuth + Actions)
- ✅ Self-hosted deployment
- 🔄 GitLab/Bitbucket parity
- 🔄 VS Code extension
- 🔄 Policy marketplace (community templates)

See [ROADMAP.md](./docs/ROADMAP.md) for full roadmap.

---

## License

ReadyLayer is licensed under **Apache License 2.0**.

This means you can:
- ✅ Use commercially
- ✅ Modify freely
- ✅ Distribute
- ✅ Sublicense
- ✅ Use privately

See [LICENSE](./LICENSE) for full terms.

---

## Enterprise Cloud (Optional)

For teams that prefer a managed service over self-hosting, we offer **ReadyLayer Enterprise Cloud**—a hosted implementation of this open-source framework with operational conveniences:

- **Managed infrastructure**: No servers to maintain
- **Automatic updates**: Always on latest stable version
- **Support SLA**: Response time guarantees
- **Advanced analytics**: Usage dashboards and insights
- **SSO integration**: SAML, Okta, Azure AD
- **Multi-region deployment**: Data residency compliance

**Important:**
- The OSS version remains **fully functional** and is not feature-gated
- Enterprise Cloud is **operationally convenient**, not functionally superior
- All core governance logic is identical between OSS and Enterprise

See [docs/ENTERPRISE.md](./docs/ENTERPRISE.md) for details.

**No pricing, no CTA, no pressure.** This is informational only.

---

## Project Status

- **Current Version**: 1.0.0
- **Stability**: Production-ready
- **Test Coverage**: 82%
- **Active Development**: Yes
- **Maintainers**: 2 core + community
- **Last Security Audit**: January 2026

---

## Recognition

ReadyLayer is built by developers who believe AI-generated code should be governed transparently. We're grateful to the open-source community for making this possible.

Special thanks to contributors, early adopters, and everyone who has filed issues, submitted PRs, and provided feedback.

---

## Getting Started

### Three Pathways to First Value

Choose based on your evaluation needs:

---

### 1. See ReadyLayer in Action (10 Minutes)

**Get immediate, tangible results** by running ReadyLayer against an existing pull request:

```bash
# Clone repository
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer

# Install and run against a sample PR
npm install
npm run dev

# Open http://localhost:3000 and connect your GitHub repo
# Watch ReadyLayer analyze a PR and generate an audit-ready governance report
```

**What you'll see:**
- Security scan results with specific line numbers and remediation steps
- Test coverage analysis highlighting gaps in AI-generated code
- Documentation drift detection (API changes without doc updates)
- Immutable audit log with cryptographic hashes
- Pass/fail governance decision with evidence bundle

**Time to first value:** 10 minutes from clone to seeing your first governed PR.

No database required (uses in-memory SQLite for evaluation mode).

---

### 2. Self-Host in Production (30 Minutes)

**Deploy ReadyLayer to your infrastructure** with full data sovereignty:

```bash
# Pull image
docker pull readylayer/readylayer:latest

# Run with your database
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@localhost:5432/readylayer \
  -e GITHUB_CLIENT_ID=your_client_id \
  -e GITHUB_CLIENT_SECRET=your_client_secret \
  readylayer/readylayer:latest
```

**What you get:**
- Full control over data (nothing leaves your infrastructure)
- Persistent audit logs (PostgreSQL-backed)
- Multi-repo governance (organization-wide policies)
- Team access controls (admin/member roles)

See [Deployment Guide](./docs/DEPLOYMENT-GUIDE.md) for production setup with PostgreSQL, Redis, and backup strategies.

---

### 3. Integrate with CI/CD (15 Minutes)

**Add governance as a required check** in your existing workflow:

```yaml
# .github/workflows/readylayer.yml
name: ReadyLayer Governance

on: [pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: readylayer/readylayer-action@v1
        with:
          policy: .readylayer/policy.yml
          token: ${{ secrets.GITHUB_TOKEN }}
```

**Create minimal policy:**
```yaml
# .readylayer/policy.yml
version: "1.0"
review_guard:
  enabled: true
  severity_threshold: "high"
test_engine:
  enabled: true
  coverage_threshold: 80
```

**Result:** Every PR now requires governance approval before merge. Violations block automatically.

---

### Questions?

- [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions) — Ask questions, share experiences
- [GitHub Issues](https://github.com/Hardonian/ReadyLayer/issues) — Report bugs, request features
- [Documentation](./docs/) — Comprehensive guides and references

---

## The Bottom Line

AI-generated code requires governance infrastructure. This is not optional—it is a category requirement for any organization using AI-augmented development.

### Your Options

**Option 1: Build governance infrastructure yourself**
- 6-12 months engineering effort to replicate ReadyLayer's core functionality
- Ongoing maintenance burden (security patches, integration updates, policy engine evolution)
- Custom solution lacks community validation and peer review
- No audit trail history (starts from zero when you finish building)

**Cost:** High upfront investment, permanent maintenance overhead, delayed governance implementation.

**Option 2: Ignore the governance gap**
- Accumulate unaudited risk in production
- Hope auditors don't ask "How do you govern AI-generated code?"
- Wait until security incident or compliance audit forces action
- Retrofit governance infrastructure under pressure with incomplete historical data

**Cost:** Unbounded risk accumulation, compliance failures, no audit trail for existing code.

**Option 3: Use ReadyLayer**
- Purpose-built infrastructure (2+ years development, production-hardened)
- Open source (inspect, modify, self-host, fork if needed)
- Zero vendor lock-in (works with all git providers, CI systems, AI models)
- Audit trails start immediately (capture governance context from day one)
- Community-validated policies (benefit from collective knowledge)

**Cost:** 10 minutes to evaluate, 30 minutes to deploy, zero licensing fees for OSS version.

---

### The Forcing Functions

Three trends make governance infrastructure mandatory, not optional:

**1. Regulatory Compliance**
- SOC 2, ISO 27001, and FedRAMP require deterministic security controls
- AI non-determinism violates compliance assumptions
- Auditors **will** ask: "How do you govern AI-generated code?"
- Timeline: Already happening for regulated industries

**2. Liability and Insurance**
- Security breaches from AI-generated vulnerabilities create legal exposure
- Cyber liability insurance underwriters **will** require AI governance controls
- Courts **will** ask: "What governance process existed when this code was generated?"
- Timeline: Emerging in 2025-2026 insurance renewals

**3. Technical Debt Accumulation**
- Undocumented AI-generated code becomes unmaintainable
- Variance across teams creates architectural chaos
- Organizations **will** face "AI debt crisis" requiring expensive refactoring
- Timeline: 12-24 months after significant AI adoption

**Outcome:** Governance infrastructure transitions from "nice to have" to "compliance requirement" to "existential necessity."

---

### The Real Question

The question is not "Should I implement AI code governance?"

The question is "Do I implement it proactively (with ReadyLayer) or reactively (under audit pressure with incomplete data)?"

**Proactive adoption:**
- Governance embedded from the start
- Complete audit trails
- Zero compliance gaps
- Team trained before pressure arrives

**Reactive adoption:**
- Governance retrofitted under deadline pressure
- Incomplete audit history (no records before implementation)
- Compliance gaps require explanation
- Team learns while auditors watch

---

### Why ReadyLayer Wins

ReadyLayer is purpose-built for a problem that existing tools cannot solve:

**What makes it different:**
- Only tool designed specifically for AI-generated code governance (not general-purpose policy)
- Only tool providing deterministic evaluation with cryptographic audit trails
- Only tool with binding neutrality commitments (no vendor capture)
- Only tool with open-source core (inspect evaluation logic yourself)

**What makes it inevitable:**
- The problem (AI code velocity exceeding human review capacity) is permanent
- The solution requirements (deterministic, auditable, continuous) are non-negotiable
- The alternative (build it yourself) is expensive and late
- The cost of adoption (10 minutes to evaluate) is negligible

**Strategic outcome:** ReadyLayer becomes the default governance layer for AI-generated code—not because of marketing, but because **there is no viable alternative** that solves the same problem.

---

### Start Now

```bash
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
npm install && npm run dev
# Open http://localhost:3000
```

Ten minutes from clone to governed PR.

Zero cost. Zero risk. Zero vendor lock-in.

The question is not whether to implement governance. The question is whether to start with complete audit trails or explain their absence to auditors later.

---

<div align="center">

**ReadyLayer: Governance infrastructure for AI-generated code**

Open source • Self-hostable • Neutral • Auditable

[Documentation](./docs/) • [Contributing](./CONTRIBUTING.md) • [License](./LICENSE)

</div>
