# ReadyLayer — Enforcement-First Code Review for AI-Generated Code

**ReadyLayer blocks PRs with security vulnerabilities, untested code, and documentation drift — enforcement-first for AI-generated code.**

ReadyLayer combines deterministic static analysis with AI-powered code review to catch security vulnerabilities, enforce test coverage, and prevent documentation drift. Unlike warning-based tools, ReadyLayer **blocks PRs** when issues are found.

## 🚀 What ReadyLayer Does

ReadyLayer runs a unified pipeline on every PR: **Review Guard → Test Engine → Doc Sync**

### Review Guard
- **Blocks PRs on critical security issues** (SQL injection, secrets, etc.) — cannot disable
- **Blocks PRs on high-severity issues** (configurable by tier)
- **Deterministic static analysis** + AI-powered review for novel patterns
- **Explicit failures**: All blocking includes actionable fix instructions

### Test Engine
- **Enforces 80% test coverage minimum** for AI-touched files — cannot go below
- **Blocks PRs** when coverage threshold not met
- **Auto-generates tests** for AI-touched files (Jest, Mocha, pytest supported)
- **Framework detection**: Auto-detects test framework from codebase
- **AI-touched detection**: Automatically detects files modified by AI tools

### Doc Sync
- **Blocks PRs** when API docs are out of sync with code — drift prevention required
- **Generates OpenAPI/Markdown** documentation from code
- **Framework detection**: Auto-detects API framework (Express, Fastify, Flask, Django)
- **Merge-triggered updates**: Updates docs on merge (requires PR approval)

### Unified Run Pipeline
- **Complete audit trail**: Every run is tracked with correlation IDs
- **Stage-by-stage status**: See exactly where each stage succeeded or failed
- **Policy gates**: Automatic evaluation of all findings against your policy
- **Sandbox mode**: Try ReadyLayer without connecting a repository

## 🏗️ Architecture

ReadyLayer is built as a composable service architecture:

- **API Gateway**: Fastify/Express server with auth, rate limiting, validation
- **Core Services**: Review Guard, Test Engine, Doc Sync
- **Supporting Services**: LLM Service, Code Parser, Static Analysis
- **Integrations**: GitHub, GitLab, Bitbucket adapters
- **Infrastructure**: Redis queue, PostgreSQL database, observability

See `/architecture/` for detailed architecture documentation.

## 📋 Requirements

- **Node.js**: 20+
- **PostgreSQL**: 15+
- **Redis**: 7+ (for queue system)
- **LLM Provider**: OpenAI API key OR Anthropic API key (at least one required)

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <repository>
cd readylayer
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in required values:

```bash
cp .env.example .env
```

**Required variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY`: At least one LLM provider
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL (for auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

**Optional variables (for billing):**
- `STRIPE_SECRET_KEY`: Stripe secret key (required for paid tiers)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret (required for subscription management)
- `STRIPE_PRICE_ID_GROWTH`: Growth tier price ID (required for Growth tier)
- `STRIPE_PRICE_ID_SCALE`: Scale tier price ID (required for Scale tier)

**Note:** ReadyLayer works without Stripe configuration (free tier only). See `docs/STRIPE-SETUP.md` for payment setup.

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (use canonical Supabase migration for production)
npm run db:reconcile

# Or use Prisma migrations for local development
npm run prisma:migrate

# Verify database contract matches expected schema
npm run db:verify

# Run smoke tests
npm run db:smoke

# (Optional) Seed database
npm run prisma:seed
```

**Backend Contract Verification**: See `BACKEND-CONTRACT-VERIFICATION.md` for details on verifying that your Supabase database matches the expected schema, RLS policies, and functions.

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 5. Try the Sandbox Demo

ReadyLayer includes a sandbox mode for testing without connecting a repository:

1. Visit `http://localhost:3000/dashboard/runs/sandbox`
2. Click "Start Sandbox Demo"
3. View the complete pipeline execution with sample code

The sandbox demo runs the full pipeline (Review Guard → Test Engine → Doc Sync) on sample files so you can see ReadyLayer in action immediately.

### 6. Run Doctor Script (Pre-Deployment Checks)

Before deploying, run the doctor script to verify everything is working:

```bash
npm run doctor
```

This runs:
- Lint checks
- Type checking
- Prisma schema validation
- Production build

All checks must pass before deployment.

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

#### Runs (Unified Pipeline)
- `POST /runs` - Create and execute a new run
- `GET /runs` - List runs (tenant-isolated)
- `GET /runs/:runId` - Get run details with complete audit trail
- `POST /runs/sandbox` - Create a sandbox demo run (no auth required)

#### Reviews
- `POST /reviews` - Create a new review
- `GET /reviews` - List reviews
- `GET /reviews/:reviewId` - Get review details

#### Repositories
- `GET /repos` - List repositories
- `GET /repos/:repoId` - Get repository details
- `PATCH /repos/:repoId` - Update repository config

#### Test Runs
- `GET /test-runs` - List test runs (CI/CD integration)

#### Webhooks
- `POST /webhooks/github` - GitHub webhook handler

#### Health
- `GET /health` - Health check (liveness)
- `GET /ready` - Readiness check

See `/dx/api-spec.md` for complete API documentation.

