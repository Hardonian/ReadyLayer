# CLAUDE.md - AI Assistant Context for ReadyLayer

> **Last Updated:** 2026-01-17
> **Purpose:** Provide Claude with essential project context for effective AI-assisted development

---

## 🎯 Project Overview

**ReadyLayer** is an AI-aware governance platform that provides deterministic, auditable code review, test generation, and documentation validation for enterprise development teams.

### Core Value Proposition
- **Deterministic Governance:** Same inputs + same policy = same outputs (hashed, auditable)
- **Async-First Architecture:** Non-blocking HTTP responses with background LLM processing
- **Policy-Driven:** Org → Team → Repo inheritance chain
- **Evidence-Based:** All decisions include audit trail (hashes, signatures, timings)
- **Fail-Secure:** Blocking by default for critical issues
- **Secret-Safe:** Redaction before LLM calls, encryption at rest

### Technology Stack
- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5
- **Database:** PostgreSQL via Prisma ORM (70+ models)
- **Auth:** Supabase Auth + GitHub OAuth 2.0
- **State:** TanStack Query (server) + Zustand (client)
- **UI:** Radix UI + Tailwind CSS + Framer Motion
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Queue:** Redis + Bull for background jobs
- **Payments:** Stripe
- **Logging:** Pino (JSON structured logs)
- **Deployment:** Vercel (Next.js) + Supabase (Database + Auth)

---

## 🚀 Development Commands

### Setup & Installation
```bash
# Initial setup
npm install
cp .env.example .env         # Configure environment variables
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Run database migrations
npm run prisma:seed          # Seed database with initial data

# Start development server
npm run dev                  # http://localhost:3000
```

### Testing Commands
```bash
# Unit Tests (Vitest)
npm test                     # Run all unit tests
npm test -- --watch          # Watch mode
npm test -- --coverage       # Generate coverage report
npm test -- path/to/test.test.ts  # Run specific test

# E2E Tests (Playwright)
npm run test:e2e            # Run all E2E tests (headless)
npm run test:e2e:ui         # Run with Playwright UI
npm run test:e2e:headed     # Run in headed mode (visible browser)
npm run test:e2e -- --debug # Run with debugging enabled
npx playwright show-report  # View last test report

# Specific Test Suites
npm run test:billing        # Test billing enforcement
npm run test:tenant-isolation  # Verify data isolation
```

### Build & Quality Checks
```bash
# Type checking
npm run type-check          # TypeScript compilation check

# Linting
npm run lint                # ESLint on app/, components/, lib/
npm run lint:fix            # Auto-fix linting issues

# Clean & Verify (Post-Hardening Additions)
npm run clean               # Remove build artifacts (.next, node_modules/.cache, dist)
npm run verify              # Run full quality pipeline (lint + type-check + test)

# Build
npm run build               # Full production build (includes lint + type-check)
npm run start               # Start production server
```

### Database Management
```bash
# Prisma Commands
npm run prisma:studio       # Open Prisma Studio UI (http://localhost:5555)
npm run prisma:validate     # Validate schema
npm run prisma:format       # Format schema file
npm run prisma:reset        # Reset database (WARNING: destructive)

# Database Verification
npm run db:inventory-live   # Check live database schema
npm run db:inventory-expected  # Check expected schema
npm run db:verify           # Verify schema consistency
npm run db:smoke            # Quick smoke test
npm run db:reconcile        # Reconcile schema differences

# Migrations
npx prisma migrate dev --name description  # Create new migration
npx prisma migrate deploy   # Deploy migrations to production
```

### Worker Processes (Background Jobs)
```bash
# Start worker processes (separate terminals)
npm run worker:webhook      # Process webhook queue
npm run worker:job          # Process job queue
```

### Health & Monitoring
```bash
npm run doctor              # Run health check script
npm run middleware:smoke    # Test middleware stack
```

---

## 📁 Project Structure

