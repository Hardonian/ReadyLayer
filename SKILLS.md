# SKILLS.md — Capability Map and Future Work Guide

## 1. How to Use This File

This document maps tasks to the appropriate agent, model, or tooling approach for ReadyLayer. Use it to determine:
- Which capability is needed for a given task
- How to validate work quality
- What risks to watch for during implementation

**Quick reference:** Start with the "Which Agent for Which Task" matrix for common task types.

## 2. Current Capability Inventory

### UI / Frontend
| Capability | Detected | Notes |
|------------|----------|-------|
| Next.js App Router | Yes | Pages in `app/`, API routes in `app/api/` |
| React 19 | Yes | Latest React with Suspense support |
| Tailwind CSS | Yes | Full design token system in `tailwind.config.ts` |
| Design tokens | Yes | Semantic tokens for colors, typography, spacing in `app/globals.css` |
| Components | Yes | `components/ui/` for primitives, domain components organized by feature |
| Visual regression | Yes | Playwright-based with deterministic snapshots (`e2e/`) |
| Error boundaries | Yes | `components/ErrorBoundary.tsx` and `components/error-boundary.tsx` |

### Content System
| Capability | Detected | Notes |
|------------|----------|-------|
| Static content | Yes | `app/content/` directory for page content |
| Internationalization | No | Not detected; content is English-only |
| Markdown rendering | Partial | `markdowns/` directory exists for documentation |

### Tooling
| Capability | Detected | Notes |
|------------|----------|-------|
| ESLint | Yes | `eslint.config.js` with strict and standard configs |
| TypeScript | Yes | `tsconfig.json`, `tsc --noEmit` for checking |
| Vitest | Yes | Unit testing with `__tests__/` and `tests/` |
| Playwright | Yes | E2E and visual regression testing (`e2e/`) |
| Prettier | No | Not detected; uses ESLint for formatting |
| Husky | Yes | Git hooks for commit validation |

### CI/CD
| Capability | Detected | Notes |
|------------|----------|-------|
| GitHub Actions | Yes | `.github/workflows/` with 20+ workflow files |
| Deploy workflows | Yes | `deploy.yml`, `deploy-staging.yml` |
| Quality gates | Yes | `quality-gates.yml`, `security-gates.yml` |
| Lint/typecheck CI | Yes | `lint-typecheck.yml` runs on PRs |
| Documentation checks | Yes | `docs-reality-gates.yml` |

### Observability
| Capability | Detected | Notes |
|------------|----------|-------|
| Logging | Yes | `observability/logging.ts`, pino-based |
| Metrics | Yes | `observability/metrics.ts`, Prometheus exporter |
| Health checks | Yes | `observability/health.ts` |
| Error tracking | Yes | `lib/errors.ts` with structured error responses |

### Backend / Data
| Capability | Detected | Notes |
|------------|----------|-------|
| Prisma ORM | Yes | Database schema in `prisma/schema.prisma` |
| Supabase | Yes | Auth and database (`lib/supabase/`) |
| Redis | Optional | For queue performance (`lib/cache/`) |
| Webhook processing | Yes | `workers/webhook-processor.ts` |

### Feature Management
| Capability | Detected | Notes |
|------------|----------|-------|
| Feature flags | Yes | `config/feature-flags.ts` with experimental features |
| Runtime config | Yes | `lib/runtime-ui-config.ts` |

## 3. Skill Lanes

### Product / UX Writing
- **Where it happens:** Landing pages, dashboard copy, feature descriptions
- **Tone:** Enterprise-safe, consultancy-grade, governance-focused
- **Validation:** Link consistency, no broken claims, terminology alignment
- **Patterns:** Avoid marketing hyperbole; stick to verifiable capabilities

### UI System Work
- **Where it happens:** `components/ui/`, `tailwind.config.ts`, `app/globals.css`
- **Approach:** Extend semantic tokens before adding new ones
- **Validation:** Visual diff tests pass; token names follow established hierarchy
- **Patterns:** Use `text-*`, `surface-*`, `accent-*` token prefixes

### Frontend Engineering
- **Where it happens:** `app/` pages, `components/` domain components, API routes
- **Approach:** Follow Next.js App Router conventions; use Server Components where possible
- **Validation:** TypeScript strict mode, ESLint, Playwright E2E
- **Patterns:** Error boundaries on all client components; proper loading states

### Integration Boundaries
- **Where it happens:** `lib/services/`, `lib/contracts/`, webhook handlers
- **Approach:** Use Zod for runtime validation; document API contracts
- **Validation:** `lib/env.ts` schema checks; integration tests in `tests/`
- **Patterns:** Supabase auth on all protected routes; rate limiting on APIs

