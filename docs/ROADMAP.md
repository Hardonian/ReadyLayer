# READY LAYER: TECHNICAL ROADMAP
**Status:** Living Document
**Owner:** Principal Engineering Team

## Phase 1: Credibility Lock (Current Sprint)
**Goal:** Make the "high assurance" claims technically true.

| Epic | Task | Severity | Status |
|------|------|----------|--------|
| **Audit Hardening** | Add `hash`, `previousHash` to `AuditLog` schema | P0 | Pending |
| **Audit Hardening** | Implement cryptographic chaining in `lib/audit.ts` | P0 | Pending |
| **Evidence Layer** | Implement `EvidenceBundle` ZIP export endpoint | P0 | Pending |
| **Verification** | Add Tenant Isolation Smoke Test Suite | P0 | Pending |
| **Quality** | Fix all Lint/Type errors to ensure clean build | P0 | Pending |

## Phase 2: Trust & Evidence (Next Sprint)
**Goal:** Make the proofs visible and useful to users.

| Epic | Task | Severity | Status |
|------|------|----------|--------|
| **UX/UI** | "Verify Proof" page in Dashboard (uploads ZIP -> validates hash) | P1 | Planned |
| **Integrations** | "Verified by ReadyLayer" badge in GitHub PR comments | P1 | Planned |
| **Billing** | Real-time budget enforcement middleware | P1 | Planned |

## Phase 3: Acceleration (Future)
- IDE Plugins (VS Code / JetBrains)
- Enterprise SSO (SAML/OIDC)
- Self-Hosted Runners

---
## Gate Definitions (Canonical)

### 1. Review Guard
- **Input:** Diff, File List
- **Logic:** Static Analysis + AI Review
- **Output:** Findings List + Blocking Decision

### 2. Test Engine
- **Input:** Diff, Coverage Report
- **Logic:** Coverage < Threshold ? Block : Pass
- **Output:** Test Generation + Coverage Badge

### 3. Doc Sync
- **Input:** OpenAPI Spec vs Code
- **Logic:** Drift Detected ? Block : Pass
- **Output:** Updated Spec + Drift Report