```
ReadyLayer/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── v1/                   # Main API (reviews, runs, policies, repos)
│   │   ├── dashboard/            # Internal dashboard APIs
│   │   ├── webhooks/             # GitHub, GitLab, Bitbucket, Stripe
│   │   ├── auth/                 # OAuth flows (GitHub)
│   │   ├── health/               # Health check endpoint
│   │   └── stream/               # WebSocket streaming
│   ├── dashboard/                # Main application UI
│   ├── auth/                     # Authentication pages
│   ├── pricing/                  # Pricing page
│   └── docs/                     # Documentation pages
│
├── components/                   # React components
│   ├── ui/                       # Radix UI-based design system (30+ components)
│   ├── dashboard/                # Dashboard-specific components
│   ├── billing/                  # Billing/subscription components
│   ├── git-provider/             # Git provider integration UI
│   ├── admin/                    # Admin panel components
│   └── layout/                   # Layout wrappers
│
├── services/                     # Core business logic (28+ services)
│   ├── review-guard/             # Code security scanning
│   ├── test-engine/              # Test generation & coverage analysis
│   ├── doc-sync/                 # Documentation validation
│   ├── policy-engine/            # Rule evaluation engine (deterministic)
│   ├── llm/                      # LLM service abstraction (multi-provider)
│   ├── governance-engine/        # Variance & model governance
│   ├── cultural-artifacts/       # Trust signaling models
│   ├── ai-anomaly-detection/     # Drift & anomaly detection
│   ├── billing/                  # Stripe integration
│   ├── notification-service/     # Email/Slack notifications
│   └── [19+ more services]
│
├── lib/                          # Shared utilities
│   ├── middleware/               # Edge-safe middleware (rate limiting, auth)
│   ├── errors/                   # Error normalization & HTTP error utilities
│   ├── secrets/                  # Encryption & secret redaction
│   ├── cache/                    # Caching strategies
│   ├── rate-limiting/            # Rate limit enforcement
│   ├── audit/                    # Audit logging
│   ├── prisma/                   # Database client
│   ├── prisma-json.ts            # Type-safe JSON utilities for Prisma
│   └── [12+ more modules]
│
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # 70+ models
│   └── migrations/               # Migration history
│
├── e2e/                          # Playwright E2E tests
│   ├── fixtures/                 # Test setup & helpers
│   ├── auth.spec.ts              # Authentication flows
│   ├── billing-workflow.spec.ts  # Billing scenarios
│   ├── golden-path.spec.ts       # Happy path scenarios
│   └── [9+ more test files]
│
├── workers/                      # Background job processors
├── scripts/                      # Utility scripts
├── docs/                         # Architecture & design documentation
└── public/                       # Static assets
```

### Key File Locations
- **API Routes:** `app/api/v1/*` (main API), `app/api/webhooks/*` (webhooks)
- **Components:** `components/ui/*` (design system), `components/dashboard/*` (app-specific)
- **Services:** `services/*` (28+ domain services)
- **Database:** `prisma/schema.prisma` (70+ models)
- **Tests:** `e2e/*.spec.ts` (Playwright), `**/*.test.ts` (Vitest)
- **Config:** `next.config.js`, `tailwind.config.js`, `tsconfig.json`

---

## 🎨 Code Style & Conventions

### TypeScript Rules
- **Strict Mode:** Enabled (`strict: true` in tsconfig.json)
- **No Implicit Any:** All types must be explicit
- **No Unused Variables:** Enforced by ESLint
- **Prefer Interfaces:** For object shapes
- **Prefer Type Aliases:** For unions and complex types

### React Conventions
- **Functional Components:** Always use function components (no class components)
- **Hooks:** Use React hooks for state and effects
- **Props Typing:** Always type component props with TypeScript interfaces
- **File Naming:** PascalCase for components (`UserProfile.tsx`)
- **Export Pattern:** Named exports preferred for testability

### API Design Patterns
- **Route Handlers:** Use `createRouteHandler()` helper for type safety
- **Validation:** All inputs validated with Zod schemas
- **Error Handling:** Use custom error classes that preserve HTTP status codes
- **Response Format:** Consistent `{ success, data/error, meta }` structure
- **Logging:** Structured logging via Pino with correlation IDs

### Database Conventions
- **Prisma Models:** PascalCase (`User`, `Organization`)
- **Fields:** camelCase (`createdAt`, `userId`)
- **Relations:** Explicit `@relation` names
- **Migrations:** Descriptive names (`add_user_consent_tracking`)
- **Queries:** Always use `.findUnique()` or `.findFirst()` with explicit `where` clauses

### Security Patterns
- **Never Log Secrets:** Use `redactSecrets()` before logging
- **Tenant Isolation:** Always filter by `organizationId` in queries
- **Input Validation:** Zod schemas on all API inputs
- **SQL Injection Prevention:** Only use Prisma ORM (no raw SQL)
- **XSS Prevention:** React automatically sanitizes, but verify in `dangerouslySetInnerHTML`
- **CSRF Protection:** OAuth state parameter, SameSite cookies

### Testing Conventions
- **Test Files:** Co-locate with source (`service.ts` → `service.test.ts`)
- **E2E Tests:** In `e2e/` directory with `.spec.ts` suffix
- **Test Structure:** Arrange-Act-Assert pattern
- **Naming:** `describe('ComponentName', () => { it('should do X when Y', ...) })`
- **Mocking:** Use Vitest `vi.mock()` for unit tests, real services in E2E