### QA / Release
- **Where it happens:** `scripts/smoke-*.ts`, `e2e/`, CI workflows
- **Approach:** Smoke tests for critical paths; visual regression for UI
- **Validation:** `npm run verify:fast` → `npm run verify` → manualoff sign
- **Patterns:** Fail fast on lint/type errors; graceful degradation on runtime issues

## 4. Which Agent for Which Task Matrix

| Task Type | Recommended Approach | Validation |
|-----------|---------------------|------------|
| Copy hardening (accuracy, consistency) | LLM pass + human skim | Link check + terminology scan |
| Token system changes (colors, typography) | Engineer agent | Visual diff + lint/build |
| New API endpoint | Engineer agent | Typecheck + integration test |
| Bug fix (reproducible) | Engineer agent + test-first | Add regression test |
| Visual design updates | Designer agent | Playwright visual regression |
| Documentation updates | Human or LLM | Docs consistency check + link validation |
| Feature flag implementation | Engineer agent | Gate component + integration test |
| Performance optimization | Profiling agent | Benchmark script + before/after metrics |
| Security hardening | Security audit + engineer | SAST scan + penetration test |
| Database migration | Engineer agent + review | Prisma validate + backup |

## 5. Known Risks and Pitfalls

| Symptom | Likely Cause | Diagnosis |
|---------|--------------|-----------|
| Lint errors with missing return types | New scripts in `scripts/` missing explicit types | Run `npm run lint`, check error locations |
| Build fails after `npm install` | Prisma generation skipped | Run `npm run prisma:generate` |
| Webhook validation errors | Payload doesn't match schema | Check `workers/__tests__/webhook-processor.test.ts` |
| Type errors in components | Missing imports or stale types | Run `npm run type-check` |
| Visual regression failures | Design tokens changed without updating snapshots | Update with `npm run test:visual:update` |
| Database connection failures | Missing or invalid `DATABASE_URL` | Check `.env` and run `npm run db:smoke` |

## 6. Roadmap (Next 30/60/90 Days)

### 30 Days: Stabilize and Harden
- Fix remaining lint errors in benchmark scripts (`scripts/bench-*.ts`)
- Add integration tests for billing middleware (`lib/billing-middleware.ts`)
- Complete tenant isolation test coverage (`scripts/test-tenant-isolation.ts`)
- Document webhook validation patterns in `docs/`
- Expand visual regression snapshots to cover dashboard routes

### 60 Days: CI Enforcement and DX
- Add lint/typecheck gates to all PRs (already in CI, enforce on merge)
- Create component library documentation in `docs/components.md`
- Add benchmark automation for API routes
- Implement bundle size monitoring in CI (`@next/bundle-analyzer`)
- Create API contract documentation for `app/api/` routes

### 90 Days: Platform Maturity
- Add multi-environment support (staging/production config separation)
- Implement comprehensive observability dashboard
- Expand feature flag testing coverage
- Add end-to-end smoke test for critical user flows
- Create runbook documentation for common operations

## 7. Definition of Done (DoD)

A task is **ship-ready** when:

1. **Commands green:**
   - `npm run lint` exits 0
   - `npm run type-check` exits 0
   - `npm run build` exits 0
   - `npm test` exits 0 (or intentionally skipped)

2. **Quality gates passed:**
   - No new lint warnings introduced
   - TypeScript strict mode satisfied
   - Visual regression tests pass (if UI changed)

3. **Functional requirements met:**
   - Feature works as specified in issue
   - Edge cases handled gracefully
   - Error messages are actionable

4. **Non-functional requirements met:**
   - No secrets or credentials in diff
   - No placeholder copy or fake data
   - No performance regressions (verified by benchmarks if applicable)

5. **Documentation updated:**
   - Comments added for complex logic
   - README or docs updated if behavior changed
   - API contracts documented if changed

## 8. Emergency Procedures

### Rollback a Change
```bash
# Find the commit to revert
git log --oneline -10

# Revert specific commit
git revert <commit-hash>

# Force push (if absolutely necessary and approved)
git push --force-with-lease
```

### Disable a Feature Flag
Set the corresponding environment variable to `0` or `false`:
```bash
NEXT_PUBLIC_ENABLE_AI_RISK_INDEX=0
```

### Restore from Backup
Prisma backups are stored in `prisma/migrations/`. Restore with:
```bash
psql "$DATABASE_URL" -f prisma/migrations/<backup-file>.sql
```

---

**Last Updated:** 2026-02-04
**Maintainers:** ReadyLayer Core Team
