# ReadyLayer dependency/security closure

- Audit timestamp (UTC): 2026-07-26T02:54:36Z (rerun after commit at closure)
- Authoritative package manager: npm. CI uses `npm ci` and `actions/setup-node` with `cache: npm`; no workflow uses pnpm. The staged removal of `pnpm-lock.yaml` is consistent with CI.
- Install verification: `corepack npm ci` passed (674 packages added; Prisma Client generated).
- Direct updates: `vitest` `^4.0.17` -> `^4.1.10`; `next`, `@next/eslint-plugin-next`, `eslint-config-next` `^16.1.5` -> `^16.2.12`; `js-yaml` `^4.1.0` -> `^5.2.2`. Lockfile refreshed compatible transitive resolutions, including `postcss` `^8.5.18` and `sharp` `^0.35.0`.

## npm audit

Raw JSON: `audit-logs/npm-audit.json`; stderr: `audit-logs/npm-audit.stderr`.

Exact metadata counts: `info=0, low=2, moderate=2, high=8, critical=0, total=12`.

Remaining high findings are transitive (`brace-expansion`, `flatted`, `minimatch`, `picomatch`, `postcss`, `sharp`, `ws`) plus direct `next`. npm reports the `next` remediation as `next@9.3.3` with `isSemVerMajor: true`, not a safe upgrade path for this Next 16 application. No unsafe override or forced major migration was applied; the Next advisory needs a separate migration/advisory review against the eventual patched release line.

## Verification

- Evidence endpoint targeted test: PASS — 1 file, 2 tests.
- `npm run lint -- --max-warnings=0`: PASS.
- `npm run type-check`: PASS after aligning the Stripe API version with the installed SDK in `services/billing/stripe-webhook-handler.ts`.
- Full `npm test`: PASS; Vitest emitted expected negative-path invariant logs and one non-fatal mock-hoisting warning.
