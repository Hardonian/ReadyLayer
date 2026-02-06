# AGENTS.md — Operating Manual for AI Agents

## 1. Purpose

ReadyLayer provides governance tooling for AI-assisted software delivery. It ships:
- **Deterministic policy runner** with schema-defined input/output and evidence bundles (Go binary)
- **Web app + API** for viewing governance runs, policies, and audit evidence (Next.js + Prisma)
- **CLI workflows** for reviewing files and triggering governance-related actions (Node.js)
- **JobForge queue** for background processing and webhook/report workflows
- **Self-hosted first**: runs locally with your infrastructure and credentials

**Who this is for:** engineering teams, platform teams, and OSS contributors who need auditable governance around AI-assisted code changes.

**Done means:**
- All verification commands pass (`npm run verify:fast` at minimum)
- No lint errors, type errors, or test failures
- Pages load without 500s; graceful fallbacks for missing data
- Secrets are never logged or committed
- Changes are minimal and scoped to the issue at hand

## 2. Repo Map (Practical)

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages, API routes, and UI surfaces |
| `components/` | React components organized by domain (billing, dashboard, landing, ui, etc.) |
| `lib/` | Shared business logic: auth, billing, job queues, middleware, observability |
| `config/` | Feature flags (`feature-flags.ts`), design token imports |
| `scripts/` | One-off scripts for benchmarks, migrations, smoke tests |
| `workers/` | Background workers (webhook processor, job processor) |
| `services/` | Worker services (JobForge, Python workers) |
| `prisma/` | Database schema and migrations |
| `docs/` | Architecture docs, runbooks, integration guides |
| `e2e/` | Playwright visual and functional tests |
| `__tests__/` / `tests/` | Unit and integration tests |
| `tools/ready-layer-runner/` | Go-based deterministic runner |
| `cli/` | ReadyLayer CLI entrypoint |

**Sources of truth:**
- **Content**: `app/` pages and `content/` directory
- **Components**: `components/ui/` for primitive components, domain components in subdirectories
- **Config**: `config/feature-flags.ts` for feature gates
- **Tokens/Styles**: `tailwind.config.ts` + `app/globals.css` for CSS custom properties
- **Tests**: `__tests__/` for unit tests, `e2e/` for visual/functional tests

## 2.1 Safe-to-Edit Zones (Default)

These areas are safe for additive changes without cross-cutting refactors:
- `app/` (API routes + UI pages)
- `components/` (UI + domain components)
- `lib/` (shared utilities, contracts, validation)
- `services/` (service layer orchestrations)
- `workers/` (background processors)
- `scripts/` (ops and demo scripts)
- `docs/` (runbooks, invariants, architecture docs)
- `.github/workflows/` (CI gates, quality checks)

Avoid large-scale refactors in:
- `prisma/` (schema + migrations)
- `tools/ready-layer-runner/` (Go runner)
- `sdk/` (public SDK contracts)

## 3. Golden Rules (Invariants)

- **No secrets**: Never commit `.env` files, API keys, or credentials. Use `lib/secrets/` utilities for redaction.
- **Least privilege**: Database access should be scoped to least privilege; API routes should validate permissions.
- **No fake data/claims**: UI copy must be accurate; avoid placeholder marketing claims.
- **Graceful fallbacks**: No hard 500s. Return meaningful error codes (`lib/errors.ts`) with fix suggestions.
- **Minimal diffs**: Avoid refactors unless explicitly requested. Stay within the scope of the issue.
- **Deterministic builds**: Keep CI green; use frozen timezones in visual tests.
- **Fail fast on env**: Missing required environment variables should fail fast with clear errors.

## 4. Agent Workflow (How to Work Here)

### 4.1 Discovery
1. Read the issue or task description carefully
2. Identify affected files by grepping for relevant patterns
3. Check `CONTRIBUTING.md` for contribution guidelines
4. Review existing tests in `__tests__/` or `e2e/` for the affected area

### 4.2 Diagnose
1. Gather evidence: run `npm run verify:fast` to identify lint/type errors
2. Check recent commits (`git log --oneline -10`) for context
3. Review related documentation in `docs/`
4. For bugs: reproduce locally with `npm run dev` before fixing

### 4.3 Implement
1. Make smallest safe patch possible
2. Add tests for new functionality
3. Update documentation if behavior changes
4. Use feature flags for experimental features (`config/feature-flags.ts`)

### 4.4 Verify
1. Run `npm run verify:fast` (lint + typecheck)
2. Run `npm test` for unit tests
3. Run `npm run build` for full production build
4. Manually verify the change if it affects UI

### 4.5 Report
1. Summarize changes made
2. List files changed
3. Note any breaking changes or migration requirements
4. Provide verification steps

## 5. Command Cookbook

