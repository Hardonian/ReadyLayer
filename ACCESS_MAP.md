# ReadyLayer Access Map

This inventory enumerates App Router pages, public marketing/trust routes, and API routes with logged-out behavior and recommended access classification.

## Navigation inventory

**Header (public, unauthenticated)**
- How it Works → `/how-it-works`
- Features → `/features`
- Pricing → `/pricing`
- Marketplace → `/marketplace`
- Docs → `/docs/api-reference`
- Help → `/help`

**Header (authenticated)**
- Dashboard → `/dashboard`
- Live Ops → `/dashboard/live`
- PRs → `/dashboard/prs`
- Runs → `/dashboard/runs`
- Findings → `/dashboard/findings`
- Policies → `/dashboard/policies`
- Audit → `/dashboard/audit`
- Marketplace → `/marketplace`
- Billing → `/dashboard/billing`
- Settings → `/dashboard/settings`
- Help → `/help`

**Footer**
- Product: `/how-it-works`, `/pricing`, `/marketplace`, `/features/oss-maintainers`, `/features/startup-ctos`
- Trust & Security: `/security`, `/audit-example`, `https://status.readylayer.io`, `https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md`
- Resources: `/docs/api-reference`, `/help`, `/help/getting-started`, `https://github.com/Hardonian/ReadyLayer`
- Legal: `/privacy`, `/terms`, `/dpa`, `/cookies`

## App Router pages (marketing/trust/public)

| Route | In nav? (label) | Current logged-out behavior | Data sensitivity | Recommended access | Change needed |
| --- | --- | --- | --- | --- | --- |
| `/` | Header (logo), Public | 200 (public) | None | PUBLIC | None |
| `/about` | Footer (new) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/audit-example` | Footer (Audit Example) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/changelog` | Footer (new) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/contact` | Footer (new) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/cookies` | Footer (Cookie Policy) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/docs` | Public | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/docs/api-reference` | Header/Footer (Docs/Documentation) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/dpa` | Footer (Data Processing) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/faq` | Footer (new) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/features` | Header (Features) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/features/oss-maintainers` | Footer (For OSS Maintainers) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/features/startup-ctos` | Footer (For Startup CTOs) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/help` | Header/Footer (Help & Support) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/help/support` | Public | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/help/getting-started` | Footer (Getting Started) | 404 (previous) | None | PUBLIC | New page |
| `/help/getting-started/welcome` | Public | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/help/getting-started/connect-repo` | Public | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/help/getting-started/first-review` | Public | 404 (previous) | None | PUBLIC | New page |
| `/help/getting-started/policies` | Public | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/how-it-works` | Header/Footer | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/integrations` | Public | 302/307 → `/auth/signin` (previous) | None | HYBRID | Allowlist + new page |
| `/marketplace` | Header/Footer (Marketplace) | 404 (previous) | None | HYBRID | Allowlist + new page |
| `/marketplace/integrations` | Public | 302/307 → `/auth/signin` | None | HYBRID | Allowlist |
| `/pricing` | Header/Footer (Pricing) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/privacy` | Footer (Privacy Policy) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/security` | Footer (Security & Compliance) | 302/307 → `/auth/signin` | None | PUBLIC | Allowlist |
| `/status` | Public | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/support` | Public | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/terms` | Footer (Terms of Service) | 302/307 → `/auth/signin` (previous) | None | PUBLIC | Allowlist + new page |
| `/auth/signin` | Public | 200 | None | PUBLIC | None |
| `/auth/signout` | Public | 200 | None | PUBLIC | None |
| `/auth/callback` | Public | 200 | Sensitive | AUTH_REQUIRED (callback only) | None |
| `/auth/error` | Public | 200 | None | PUBLIC | None |

## App Router pages (authenticated/private)

