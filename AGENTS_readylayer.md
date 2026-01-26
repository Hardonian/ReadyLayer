# AGENTS.md — ReadyLayer

This file defines **hard constraints** for any code agent operating in this repository. Treat it as an execution contract.

## 0) Prime directive
- **Ship verified, production-ready improvements.**
- **No regressions** in auth, middleware, billing, or core workflows.
- **No hard 500s** on any route. Add graceful degradation.
- **Fix root causes**, don’t suppress errors.

## 1) Product identity (OSS-first, Cloud second)
ReadyLayer is **OSS-first**:
- Public marketing/docs pages must be accessible without sign-in.
- OSS clarity beats enterprise polish. Keep copy honest and specific.
- Cloud is a managed convenience layer, not the identity.

## 2) Stack assumptions
Unless this repo explicitly differs:
- **Next.js App Router**, **TypeScript**, **Tailwind**
- **shadcn/ui** for primitives
- **Supabase Postgres + RLS** for multi-tenant safety
- **Stripe** billing (Node runtime for webhooks; raw-body signature verification)
- Deployed on **Vercel**

## 3) Routing model (expected)
- `app/(marketing)/**` → public pages (SEO + CRO)
- `app/(app)/**` → authenticated product UI
- Middleware must never accidentally gate marketing routes.

## 4) Multi-tenant invariants
- **Tenant isolation is mandatory**:
  - RLS policies must enforce row ownership / tenant membership.
  - Server-side checks must validate workspace/tenant context.
- Never rely on client-only guards for access control.

## 5) Observability + error handling
- Prefer explicit error boundaries (`error.tsx`), `notFound.tsx`, and `loading.tsx`.
- Do not expose secrets in logs.
- Provide user-safe error messages with developer-friendly diagnostics in server logs.

## 6) Billing + entitlements
- Webhooks: Node runtime only; verify signatures with raw body.
- Feature access must be derived from server-verified entitlements, not client flags.
- Avoid breaking changes to billing states and upgrade/downgrade flows.

## 7) UI/UX and Stitch integrations
When integrating new UI exports (e.g., Stitch):
- Map routes intentionally to existing architecture.
- Reuse primitives; avoid duplicating design systems.
- Ensure mobile Chrome UX: drawer nav, focus trap, no scroll lock bugs.
- Maintain SEO for marketing routes: titles, descriptions, single H1 per page.

## 8) Quality gates (required)
Discover scripts from `package.json`. Typical:
1. Install: `pnpm install`
2. Lint: `pnpm lint`
3. Typecheck: `pnpm typecheck`
4. Tests: `pnpm test` (if present)
5. Build: `pnpm build`

Do not claim completion unless **lint + typecheck + build** are green.

## 9) Work method
- Start with **discovery** (read docs, inspect middleware/auth/billing touchpoints).
- Implement changes in **small batches**.
- Re-run gates frequently.
- Prefer minimal diffs and safe refactors.

## 10) Reporting requirements
When you finish, report:
- What changed and why
- Files changed (paths)
- Commands run + results
- Remaining risks / follow-ups

---
If repo-specific docs conflict with this file, repo-specific docs win. Otherwise, follow this contract.
