# ReadyLayer Security Model

> Verified against the codebase (2026-09-30). Threat boundaries and controls
> as implemented — no aspirational claims.

## Threat Boundaries

```
 Internet (providers, users)
   │
   ├─ Webhooks ──► /api/webhooks/*        [boundary: signature/HMAC]
   ├─ OAuth     ──► /api/github/* etc.    [boundary: CSRF state + redirect allowlist]
   ├─ App/API   ──► /api/v1/*, pages      [boundary: Supabase session / API key]
   │
   ▼
 middleware/proxy (default-deny, edge rate limiting)
   │
   ▼
 services (authorization, tenant scoping) ──► Postgres (RLS) ──► LLM providers
                                                    │
                                              [boundary: redaction]
```

## Authentication

- **Users**: Supabase SSR sessions. The middleware validates the session
  cookie server-side on every request (`getEdgeAuthUser`); client-side session
  state alone is never trusted. E2E tests prove this by validating real test
  sessions through the same middleware against a stubbed IdP — auth is not
  disabled in tests.
- **Machines**: API keys, presence-checked at the edge, fully validated
  in-route against the database.
- **Providers**: OAuth apps (GitHub/GitLab/Bitbucket) with per-installation
  encrypted tokens (`lib/secrets/installation-helpers`).

## Authorization

- Default-deny route classification (`lib/access-control.ts`): only explicitly
  listed routes are public. Unknown paths are private.
- User-bound operations (e.g. `/api/github/actions/dispatch`) require a
  session even though sibling webhook endpoints are public.
- Tenant checks at the service layer on every tenant-owned resource.

## Webhook Integrity

- Stripe: HMAC over the RAW request body (`services/billing/stripe-webhook-handler`,
  `verifyWebhookSignature`); Node runtime required for raw-body access.
- GitHub: `x-hub-signature-256` with timestamp/nonce headers.
- GitLab/Bitbucket: token/signature header verification.
- Signature verification happens BEFORE payload parsing; failures increment
  metrics and return non-2xx without processing.

## OAuth Hardening

- CSRF `state` tokens: 64-char, httpOnly cookie, 10-minute expiry, validated
  server-side on callback; cookie cleared after use.
- Redirect URIs allowlisted (origin + path equality) on the POST initiation
  endpoint (`DISALLOWED_REDIRECT_URI` rejection).
- Callback errors (missing code, provider error, state mismatch) redirect to
  `/auth/error` without leaking state tokens.

## Secret Handling

- `lib/secrets/redaction`: deterministic pattern surface (OpenAI keys incl.
  `sk-proj-`, AWS keys, GitHub tokens, Slack/Stripe tokens, JWTs, private key
  blocks, DB URLs incl. `postgresql://`, password literals, env-var shapes).
  Non-overlapping span accounting — one secret counts once regardless of how
  many patterns match it. `isRedactedSafe` gate before content reaches models.
- Redaction runs before LLM prompts; logs never contain raw secret payloads.
- Installation tokens encrypted at rest; migration tooling is
  manual-dispatch only (never runs automatically).

## Data Protection

- Tenant isolation: Supabase RLS + application-level scoping (defense in
  depth). RLS policies in `supabase/migrations`.
- CSP: default-src 'self'; connect-src limited to Supabase + Stripe (the local
  test auth stub is permitted outside production only). Frame-ancestors 'none',
  HSTS with preload-eligible max-age.
- Cookie hygiene: httpOnly/secure/sameSite on session and CSRF cookies.

## Abuse Controls

- Edge rate limiting on API routes (sliding window per IP).
- Per-tenant budgets with hard stops (`UsageLimitExceededError`).
- Billing tier enforcement in middleware/route layer.

## Known Limitations (honest list)

1. `services/test-engine/executor.ts` test executors are simulated — executing
   generated tests in a real sandbox is deliberately NOT implemented because
   safe arbitrary-code execution needs real isolation (container/VM) first.
2. API-key validation at the edge is presence-only by design (Prisma lives in
   Node runtime); full validation in-route.
3. Production deployment currently sits behind Vercel Deployment Protection
   (SSO) — limits public verification of the live app.
4. Cross-tenant negative tests exist in script form
   (`test:tenant-isolation`, `test:billing`) and require a live database.

## Security Verification in CI

- `security-gates`: gitleaks (full history), OSV dependency scanning, CodeQL.
- `Security` / `security.yml`: additional scanning workflows.
- Dependency Review on every PR; `npm audit --audit-level=high` gate
  (currently 0 vulnerabilities).
- Push protection on the repository (test fixtures are assembled from
  fragments to avoid false-positive secret blocks — documented in tests).
