# Release Readiness Checklist

This checklist is a gate, not a status claim. Check an item only in the release record that contains the command output,
owner, timestamp, environment, and artifact link.

## Source gate

```bash
npm ci
npm run verify:fast
npm run deps:check
npm audit --audit-level=high
npm test
npm run verify:docs
npm run build
```

- [ ] The commands above pass from a clean checkout on Node.js 24.
- [ ] No dependency vulnerability at the configured audit threshold is accepted without a dated risk record.
- [ ] Claim verification passes for public and GTM surfaces.
- [ ] Generated, local-cache, secret, and environment files are absent from the diff.

## Database and tenant gate

- [ ] The target schema is backed up and the restore path is tested.
- [ ] Forward and rollback migration steps are recorded.
- [ ] `REQUIRE_DATABASE_TESTS=true npm run test:tenant-isolation` passes against an isolated database.
- [ ] `npm run db:verify` and `npm run db:smoke` pass against the release candidate environment.
- [ ] RLS and application-level membership checks are both verified; one is not treated as proof of the other.

## Runtime gate

- [ ] The release image is built from the committed Dockerfile.
- [ ] `/api/health` returns process liveness without depending on Postgres, Redis, or external providers.
- [ ] `/api/ready` returns 200 only when required configuration, database/schema, optional configured Redis, and encryption
      key checks are ready.
- [ ] The worker, webhook, queue, and evidence-export smoke paths pass in the target topology.
- [ ] Logs and traces contain correlation IDs and no tokens, provider payload secrets, or source-code fragments outside policy.

## Failure gate

- [ ] Database loss, Redis loss, provider timeout, invalid webhook signature, duplicate delivery, and worker retry are tested.
- [ ] Each dependency has an explicit fail-open or fail-closed decision.
- [ ] Dead-letter redrive is tested without duplicate side effects.
- [ ] Rollback is rehearsed using [the rollback runbook](./runbooks/rollback.md).
- [ ] Incident roles and escalation paths are confirmed using [the incident runbook](./runbooks/incident-response.md).

## Product and GTM gate

- [ ] Public capability maturity matches `lib/product/capability-catalog.ts`.
- [ ] Screenshots and demos use deterministic fixtures and contain no customer data.
- [ ] Pricing, trial, support, service-level, hosting, and certification language matches an approved active offer.
- [ ] No invented testimonials, logos, adoption counters, or outcome metrics appear in launch material.
- [ ] The evaluation path, support address, security policy, privacy policy, terms, and installation links resolve.

## Browser gate

- [ ] Functional Playwright tests pass in Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari.
- [ ] The committed desktop visual baseline passes without regenerating snapshots inside the assertion job.
- [ ] Any baseline update is reviewed as an artifact of the same commit that changed the UI.
- [ ] Keyboard navigation, visible focus, reduced motion, and primary responsive breakpoints are manually checked.

## Release record

| Field | Value |
|---|---|
| Commit | |
| Image digest | |
| Environment | |
| Release owner | |
| Database owner | |
| Security approver | |
| Verification artifact | |
| Backup / restore evidence | |
| Rollback decision deadline | |
| Known accepted risks | |
| Final decision | GO / NO-GO |

Follow [the go-live runbook](./runbooks/go-live.md) for sequencing, observation, and rollback.
