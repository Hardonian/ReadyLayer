# ReadyLayer Activation Guide

## Quick Start: First Proof in 60 Seconds

### Option 1: Demo Mode (No Setup Required)

1. **Visit Sandbox Demo**: Navigate to `/dashboard/runs/sandbox`
2. **Click "Start Sandbox Demo"**: One-click trigger, no OAuth required
3. **View Results**: See complete pipeline execution with findings, artifacts, and audit trail

### Option 2: Connect Repository

1. **Sign Up/In**: Create account or sign in
2. **Connect Repository**: Go to `/dashboard/repos/connect`
3. **Authorize Git Provider**: Grant ReadyLayer access
4. **Trigger Run**: Create a PR or manually trigger a run
5. **View Results**: See status checks in your PR and in ReadyLayer dashboard

---

## Golden Path Test

Run the deterministic golden path test to verify the entire activation flow:

```bash
npm run test:golden-path
```

This test validates:
- ✅ Sandbox run creation
- ✅ Stage progression
- ✅ Output persistence
- ✅ Outbox intent creation
- ✅ API contract compliance
- ✅ Idempotency guarantees

---

## Quality Gates

Run the doctor script to verify all quality gates:

```bash
npm run doctor
```

This runs:
1. Lint check
2. Type check
3. Prisma schema validation
4. Production build
5. Golden path test

---

## Demo Mode Features

- **Always Works**: No OAuth or provider setup required
- **Deterministic**: Same inputs produce same outputs
- **Safe**: Cannot access real repos or leak secrets
- **Complete**: Runs full pipeline (Review Guard → Test Engine → Doc Sync)

---

## First Proof Checklist

After triggering a run, verify:

1. ✅ **Run Created**: Run record exists in database
2. ✅ **Stages Complete**: All stages progressed (pending → running → succeeded/failed)
3. ✅ **Findings Available**: Review Guard found issues (if any)
4. ✅ **Artifacts Available**: Test Engine and Doc Sync produced outputs
5. ✅ **Audit Events Recorded**: Audit log entries created with correlation ID

---

## Troubleshooting

### Run Fails Immediately

- Check error message in run details
- Verify database connection
- Check service logs

### Stages Don't Progress

- Verify files are provided in trigger metadata
- Check service availability
- Review audit logs for errors

### No Findings

- Verify code files contain detectable issues
- Check Review Guard configuration
- Review policy pack settings

---

## Architecture

### Outbox Pattern

Provider status updates use the Outbox pattern for reliability:
- Status updates recorded in `OutboxIntent` table
- Worker processes intents asynchronously
- Idempotency keys prevent duplicate posts
- Retry mechanism handles transient failures

### Contract Gates

All critical endpoints validate request/response schemas:
- Request validation on input
- Response validation in tests
- Schema changes break tests (fail loudly)

### Idempotency

- Same trigger creates new run (not duplicate)
- Outbox intents use idempotency keys
- Reruns don't duplicate side effects

---

## Support

For issues or questions:
- Check run details for error messages
- Review audit logs for debugging
- Contact support: support@readylayer.dev
