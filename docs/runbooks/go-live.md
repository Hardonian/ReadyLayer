# Production Go-Live Runbook

Use this runbook for a self-hosted release or a managed design-partner deployment. Replace every placeholder in the release
record before promotion.

## 1. Assign control

- Name the release commander, database owner, security approver, and rollback operator.
- Open a release record using the template in `docs/RELEASE_READINESS.md`.
- Freeze unrelated production changes for the agreed observation window.
- Confirm the latest acceptable rollback time and the authority who can call it.

## 2. Prove the candidate

From a clean checkout of the exact commit:

```bash
npm ci
npm run verify
npm run deps:check
npm audit --audit-level=high
```

Record the output and build the production image. Pin the resulting image by digest; do not promote a mutable tag alone.

## 3. Protect data

1. Capture a database backup and record its identifier.
2. Restore that backup into an isolated environment and run the database smoke test.
3. Review every schema and data migration for lock behavior, duration, retry safety, and rollback.
4. Confirm encryption keys and provider credentials are supplied through the approved secret store.
5. Confirm logs redact secrets before enabling production traffic.

Do not continue if the restore has not been proven.

## 4. Deploy dark

- Deploy the image with background workers paused or with ingress disabled.
- Confirm `GET /api/health` returns HTTP 200.
- Confirm `GET /api/ready` returns HTTP 200 before adding the instance to service.
- Run database, queue, provider, and evidence-export smoke checks.
- Compare the runtime configuration to `.env.production.example`; never print secret values.

## 5. Admit traffic gradually

Use the smallest supported traffic increment. At each step inspect:

- request error rate and latency;
- database saturation and query failures;
- queue depth, retry rate, and oldest job age;
- webhook signature, replay, and deduplication outcomes;
- evidence generation and export success;
- tenant-boundary authorization failures;
- memory, CPU, and instance restarts.

Pause progression when a signal deviates from the release's agreed threshold. Do not improvise a new threshold during the
incident.

## 6. Exercise one governed flow

Use a non-sensitive evaluation repository to:

1. submit a representative change;
2. observe the webhook and queue lifecycle;
3. inspect the policy version and evidence bundle;
4. exercise an approved waiver or rejection path;
5. export the evidence and verify it outside the primary UI.

Production is not live-ready until the end-to-end evidence path succeeds.

## 7. Roll back when required

Trigger rollback when a stop criterion is met, readiness remains unhealthy, tenant boundaries are uncertain, evidence is
missing or unverifiable, or the release commander cannot explain the observed state.

Follow `docs/runbooks/rollback.md`. Preserve logs and artifacts before terminating affected instances. If a migration is not
backward-compatible, stop traffic and use the rehearsed database recovery plan instead of guessing.

## 8. Close the release

- Record the final image digest, traffic state, verification artifacts, and decision.
- Resolve or assign every alert observed during the window.
- Remove temporary elevated access and release-only credentials.
- Document deviations and create dated follow-up work with owners.
- Update capability maturity or GTM copy only when the new evidence supports it.

## Abort conditions

Any of the following is an immediate no-go:

- a secret appears in output, logs, artifacts, or a committed file;
- tenant ownership cannot be established for a read or write;
- an invalid or replayed webhook can trigger work;
- a blocking decision lacks its policy version or evidence;
- the database restore or rollback path is unproven;
- readiness is green only because a check was bypassed or allowed to fail.