## 🔧 Configuration

ReadyLayer uses `.readylayer.yml` files for repository-level configuration:

```yaml
# .readylayer.yml
review:
  enabled: true
  fail_on_critical: true  # REQUIRED: Cannot disable
  fail_on_high: true      # DEFAULT: Can disable with admin approval

test:
  enabled: true
  framework: "jest"
  coverage:
    threshold: 80  # Minimum 80%, cannot go below
    fail_on_below: true  # REQUIRED: Cannot disable

docs:
  enabled: true
  drift_prevention:
    enabled: true  # REQUIRED: Cannot disable
    action: "block"  # DEFAULT: Block, not auto-update
```

See `/dx/config-examples.md` for comprehensive configuration examples.

## 🔐 Authentication

ReadyLayer supports multiple authentication methods:

1. **OAuth 2.0**: GitHub, GitLab, Bitbucket OAuth apps
2. **API Keys**: For programmatic access
3. **JWT**: Internal service-to-service auth

See `/lib/auth.ts` for authentication utilities.

## 📊 Observability

ReadyLayer includes comprehensive observability:

- **Structured Logging**: JSON-formatted logs with request IDs
- **Metrics**: Prometheus-compatible metrics
- **Health Checks**: `/health` and `/ready` endpoints
- **Tracing**: Request tracing across services

See `/observability/` for implementation details.

## 🚦 Enforcement-First Principles

ReadyLayer follows enforcement-first principles:

1. **Rules > AI**: Deterministic rules always override AI judgment
2. **Enforcement > Insight**: Blocking is default, warnings are exception
3. **Safety > Convenience**: Fail-secure defaults, explicit overrides required
4. **Explicit > Silent**: All failures are explicit, no silent degradation
5. **Tier-Based Enforcement**: Starter blocks critical only, Growth blocks critical+high, Scale blocks critical+high+medium

See `/SYSTEM-INVARIANTS-ENHANCED.md` for complete system invariants.

## 💰 Pricing

ReadyLayer offers three tiers with enforced limits:

| Tier | Price | LLM Budget | Runs/Day | Repos | Enforcement |
|------|-------|------------|----------|-------|-------------|
| **Starter** | Free | $50/month | 50 | 5 | Critical only |
| **Growth** | $99/month | $500/month | 500 | 50 | Critical + High |
| **Scale** | $499/month | $5000/month | 5000 | Unlimited | Critical + High + Medium |

All limits are **hard-enforced**. When exceeded, PRs are blocked until limits reset or plan is upgraded.

## 🗺️ Roadmap (Not Available Today)

The following features are planned but not yet available:

- Self-hosting option (for enterprise)
- IDE integration (inline feedback)
- 20+ language support (currently JS/TS/Python)
- LLM response caching (reduces costs)
- Advanced self-learning (pattern detection)

## 🧪 Testing & Verification

```bash
# Run all checks (lint, typecheck, build)
npm run doctor

# Individual checks
npm run type-check  # Type check
npm run lint        # Lint
npm run build       # Production build
npm run prisma:validate  # Database schema validation
```

### Golden Demo Path

To verify ReadyLayer works end-to-end:

1. **Start the server**: `npm run dev`
2. **Sign up/Login**: Visit `http://localhost:3000/auth/signin`
3. **Run sandbox demo**: Visit `http://localhost:3000/dashboard/runs/sandbox` and click "Start Sandbox Demo"
4. **View results**: Navigate to the run details page to see:
   - Review Guard findings
   - Test Engine results
   - Doc Sync status
   - AI-touched file detection
   - Policy gate evaluation
5. **Verify no 500s**: Check browser console and server logs for errors

All routes should return structured responses (no hard 500s). Failures should be graceful with helpful error messages.

## 📖 Documentation

- **Architecture**: `/architecture/`
- **Specifications**: `/specs/`
- **API Spec**: `/dx/api-spec.md`
- **Configuration**: `/dx/config-examples.md`
- **Integrations**: `/integrations/`

## 🚨 Production Deployment

### Prerequisites
- PostgreSQL database (managed or self-hosted)
- Redis instance (for queue system)
- LLM API keys (OpenAI or Anthropic)
- GitHub App credentials (for integration)

### Environment Variables
See `.env.example` for all required environment variables.

### Health Checks
- **Liveness**: `GET /health`
- **Readiness**: `GET /ready`

### Monitoring
- Monitor `/health` and `/ready` endpoints
- Track metrics at `/metrics` (Prometheus format)
- Review logs for errors and warnings

## 🔄 Migration from Gamification App

This codebase has been transformed from a gamification app to the ReadyLayer platform:

- **Database Schema**: Completely replaced with ReadyLayer models
- **API Routes**: Replaced gamification routes with ReadyLayer API
- **Services**: Added Review Guard, Test Engine, Doc Sync services
- **Infrastructure**: Added queue system, observability, health checks

See migration guide in `/docs/` for details.

## 📝 License

Proprietary — ReadyLayer Platform

## 🆘 Support

- **Documentation**: https://docs.readylayer.com
- **Support**: support@readylayer.com
- **Status**: https://status.readylayer.com

---

**ReadyLayer** — Ensuring AI-generated code is production-ready.