| Command | Purpose | Notes |
|---------|---------|-------|
| `npm install` | Install dependencies | Runs `prisma generate` post-install |
| `npm run dev` | Start dev server | http://localhost:3000 |
| `npm run build` | Production build | Runs lint + typecheck + next build |
| `npm run lint` | Run ESLint | Config: `eslint.config.js` |
| `npm run type-check` | Run TypeScript compiler | `tsc --noEmit` |
| `npm test` | Run vitest suite | `vitest run` |
| `npm run test:coverage` | Run tests with coverage | |
| `npm run test:e2e` | Playwright multi-browser tests | chromium, firefox, webkit, mobile |
| `npm run test:visual` | Visual regression tests | desktop, tablet, mobile, dark |
| `npm run verify` | Full verification | build + test + docs check |
| `npm run verify:fast` | Fast verification | lint + typecheck only |
| `npm run doctor` | System health check | `scripts/doctor.ts` |
| `npm run demo:setup` | Prepare demo mode fixtures | |
| `npm run demo:reset` | Reset demo sandbox state | |
| `npm run demo:start` | Start dev server in demo mode | |
| `npm run prisma:migrate` | Run database migrations | |
| `npm run prisma:studio` | Open Prisma Studio | |
| `npm run worker:webhook` | Start webhook worker | |
| `npm run worker:job` | Start job processor worker | |

## 5.1 Command Canon (Preferred Order)

1. `npm install`
2. `npm run verify:fast`
3. `npm test`
4. `npm run build`
5. `npm run middleware:smoke` (or `npm run demo:start` for demo validation)

**CI workflows** (`.github/workflows/`):
- `ci.yml`: Main CI pipeline
- `lint-typecheck.yml`: Lint and typecheck
- `verify-runner.yml`: Runner verification
- Quality gates, security scans, and deployment workflows present

## 6. Change Safety Checklist

Before committing, verify:

- [ ] **Lint passes**: `npm run lint` exits 0
- [ ] **Typecheck passes**: `npm run type-check` exits 0
- [ ] **Build passes**: `npm run build` exits 0
- [ ] **Tests pass**: `npm test` exits 0 (or skipped intentionally)
- [ ] **No dead imports**: Run `npm run lint` to check
- [ ] **No unused files**: Review git diff for accidental additions
- [ ] **Token drift**: If changing UI, verify `tailwind.config.ts` tokens remain consistent
- [ ] **Secrets cleaned**: No API keys, tokens, or credentials in diff
- [ ] **Feature flags updated**: If adding experimental features, update `config/feature-flags.ts`

## 7. Code Standards (Repo-Specific)

### 7.1 TypeScript / ESLint
- Config: `eslint.config.js` (main), `eslint.config.strict.js` (stricter rules)
- Explicit function return types required
- No unused variables (except `_` prefix for intentionally unused)
- Zod for runtime validation (`lib/validations.ts`)

### 7.2 Component Patterns
- Use `components/ui/` for primitive components (Button, Card, etc.)
- Domain components in `components/{domain}/`
- Error boundaries: `components/ErrorBoundary.tsx` and `components/error-boundary.tsx`
- Use `FeatureGate` component for experimental features (`config/feature-flags.ts`)

### 7.3 Error Handling
- Use `lib/errors.ts` for structured API errors
- `createErrorResponse(code, message, statusCode, context, fix)`
- Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, etc.

### 7.4 Environment Variables
- Required vars documented in `.env.example`
- Validation: `lib/env.ts` (schema validation with zod)
- Never log or expose secrets; use `lib/secrets/` utilities
- Access via `process.env` only; no hardcoded keys

## 7.5 Agent Guardrails

- Do not weaken auth checks or bypass `requireAuth`.
- Do not silence errors to pass lint/test; fix root causes.
- Do not commit generated artifacts or `.env` files.
- Keep demo mode deterministic and resettable.

## 8. PR / Commit Standards

### Branch Naming
- `feat/*` for new features
- `fix/*` for bug fixes
- `chore/*` for maintenance tasks
- `docs/*` for documentation changes
- `refactor/*` for refactors (avoid unless requested)

### Commit Message Style
- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- Example: `feat(dashboard): add recent runs widget`

### PR Expectations
- No PR template in repo; include:
  - Summary of changes
  - Files changed
  - Verification steps
  - Any breaking changes

## 9. Roadmap Hooks (Agent-Ready Backlog)

Based on recent work (performance scoreboard, authz optimization, feature flags):

1. **Fix lint errors in benchmark scripts** — `scripts/bench-*.ts` have missing return types and unused variables
2. **Expand visual regression coverage** — Add more routes to Playwright visual tests
3. **Add billing enforcement tests** — `scripts/test-billing-enforcement.ts` needs more coverage
4. **Document JobForge architecture** — `docs/jobforge.md` exists; add more runbooks
5. **Add tenant isolation tests** — `scripts/test-tenant-isolation.ts` for multi-tenant safety
6. **Optimize bundle size** — Use `@next/bundle-analyzer` to identify large dependencies
7. **Add performance benchmarks** — More benchmarks for API routes
8. **Expand feature flag tests** — Test `FeatureGate` component behavior
9. **Add API contract tests** — Verify API routes match OpenAPI spec (if present)
10. **Harden webhook validation** — Address validation errors in webhook processor

All items are actionable and consistent with current direction (observability, testing, and governance tooling).
