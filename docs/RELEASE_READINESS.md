# Release Readiness Checklist

Pre-release validation for ReadyLayer v1.0.0

## Performance Validation

### Hot Paths Verified
- [ ] Webhook processor completes in <500ms (p95)
- [ ] Cache hit rate >80% for repository lookups
- [ ] Dashboard metrics load in <200ms
- [ ] PR diff processing <2s for typical PRs

### Benchmarks Run
```bash
npm run benchmark:webhook
npm run benchmark:cache
npm run benchmark:dashboard
```

## Feature Gating

### Core Features (Always Enabled)
- ✅ Review Guard - Security scanning
- ✅ Test Engine - Coverage analysis
- ✅ Doc Sync - Documentation validation
- ✅ Policy Engine - Deterministic evaluation
- ✅ Webhook Processing - Git provider integration

### Experimental Features (Gated)
- 🧪 AI Risk Index - Set `NEXT_PUBLIC_ENABLE_AI_RISK_INDEX=1`
- 🧪 Bundle Execution - Set `NEXT_PUBLIC_ENABLE_BUNDLE_EXECUTION=1`
- 🧪 RAG Context - Set `NEXT_PUBLIC_ENABLE_RAG_CONTEXT=1`
- 🧪 TruthCore Integration - Set `NEXT_PUBLIC_ENABLE_TRUTHCORE=1`

## Integration Health

### JobForge (Required)
- [ ] Migration applied: `npm run db:jobforge:migrate`
- [ ] Worker running: `npm run jobforge:worker`
- [ ] Smoke test passes: `npm run jobforge:smoke`

### TruthCore (Planned)
- 🔄 Integration planned for Q2 2026
- ✅ Local audit trail functional
- ✅ SHA-256 hashing for provenance

## CI Enforcement

### Merge Blockers
- ✅ Lint errors block merge
- ✅ Type errors block merge
- ✅ Unused exports block merge
- ✅ Test failures block merge
- ✅ Build failures block merge

### Verification Commands
```bash
npm run verify          # Full verification
npm run verify:fast     # Lint + types only
npm run verify:full     # Everything + build
```

## Documentation

### Updated
- ✅ README.md - Problem-focused messaging
- ✅ docs/PERFORMANCE.md - Hot paths documented
- ✅ docs/INTEGRATION.md - Service dependencies
- ✅ docs/jobforge.md - Background jobs

### Required Reading
- [Architecture](./architecture/README.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)

## Final Checks

### Pre-Release
- [ ] All tests passing
- [ ] No console errors in dev
- [ ] Build succeeds
- [ ] Environment variables documented
- [ ] Database migrations tested

### Release
- [ ] Tag version: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] GitHub Release notes
- [ ] Docker image published
- [ ] Documentation site updated

## Sign-Off

- [ ] Performance: _____________
- [ ] Features: _____________
- [ ] Integrations: _____________
- [ ] CI/CD: _____________
- [ ] Documentation: _____________

**Release Date**: _____________
**Released By**: _____________
