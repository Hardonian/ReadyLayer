# ReadyLayer

**An open-source framework for governing AI-generated code in your existing developer workflow.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)](https://nextjs.org/)

---

## What ReadyLayer Is

ReadyLayer is an **open-source governance framework** that enforces security, test coverage, and documentation standards for AI-generated code. It integrates directly into your existing CI/CD pipelines, GitHub workflows, and development tools—no new UI required, no data custody, no lock-in.

It exists because **AI-generated code ships faster than humans can review it safely.** ReadyLayer automates the boring parts of code governance so teams can ship quickly without sacrificing quality.

---

## The Problem

AI coding assistants (GitHub Copilot, Cursor, Claude, GPT) accelerate development, but they create a dangerous gap:

- **Code generation**: Instant
- **Security review**: Manual, slow
- **Test coverage**: Often forgotten
- **Documentation**: Lags behind reality

Teams face a choice: ship fast and break things, or slow down and lose velocity. ReadyLayer eliminates that tradeoff.

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

## Explicit Non-Goals

ReadyLayer **intentionally does not**:

- ❌ **Host your code**: Everything runs in your infrastructure
- ❌ **Require accounts**: Self-hosted mode needs zero external services
- ❌ **Send telemetry**: No tracking, analytics, or phone-home
- ❌ **Lock you in**: Standard YAML configs, portable everywhere
- ❌ **Replace human judgment**: Governance aids decisions, doesn't make them

---

## Who Should Use ReadyLayer

### You should use ReadyLayer if you:

- ✅ Use AI coding assistants (Copilot, Cursor, Claude, etc.)
- ✅ Ship code faster than you can manually review it
- ✅ Need audit trails for compliance (SOC 2, ISO 27001, etc.)
- ✅ Want deterministic, reproducible governance decisions
- ✅ Prefer self-hosted tools over SaaS

### You probably don't need ReadyLayer if you:

- ❌ Don't use AI assistants in your workflow
- ❌ Have < 3 developers (manual review works fine)
- ❌ Ship code infrequently (< 10 PRs/week)
- ❌ Have dedicated security team reviewing every line

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

| Topic | Link |
|-------|------|
| **Getting Started** | [Quick Start Guide](./docs/QUICK-START.md) |
| **Installation** | [Deployment Guide](./docs/DEPLOYMENT-GUIDE.md) |
| **Configuration** | [Policy Templates](./docs/policies/) |
| **Architecture** | [Architecture Docs](./docs/architecture/) |
| **API Reference** | [API Documentation](./docs/API-ENDPOINTS-SUMMARY.md) |
| **Security** | [Security Model](./SECURITY.md) |
| **Contributing** | [Contribution Guide](./CONTRIBUTING.md) |
| **Governance** | [Project Governance](./docs/GOVERNANCE.md) |
| **Philosophy** | [Why Open Source](./docs/WHY_OPEN_SOURCE.md) |

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

## Get Started

```bash
# Try it locally (5 minutes)
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
npm install
npm run dev

# Or deploy to production
docker run -p 3000:3000 readylayer/readylayer:latest
```

**Questions?** Open a [GitHub Discussion](https://github.com/Hardonian/ReadyLayer/discussions).

---

<div align="center">

**ReadyLayer is open source, composable, and workflow-native.**

No lock-in. No telemetry. No data custody.

[Documentation](./docs/) • [Contributing](./CONTRIBUTING.md) • [License](./LICENSE)

</div>