### Git Commit Messages
Follow Conventional Commits format:
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

**Examples:**
```bash
git commit -m "feat(policy-engine): add custom rule support"
git commit -m "fix(auth): handle expired tokens in middleware"
git commit -m "test(billing): add usage limit enforcement tests"
```

---

## 🔒 Security Best Practices

### Authentication & Authorization
- **Session Management:** httpOnly cookies, 24-hour expiry
- **RBAC:** Three roles (owner, admin, member) with org-scoped permissions
- **API Keys:** SHA-256 hashed in database, never logged
- **Token Storage:** Installation tokens encrypted with ChaCha20-Poly1305

### Secret Management
- **Redaction:** ALL data passed to LLMs is redacted first (see `lib/secrets/redaction.ts`)
- **Detection Patterns:** AWS keys, API tokens, private keys, passwords, emails
- **Encryption:** Use `encrypt()/decrypt()` from `lib/secrets/encrypt.ts`
- **Environment Variables:** NEVER commit `.env` files

### Input Validation & Sanitization
- **Zod Schemas:** Define for all API inputs
- **Path Traversal:** Validate file paths with `path.resolve()` and whitelist checks
- **Size Limits:** 2MB body size for server actions
- **SQL Injection:** Only use Prisma ORM, NEVER raw SQL

### Logging & Monitoring
- **Structured Logging:** Pino JSON format for machine parsing
- **Correlation IDs:** Track requests across services
- **No Secrets in Logs:** Use `redactSecrets()` utility
- **Audit Trail:** All actions logged to `AuditLog` model with immutable hash chain

### OWASP Top 10 Protection
1. **Injection:** Prisma ORM prevents SQL injection
2. **Broken Authentication:** Supabase + GitHub OAuth
3. **Sensitive Data Exposure:** Encryption + redaction
4. **XML External Entities:** No XML parsing
5. **Broken Access Control:** RBAC + RLS in database
6. **Security Misconfiguration:** Security headers set
7. **XSS:** React auto-sanitizes, CSP headers
8. **Insecure Deserialization:** Zod validation
9. **Using Components with Known Vulnerabilities:** npm audit + Dependabot
10. **Insufficient Logging & Monitoring:** Pino + audit logs

---

## 🔧 Known Issues & Quirks

### Database
- **Migration Timing:** Run `npm run prisma:migrate` before `npm run prisma:generate`
- **Schema Changes:** After updating `schema.prisma`, ALWAYS run `prisma:generate`
- **Test Database:** Tests use separate DATABASE_URL from `.env.test`
- **Connection Pooling:** Prisma pool size: 10 connections

### Testing
- **Flaky Tests:** Some E2E tests may fail on first run due to timing (configured with 2 retries)
- **Playwright Browser Install:** Run `npx playwright install` if browsers not found
- **Test Isolation:** Each E2E test should create and clean up its own data
- **Parallel Execution:** E2E tests run with `workers: 1` to avoid race conditions

### API & Services
- **Rate Limiting:** Default 100 requests per 60 seconds per IP
- **Async Processing:** Reviews return 202 with `enrichmentJobIds` for background LLM processing
- **Webhook Signatures:** Verify GitHub webhook signatures in production
- **Timeout Handling:** LLM calls timeout after 30 seconds (configurable)

### Development Environment
- **Port Conflicts:** Dev server on port 3000, Prisma Studio on 5555
- **Hot Reload:** Next.js may require manual refresh after schema changes
- **Environment Variables:** Changes require server restart
- **Worker Processes:** Must be started separately in different terminals

### Dependencies
- **Sharp Installation:** If image optimization fails, run `npm install sharp`
- **Playwright Browsers:** Download with `npx playwright install chromium`
- **Redis Required:** Background jobs require Redis running locally or remote connection

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
**Coverage Target:** 82% (current status)

**Test Patterns:**
```typescript
// services/policy-engine/__tests__/policy-engine.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PolicyEngine } from '../policy-engine';

describe('PolicyEngine', () => {
  it('should evaluate rules deterministically', () => {
    const engine = new PolicyEngine();
    const result1 = engine.evaluate(policy, input);
    const result2 = engine.evaluate(policy, input);
    expect(result1).toEqual(result2); // Deterministic
  });

  it('should block on critical issues', () => {
    const result = engine.evaluate(policyWithCritical, inputWithCriticalIssue);
    expect(result.isBlocked).toBe(true);
  });
});
```