| Route | In nav? (label) | Current logged-out behavior | Data sensitivity | Recommended access | Change needed |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | Header (Dashboard) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/live` | Header (Live Ops) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/prs` | Header (PRs) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/runs` | Header (Runs) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/runs/sandbox` | Public | 302/307 → `/auth/signin` | Demo data | AUTH_REQUIRED | None (demo via `/api/v1/runs/sandbox`) |
| `/dashboard/runs/[runId]` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/billing` | Header (Billing) | 302/307 → `/auth/signin` | Billing data | AUTH_REQUIRED | None |
| `/dashboard/billing/usage` | Public | 302/307 → `/auth/signin` | Billing data | AUTH_REQUIRED | None |
| `/dashboard/settings` | Header (Settings) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/onboarding` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/evidence` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/evidence/[bundleId]` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/audit` | Header (Audit) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies` | Header (Policies) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/gates` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/new` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/[packId]` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/[packId]/edit` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/[packId]/rules/new` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/policies/[packId]/rules/[ruleId]/edit` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/admin` | Public | 302/307 → `/auth/signin` | Admin data | AUTH_REQUIRED | None |
| `/dashboard/admin/policies` | Public | 302/307 → `/auth/signin` | Admin data | AUTH_REQUIRED | None |
| `/dashboard/admin/users` | Public | 302/307 → `/auth/signin` | Admin data | AUTH_REQUIRED | None |
| `/dashboard/reviews` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/reviews/[reviewId]` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/metrics` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/analytics/llm-costs` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/analytics/health` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/repos` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/repos/connect` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/repos/[repoId]` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/readiness` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/waivers` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/waivers/new` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/persona` | Public | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/dashboard/findings` | Header (Findings) | 302/307 → `/auth/signin` | Private tenant data | AUTH_REQUIRED | None |
| `/_internal/review` | Public (internal) | 404 in production unless enabled | Internal | AUTH_REQUIRED | Env-gated (no change) |

## API routes

| Route | Current logged-out behavior | Data sensitivity | Recommended access | Change needed |
| --- | --- | --- | --- | --- |
| `/api/health` | 200 (public) | None | PUBLIC | None |
| `/api/ready` | 200/503 (public) | None | PUBLIC | None |
| `/api/ui-config` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/stream` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/github/auth` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/github/callback` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/github/actions/webhook` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/github/actions/dispatch` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/integrations/github/install` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/integrations/github/callback` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/integrations/gitlab/install` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/integrations/gitlab/callback` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/integrations/bitbucket/install` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/integrations/bitbucket/callback` | 401 (middleware) | Sensitive auth | AUTH_REQUIRED | None |
| `/api/webhooks/github` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/webhooks/gitlab` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/webhooks/bitbucket` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/webhooks/stripe` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/webhooks/slack/blocked-pr` | 401 (middleware) | Sensitive webhook | AUTH_REQUIRED | None |
| `/api/v1/runs/sandbox` | 200 (public) | Demo data | PUBLIC | None |
| `/api/v1/runs` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/runs/[runId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/billing/false-positives` | 401 (middleware) | Billing data | AUTH_REQUIRED | None |
| `/api/v1/billing/tier` | 401 (middleware) | Billing data | AUTH_REQUIRED | None |
| `/api/v1/billing/checkout` | 401 (middleware) | Billing data | AUTH_REQUIRED | None |
| `/api/v1/control-plane/integrations` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ethical-ai/explain/[reviewId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ethical-ai/override` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/cultural-artifacts/risk-index/[organizationId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/cultural-artifacts/certificate/[reviewId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/cultural-artifacts/readiness/[repositoryId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/api-keys` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/api-keys/[keyId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ide/review` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ide/test` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/usage` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/evidence` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/evidence/[bundleId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/evidence/[bundleId]/export` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/self-learning/insights` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/self-learning/feedback` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/rag/query` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/rag/ingest` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ai-optimization` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ai-optimization/suggestions` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/ai-optimization/suggestions/[id]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/test` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/validate` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/templates` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/templates/[templateId]/apply` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/gates` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/[packId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/[packId]/rules` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/policies/[packId]/rules/[ruleId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/admin/users/invite` | 401 (middleware) | Admin data | AUTH_REQUIRED | None |
| `/api/v1/config/repos/[repoId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/reviews` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/reviews/[reviewId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/metrics` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/providers` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/analytics/events` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/installations` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/repos` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/repos/[repoId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/repos/[repoId]/test-connection` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/test-runs` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/waivers` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/v1/waivers/[waiverId]` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/dashboard/runs` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/dashboard/prs` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/dashboard/policies` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/dashboard/metrics` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
| `/api/dashboard/findings` | 401 (middleware) | Private tenant data | AUTH_REQUIRED | None |
