# Git Provider Co-Option + UI/UX + Metrics Roadmap

## Overview

This roadmap implements "native PR presence" (provider UI integration) and ReadyLayer's differentiators (policy gates, proof dashboards, token metering) across GitHub, GitLab, and Bitbucket.

---

## Phase 1: Native PR Presence (MUST SHIP) ✅

**Goal:** Users see ReadyLayer results inside PRs/MRs without leaving the provider UI.

### Completed ✅

1. **Provider Capability Matrix** ✅
   - Documented GitHub, GitLab, Bitbucket capabilities
   - Inbound: PR/MR metadata, reviews/approvals, status checks, pipelines
   - Outbound: Status checks, check runs, comments
   - Constraints: Rate limits, permissions, fork behaviors
   - Location: `docs/PROVIDER-CAPABILITY-MATRIX.md`

2. **Native PR Presence Implementation** ✅
   - Created `services/provider-status/index.ts` to post status updates
   - Integrated into `services/run-pipeline/index.ts` to post during each stage
   - Updated `workers/webhook-processor.ts` to use run pipeline service
   - Status updates posted for:
     - Review Guard (in_progress → completed)
     - Test Engine (in_progress → completed)
     - Doc Sync (in_progress → completed)
     - Final run completion (aggregated summary)

3. **Provider-Specific Implementation** ✅
   - **GitHub:** Check Runs + Commit Status (for branch protection)
   - **GitLab:** Commit Status (external pipeline status)
   - **Bitbucket:** Build Status
   - All providers support:
     - Deep links to ReadyLayer run detail page
     - Idempotent updates (reruns don't duplicate)
     - Annotations (up to 50 for GitHub, summary for others)

### Verification Steps

- [ ] Connect one repo per provider (or use sandbox fixtures)
- [ ] Open a PR/MR
- [ ] Trigger ReadyLayer run (via webhook or manual)
- [ ] Confirm provider UI shows:
  - Status/check updates during each stage
  - Deep link to ReadyLayer run detail page
  - Final aggregated summary
- [ ] Confirm rerunning does not duplicate status/checks

---

## Phase 2: ReadyLayer UI/UX Components

**Goal:** Build UI surfaces that add value beyond provider-native checks.

### 2.1 Repo Connection Screen

**Status:** Pending

**Requirements:**
- List installed providers (GitHub/GitLab/Bitbucket)
- Show installed repos per provider
- Display permissions health (missing scopes, expired tokens)
- "Test connection" button to verify API access
- Provider-specific installation flows

**Files to Create/Update:**
- `app/dashboard/repos/connect/page.tsx` (enhance existing)
- `app/api/v1/config/repos/[repoId]/route.ts` (add test connection endpoint)

**Acceptance Criteria:**
- [ ] User can see all connected providers
- [ ] User can see all installed repos with status
- [ ] User can test connection and see result
- [ ] User can see missing permissions warnings

### 2.2 Runs Dashboard

**Status:** Partial (exists, needs enhancement)

**Requirements:**
- Filter by: repo, branch, author, stage, status, time range
- Show: run status, stage timeline, correlation ID, provider link
- Sort by: created date, status, conclusion
- Pagination

**Files to Update:**
- `app/dashboard/runs/page.tsx` (enhance existing)
- `app/api/v1/runs/route.ts` (add filters)

**Acceptance Criteria:**
- [ ] User can filter runs by all criteria
- [ ] User can see provider link (opens PR/MR in provider UI)
- [ ] User can see stage timeline visualization
- [ ] User can sort and paginate results

### 2.3 Run Detail View

**Status:** Partial (exists, needs enhancement)

**Requirements:**
- Stage timeline (Review Guard, Test Engine, Doc Sync)
- Findings list with severity, file/line refs
- Artifacts: report outputs, generated docs/tests
- Audit log: run created, stage start/end, gate pass/fail
- Provider link (deep link to PR/MR)

**Files to Update:**
- `app/dashboard/runs/[runId]/page.tsx` (enhance existing)
- `app/api/v1/runs/[runId]/route.ts` (add findings, artifacts, audit log)

**Acceptance Criteria:**
- [ ] User can see all stage details
- [ ] User can see findings with file/line links
- [ ] User can download artifacts
- [ ] User can see audit log
- [ ] User can navigate to provider PR/MR

### 2.4 Policy Gates UI

**Status:** Pending

**Requirements:**
- Templates: "AI-touched diffs require X", "Critical issues block merge", etc.
- Enforcement mode: warn vs block
- Exceptions: repo allowlist, branch allowlist, emergency bypass with audit reason
- Policy editor with YAML/JSON support

**Files to Create:**
- `app/dashboard/policies/gates/page.tsx` (new)
- `app/api/v1/policies/gates/route.ts` (new)

**Acceptance Criteria:**
- [ ] User can create policy gates from templates
- [ ] User can configure enforcement mode
- [ ] User can add exceptions with audit trail
- [ ] User can see gate evaluation results in run detail

---

## Phase 3: Metrics Dashboard

**Goal:** Provide provider-pulled and ReadyLayer-native metrics.

### 3.1 Provider-Pulled Metrics

**Status:** Pending

**Metrics to Collect:**
- PR/MR cycle time (open → merge)
- Review latency (open → first review)
- Approvals count
- Pipeline pass/fail rate

**Files to Create:**
- `app/dashboard/metrics/provider/page.tsx` (new)
- `app/api/v1/metrics/provider/route.ts` (new)
- `services/metrics/provider/index.ts` (new)

**Acceptance Criteria:**
- [ ] User can see PR/MR cycle time trends
- [ ] User can see review latency trends
- [ ] User can see pipeline pass/fail rates
- [ ] Metrics are aggregated by repo, branch, time period

### 3.2 ReadyLayer-Native Metrics

**Status:** Pending

**Metrics to Collect:**
- Runs/day, stage duration p95, finding counts by type/severity
- Gate block rate, override rate, rerun rate
- Flaky test rate (if detectable)

**Files to Create:**
- `app/dashboard/metrics/readylayer/page.tsx` (new)
- `app/api/v1/metrics/readylayer/route.ts` (new)

**Acceptance Criteria:**
- [ ] User can see runs/day trends
- [ ] User can see stage duration percentiles
- [ ] User can see finding counts by severity
- [ ] User can see gate block/override rates

### 3.3 Proof Metrics Tiles

**Status:** Pending

**Tiles to Display:**
- "Blocked risky merges" (count + trend)
- "Docs kept in sync" (drift detection rate)
- "Tests generated" (count + coverage improvement)
- "Time-to-signal" (first result time)

**Files to Create:**
- `app/dashboard/metrics/proof/page.tsx` (new)
- `components/metrics/ProofMetricsTiles.tsx` (new)

**Acceptance Criteria:**
- [ ] User can see proof metrics on dashboard
- [ ] Metrics show trends (up/down indicators)
- [ ] Metrics link to detailed views

---

## Phase 4: Token Usage + Monetization

**Goal:** Implement per-run/per-stage usage accounting with budgets and add-on packs.

### 4.1 Token Usage Accounting

**Status:** Pending

**Requirements:**
- Track tokens in/out per run/stage
- Track latency, cost estimate
- Track artifact counts (tests generated, doc sections updated)
- Store in `TokenUsage` model (already exists)

**Files to Create/Update:**
- `services/usage-accounting/index.ts` (new)
- `services/run-pipeline/index.ts` (integrate usage tracking)
- `app/api/v1/usage/route.ts` (enhance existing)

**Acceptance Criteria:**
- [ ] Token usage tracked per run/stage
- [ ] Cost estimates calculated per run/stage
- [ ] Artifact counts tracked
- [ ] Usage visible in run detail view

### 4.2 Budget System

**Status:** Pending

**Requirements:**
- Org monthly cap, repo cap, stage caps
- Degraded mode: if cap reached, skip AI and run deterministic checks only
- Budget alerts (80%, 100%)
- Budget reset (monthly, daily)

**Files to Create:**
- `services/budget/index.ts` (new)
- `app/dashboard/billing/budgets/page.tsx` (new)
- `app/api/v1/billing/budgets/route.ts` (new)

**Acceptance Criteria:**
- [ ] User can set org/repo/stage budgets
- [ ] System enforces budgets (degraded mode)
- [ ] User receives budget alerts
- [ ] Budgets reset automatically

### 4.3 Add-On Packs

**Status:** Pending

**Requirements:**
- Feature flags: Test Engine+, Doc Sync+, Review Guard+
- Server-side gating (auditable)
- Add-on activation/deactivation

**Files to Create:**
- `services/addons/index.ts` (new)
- `app/dashboard/billing/addons/page.tsx` (new)
- `app/api/v1/billing/addons/route.ts` (new)

**Acceptance Criteria:**
- [ ] User can activate/deactivate add-ons
- [ ] Add-ons are gated server-side
- [ ] Add-on usage is auditable
- [ ] Add-ons appear in billing

---

## Phase 5: Security + Permissions

**Goal:** Ensure secure webhook handling, token storage, and rate limiting.

### 5.1 Webhook Signature Validation

**Status:** Partial (exists, needs audit)

**Requirements:**
- GitHub: HMAC-SHA256 validation ✅
- GitLab: Token-based validation ✅
- Bitbucket: HMAC-SHA256 validation ✅
- Audit all webhook routes

**Files to Audit:**
- `app/api/webhooks/github/route.ts`
- `app/api/webhooks/gitlab/route.ts`
- `app/api/webhooks/bitbucket/route.ts`

**Acceptance Criteria:**
- [ ] All webhook routes validate signatures/tokens
- [ ] Invalid signatures are rejected with 401
- [ ] Validation failures are logged

### 5.2 Token Storage Security

**Status:** Partial (encryption exists, needs audit)

**Requirements:**
- Tokens encrypted at rest ✅
- Tokens never logged ✅
- Token rotation support ✅
- Audit token access

**Files to Audit:**
- `lib/secrets/installation-helpers.ts`
- `lib/crypto/index.ts`

**Acceptance Criteria:**
- [ ] All tokens encrypted at rest
- [ ] No tokens in logs
- [ ] Token rotation works
- [ ] Token access is auditable

### 5.3 Rate Limiting

**Status:** Pending

**Requirements:**
- Rate limit inbound webhook processing
- Rate limit expensive endpoints (runs, reviews)
- Per-org rate limits
- Rate limit headers in responses

**Files to Create:**
- `lib/rate-limiting/index.ts` (new)
- `middleware.ts` (add rate limiting)

**Acceptance Criteria:**
- [ ] Webhook processing is rate limited
- [ ] Expensive endpoints are rate limited
- [ ] Rate limit headers in responses
- [ ] Rate limit violations are logged

### 5.4 Tenant Isolation

**Status:** Partial (exists, needs audit)

**Requirements:**
- All provider data models enforce tenant isolation ✅
- All API routes enforce tenant isolation ✅
- Audit all data access

**Files to Audit:**
- All API routes in `app/api/v1/`
- All service methods

**Acceptance Criteria:**
- [ ] All data access is tenant-isolated
- [ ] Cross-tenant access is prevented
- [ ] Tenant isolation violations are logged

---

## Implementation Status

### Completed ✅
- Provider capability matrix documentation
- Native PR presence (status updates during run stages)
- Provider status service
- Run pipeline integration with status updates
- Webhook processor using run pipeline service

### In Progress 🚧
- None

### Pending ⏳
- Repo Connection UI screen
- Runs dashboard enhancements
- Run detail view enhancements
- Policy Gates UI
- Metrics dashboard (provider-pulled + ReadyLayer-native)
- Token usage accounting
- Budget system
- Add-on packs
- Rate limiting
- Security audit

---

## Next Steps

1. **Immediate (Week 1):**
   - Complete Phase 1 verification
   - Enhance Runs dashboard with filters
   - Enhance Run detail view with findings/artifacts/audit log

2. **Short-term (Week 2-3):**
   - Build Repo Connection UI screen
   - Build Policy Gates UI
   - Implement token usage accounting

3. **Medium-term (Week 4-6):**
   - Build metrics dashboard
   - Implement budget system
   - Implement add-on packs

4. **Long-term (Week 7+):**
   - Security audit
   - Rate limiting
   - Performance optimization

---

## Verification Checklist

### End-to-End Demo

1. **Connect repo** ✅
   - [ ] User connects GitHub/GitLab/Bitbucket repo
   - [ ] Installation succeeds
   - [ ] Webhook configured

2. **Open PR/MR** ✅
   - [ ] User opens PR/MR
   - [ ] Webhook received
   - [ ] Run created

3. **ReadyLayer posts status/check** ✅
   - [ ] Status updates appear in provider UI during each stage
   - [ ] Deep link works (navigates to ReadyLayer run page)
   - [ ] Final aggregated summary appears

4. **ReadyLayer run page shows details** ✅
   - [ ] Stage timeline visible
   - [ ] Findings list visible
   - [ ] Artifacts visible (if any)
   - [ ] Audit log visible

5. **Rerun is idempotent** ✅
   - [ ] Rerunning doesn't create duplicate status/checks
   - [ ] Status updates correctly

### Production Readiness

- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Production build passes
- [ ] All TODOs resolved
- [ ] No placeholders
- [ ] All features wired end-to-end