**What to Test:**
- ✅ Business logic in `services/*`
- ✅ Utility functions in `lib/*`
- ✅ API response validation
- ✅ Error handling edge cases
- ✅ Deterministic behavior (same input → same output)

**What NOT to Test:**
- ❌ Next.js framework internals
- ❌ Third-party library behavior
- ❌ Database queries (use E2E tests instead)

### E2E Tests (Playwright)
**Test Files:** 12+ spec files in `e2e/`

**Key Test Suites:**
- `auth.spec.ts` - GitHub OAuth flow, session management
- `billing-workflow.spec.ts` - Stripe integration, usage limits
- `golden-path.spec.ts` - Complete user journey (signup → review → results)
- `github-app-oauth.spec.ts` - GitHub App installation flow
- `secrets-redaction.spec.ts` - Secret detection and redaction
- `llm-async-timeout.spec.ts` - Async LLM processing and timeouts

**E2E Test Pattern:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign in with GitHub', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');

  // Click sign in
  await page.click('text=Sign in with GitHub');

  // Verify redirect to GitHub OAuth
  await expect(page).toHaveURL(/github\.com\/login/);

  // ... complete OAuth flow ...

  // Verify successful login
  await expect(page).toHaveURL(/localhost:3000\/dashboard/);
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

### Integration Testing
- Use Playwright for API integration tests
- Test webhook handlers with actual payloads
- Verify background job processing

### Performance Testing
- Monitor response times in E2E tests
- Check LLM call durations (should be async)
- Verify database query performance (< 100ms for most queries)

---

## 📊 Environment Variables

### Required Variables (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/readylayer"
DIRECT_URL="postgresql://user:password@localhost:5432/readylayer"

# Supabase (Auth)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# GitHub OAuth
GITHUB_CLIENT_ID="Iv1.xxx"
GITHUB_CLIENT_SECRET="xxx"
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nxxx\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="xxx"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# LLM Providers
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"

# Redis (Background Jobs)
REDIS_URL="redis://localhost:6379"

# Encryption
ENCRYPTION_KEY="base64-encoded-32-byte-key"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Optional Variables
```bash
# OpenRouter (Alternative LLM)
OPENROUTER_API_KEY="sk-or-xxx"

# Logging
LOG_LEVEL="info"  # debug, info, warn, error

# Rate Limiting
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="60000"
```

### Test Environment (.env.test)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/readylayer_test"
# ... same variables as .env but with test values
```

---

## 🏗️ Architecture Deep Dives

### Policy Engine (Deterministic Governance)
**Location:** `services/policy-engine/`

**Key Concepts:**
- **Deterministic Evaluation:** Same inputs + same policy version = same outputs
- **Evidence Bundles:** Every decision includes audit trail (policy checksum, rule versions, input hashes)
- **Inheritance Chain:** Org → Team → Repo policies
- **Versioning:** Policies are versioned; changes create new versions

**Usage:**
```typescript
import { PolicyEngine } from '@/services/policy-engine';

const engine = new PolicyEngine();
const result = await engine.evaluate({
  policyPackId: 'pol_xxx',
  input: codeReviewResults,
  context: { organizationId, repositoryId }
});

// Result includes:
// - isBlocked: boolean
// - issues: Issue[]
// - evidenceBundle: EvidenceBundle (audit trail)
```

### Async LLM Processing (Non-Blocking)
**Location:** `services/llm/`, `workers/`

**Flow:**
1. API receives review request
2. Returns `202 Accepted` with `enrichmentJobIds`
3. Background worker processes LLM calls
4. Client polls or uses WebSocket for updates

**Key Files:**
- `services/llm/llm-service.ts` - LLM abstraction layer
- `workers/job-processor.ts` - Background job handler
- `lib/queue/` - Redis queue management

### Secret Redaction (Pre-LLM Safety)
**Location:** `lib/secrets/redaction.ts`

**Detection Patterns:**
- AWS Access Keys (`AKIA[0-9A-Z]{16}`)
- Private Keys (`-----BEGIN .* PRIVATE KEY-----`)
- API Tokens (`sk-[a-zA-Z0-9]{32,}`)
- Passwords in code
- Email addresses (PII)

**Usage:**
```typescript
import { redactSecrets } from '@/lib/secrets/redaction';

const safeCode = redactSecrets(userProvidedCode);
// Send safeCode to LLM, never original
```

### Tenant Isolation (Security)
**Pattern:** All queries MUST filter by `organizationId`

**Example:**
```typescript
// ❌ NEVER do this (missing tenant filter)
await prisma.repository.findMany();

