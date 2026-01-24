# ReadyLayer

**Governance infrastructure for AI-generated code.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)

---

## What This Is

ReadyLayer is **governance infrastructure** for AI-generated code. It provides deterministic policy enforcement, immutable audit trails, and continuous validation that operates at the velocity of AI code generation.

It exists because AI-generated code introduces a new risk class that existing tooling (linters, tests, security scanners, code review) was not designed to handle.

### The Core Problem

When code is AI-generated:
- **Authorship is non-human** — no one fully understands what was generated
- **Velocity exceeds review capacity** — code ships faster than humans can validate
- **Accountability is unclear** — who is responsible when generated code fails?
- **Audit trails are missing** — no record of generation context or decisions

This is not a problem that will diminish. As AI adoption increases, the gap between generation velocity and governance capacity widens.

**ReadyLayer is purpose-built infrastructure to close that gap.**

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
- **Portable**: No vendor lock-in, runs anywhere Docker runs
- **Privacy-preserving**: Your code never leaves your infrastructure (self-hosted mode)

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

### You need governance infrastructure if:

**You are already using AI code generation:**
- Your team uses GitHub Copilot, Cursor, Claude, or similar tools
- Code velocity has increased but review capacity has not
- You need audit trails for compliance (SOC 2, ISO 27001, PCI-DSS)
- You cannot answer "who is accountable for this generated code?"

**You are planning to adopt AI code generation:**
- You want governance in place before velocity outpaces review capacity
- You need to satisfy security/compliance teams before rollout
- You want deterministic, auditable decisions from day one

**You have compliance requirements:**
- Auditors require immutable records of code review decisions
- You need cryptographically verifiable audit trails
- You must demonstrate consistent policy enforcement
- You need evidence that security scans were reviewed

### You probably don't need ReadyLayer if:

- ❌ No AI assistance is used (pure human-written code)
- ❌ Team size < 3 developers (manual review scales)
- ❌ Deployment frequency < 1/week (episodic review works)
- ❌ No compliance requirements (governance is optional)

**However:** If you plan to adopt AI assistance in the future, implementing governance infrastructure **before** velocity increases is significantly easier than retrofitting it later.

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

### Evaluate Locally (5 minutes)

```bash
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
npm install
npm run dev
# Open http://localhost:3000
```

No database required for local sandbox mode.

### Deploy to Production

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  readylayer/readylayer:latest
```

See [Deployment Guide](./docs/DEPLOYMENT-GUIDE.md) for production setup.

### Integrate with CI/CD

```yaml
# .github/workflows/readylayer.yml
- uses: readylayer/readylayer-action@v1
  with:
    policy: .readylayer/policy.yml
```

### Questions?

- [GitHub Discussions](https://github.com/Hardonian/ReadyLayer/discussions) — Ask questions
- [GitHub Issues](https://github.com/Hardonian/ReadyLayer/issues) — Report bugs
- [Documentation](./docs/) — Read guides

---

## The Bottom Line

AI-generated code requires governance infrastructure. You can:

1. **Build it yourself** — Significant engineering effort, ongoing maintenance
2. **Ignore the problem** — Accumulate unaudited risk until compliance/security forces action
3. **Use ReadyLayer** — Purpose-built infrastructure, open source, proven

The problem is not hypothetical. Every organization using AI code assistance faces it.

The question is not whether to implement governance. The question is when, and at what cost.

---

<div align="center">

**ReadyLayer: Governance infrastructure for AI-generated code**

Open source • Self-hostable • Neutral • Auditable

[Documentation](./docs/) • [Contributing](./CONTRIBUTING.md) • [License](./LICENSE)

</div>
