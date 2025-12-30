# ReadyLayer — AI Code Readiness Platform

**ReadyLayer ensures AI-generated code is production-ready through automated review, testing, and documentation.**

ReadyLayer is a comprehensive platform that combines AI-powered code analysis with enforcement-first principles to catch security vulnerabilities, ensure test coverage, and keep documentation in sync.

## 🚀 What ReadyLayer Does

### Review Guard
- **AI-aware code review** that detects security vulnerabilities, quality issues, and potential bugs
- **Enforcement-first**: Critical issues ALWAYS block PRs (cannot disable)
- **Pattern detection**: Tracks historical violations to detect recurring issues
- **Explicit failures**: All failures include actionable fix instructions

### Test Engine
- **Automatic test generation** for AI-touched files
- **Coverage enforcement**: Minimum 80% coverage required (cannot go below)
- **Framework detection**: Supports Jest, Mocha, pytest, JUnit, and more
- **Blocking by default**: Test generation failures block PRs

### Doc Sync
- **Automatic API documentation** generation (OpenAPI, Markdown)
- **Drift prevention**: Blocks PRs when code and docs are out of sync
- **Merge-triggered updates**: Automatically updates docs on merge
- **Multi-framework support**: Express, Fastify, Flask, Django, Spring Boot

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

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY`: At least one LLM provider
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL (for auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

#### Reviews
- `POST /reviews` - Create a new review
- `GET /reviews` - List reviews
- `GET /reviews/:reviewId` - Get review details

#### Repositories
- `GET /repos` - List repositories
- `GET /repos/:repoId` - Get repository details
- `PATCH /repos/:repoId` - Update repository config

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

See `/SYSTEM-INVARIANTS-ENHANCED.md` for complete system invariants.

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

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