// ✅ ALWAYS do this
await prisma.repository.findMany({
  where: { organizationId: user.organizationId }
});
```

**Enforcement:**
- Middleware verifies user → org → resource ownership
- Row-Level Security (RLS) in Supabase as defense-in-depth

---

## 🛠️ Common Development Tasks

### Adding a New API Endpoint
1. Create route handler in `app/api/v1/[resource]/route.ts`
2. Define Zod schema for input validation
3. Implement business logic in `services/[resource]/`
4. Add unit tests in `services/[resource]/__tests__/`
5. Add E2E test in `e2e/[resource].spec.ts`
6. Update API documentation

### Adding a New Database Model
1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate dev --name description`
3. Run `npm run prisma:generate`
4. Add TypeScript types if needed
5. Update seed script if necessary
6. Test migration in CI

### Adding a New React Component
1. Create component in `components/[category]/ComponentName.tsx`
2. Define TypeScript props interface
3. Use Radix UI primitives where applicable
4. Add to Storybook if creating design system component
5. Add unit tests for complex logic
6. Add E2E test for user interactions

### Debugging a Failing Test
1. Run test in isolation: `npm test -- path/to/test.test.ts`
2. Add console logs or `vi.spyOn()` to understand state
3. Check test database state (Prisma Studio)
4. Verify environment variables in `.env.test`
5. Use `--watch` mode for rapid iteration
6. Check for race conditions in async code

### Investigating Production Errors
1. Check Vercel logs for stack traces
2. Check Supabase logs for database errors
3. Verify environment variables in Vercel dashboard
4. Check Stripe dashboard for payment errors
5. Use Sentry or error tracking (if configured)
6. Review `AuditLog` table for user actions

---

## 📚 Additional Documentation

### Architecture & Design
- **docs/architecture/DESIGN-SYSTEM-COMPLETE.md** - UI component library
- **docs/architecture/deep-dives.md** - Technical deep dives
- **DEPLOYMENT-GUIDE.md** - Production deployment
- **PERFORMANCE-PROFILING-GUIDE.md** - Performance optimization

### API Reference
- **API-ENDPOINTS-SUMMARY.md** - All endpoints documented
- **OpenAPI spec** - Machine-readable API definition

### Security
- **SECURITY.md** - Vulnerability reporting, security features

### Contribution
- **CONTRIBUTING.md** - Development setup, contribution guidelines
- **CODE_OF_CONDUCT.md** - Community standards

---

## 🤝 Working with Claude (AI Assistant)

### Effective Prompts
**Good:**
> "Add a new API endpoint at `/api/v1/policies` that lists all policies for an organization. Include tenant isolation, input validation, and tests."

**Better:**
> "Add GET `/api/v1/policies` endpoint:
> - List policies filtered by user's organizationId (tenant isolation)
> - Support pagination (limit, offset)
> - Validate query params with Zod
> - Return consistent API response format
> - Add unit tests for service layer
> - Add E2E test for API endpoint
> - Follow existing patterns in `/api/v1/repos/route.ts`"

### Context Sharing
When reporting bugs or requesting features:
1. **Error Message:** Full stack trace
2. **Code Location:** File path and line numbers
3. **Expected Behavior:** What should happen
4. **Actual Behavior:** What actually happens
5. **Steps to Reproduce:** Minimal reproduction steps
6. **Environment:** Node version, OS, relevant env vars

### Code Review Requests
> "Review this implementation for security issues, particularly:
> - Tenant isolation (organizationId filtering)
> - Secret redaction before LLM calls
> - Input validation with Zod
> - SQL injection prevention
> - XSS vulnerabilities"

---

## ⚡ Quick Reference

### Most Common Commands
```bash
npm run dev              # Start development
npm test                 # Run unit tests
npm run test:e2e         # Run E2E tests
npm run type-check       # TypeScript check
npm run lint             # Lint code
npm run build            # Production build
npm run prisma:studio    # Open database UI
```

### Most Common File Locations
- API Routes: `app/api/v1/[resource]/route.ts`
- React Components: `components/[category]/ComponentName.tsx`
- Services: `services/[service-name]/`
- Database Schema: `prisma/schema.prisma`
- E2E Tests: `e2e/[feature].spec.ts`
- Config: `.env`, `next.config.js`, `tsconfig.json`

### Getting Help
- **Documentation:** `/docs/` directory
- **Community:** GitHub Issues
- **Security:** See SECURITY.md for vulnerability reporting

---

**Remember:** ReadyLayer prioritizes security, determinism, and auditability in all implementations. When in doubt, ask Claude to verify tenant isolation, secret redaction, and audit logging.
