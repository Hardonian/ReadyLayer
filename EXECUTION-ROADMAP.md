# EXECUTION ROADMAP
## 30/60/90 Day Plan Based on Reality Audit

**Date:** 2024-12-30  
**Status:** Ready for Execution

---

## PHASE 2: ARCHITECTURE HARDENING (Days 1-30)

### 2.1 Deterministic Core (Days 1-10)

**Goal:** Ensure rule-based baseline exists without AI.

**Tasks:**
1. **Separate deterministic and AI analysis** (`services/review-guard/index.ts`)
   - Create `analyzeDeterministic()` method (static analysis only)
   - Create `analyzeWithAI()` method (optional, advisory)
   - Update `review()` to run deterministic first, AI second

2. **Implement fallback logic**
   - If LLM fails: Log warning, continue with deterministic only
   - Never block PR on LLM failure
   - Return deterministic results + advisory AI results (if available)

3. **Add AnalysisMode enum**
   ```typescript
   enum AnalysisMode {
     DETERMINISTIC_ONLY = 'deterministic_only',
     AI_AUGMENTED = 'ai_augmented',  // Default: deterministic + advisory AI
     AI_ONLY = 'ai_only'  // Not recommended, but allowed
   }
   ```

**Verification:**
- ✅ PRs pass when LLM is unavailable (deterministic rules only)
- ✅ PRs blocked for critical security issues (deterministic rules)
- ✅ AI findings are advisory (non-blocking) by default

**Files to Modify:**
- `services/review-guard/index.ts`
- `services/review-guard/types.ts` (new)

---

### 2.2 CI & PR Flow Integrity (Days 11-20)

**Goal:** No hard 500s, graceful degradation, large PR handling.

**Tasks:**
1. **Add circuit breaker for LLM**
   - Track LLM failure rate
   - If failure rate > 50%: Disable AI analysis for 5 minutes
   - Log circuit breaker state

2. **Implement async LLM processing**
   - Move LLM calls to background job
   - Return deterministic results immediately
   - Update PR comment when AI analysis completes

3. **Add PR size limits**
   - Max 100 files per PR (configurable)
   - If exceeded: Sample files (top 100 by lines changed)
   - Log sampling decision

4. **Add timeout handling**
   - LLM timeout: 10 seconds (not 60)
   - If timeout: Fallback to deterministic, log warning

**Verification:**
- ✅ No PR waits > 30 seconds (P95)
- ✅ Large PRs (>100 files) processed without timeout
- ✅ Circuit breaker prevents cascade failures

**Files to Modify:**
- `services/review-guard/index.ts`
- `services/llm/index.ts`
- `workers/webhook-processor.ts`

---

### 2.3 Kill-Switch & Safe-Mode (Days 21-30)

**Goal:** Implement kill-switch and safe-mode controls.

**Tasks:**
1. **Add kill-switch to repository config**
   ```yaml
   # .readylayer.yml
   enforcement:
     enabled: true  # Kill-switch: set to false to disable all enforcement
     mode: 'ai_augmented'  # deterministic_only, ai_augmented, ai_only
     safe_mode: false  # If true: no LLM calls, deterministic only
   ```

2. **Implement kill-switch logic**
   - If `enabled: false`: All PRs pass (no analysis)
   - If `safe_mode: true`: No LLM calls, deterministic only
   - Log all kill-switch activations

3. **Add admin override**
   - Admin can override blocks (with justification)
   - Override logged in audit log
   - Override requires admin role

**Verification:**
- ✅ Kill-switch disables all enforcement
- ✅ Safe-mode disables LLM calls
- ✅ Admin override works with audit log

**Files to Modify:**
- `services/review-guard/index.ts`
- `services/config/index.ts`
- `lib/authz.ts` (add admin override)

---

## PHASE 3: SECURITY HARDENING (Days 31-60)

### 3.1 Secrets Redaction (Days 31-40)

**Goal:** Redact secrets before sending code to LLM.

**Tasks:**
1. **Implement secrets detection before LLM**
   - Run static analysis secrets rule first
   - Redact detected secrets before LLM call
   - Replace secrets with `[REDACTED]` placeholder

2. **Add metadata-only mode**
   - Option to send only file structure (no content)
   - Send: file path, function names, imports
   - Don't send: code content, strings, comments

3. **Add diff-only mode**
   - Option to send only changed lines (not full file)
   - Send: diff hunks, line numbers
   - Don't send: full file content

**Verification:**
- ✅ Secrets redacted before LLM call
- ✅ Metadata-only mode sends no code content
- ✅ Diff-only mode sends only changed lines

**Files to Modify:**
- `services/review-guard/index.ts`
- `services/static-analysis/index.ts` (move secrets detection earlier)

---

### 3.2 Data Flow Documentation (Days 41-50)

**Goal:** Produce first-class security artifacts.

**Tasks:**
1. **Create threat model**
   - Document assets (code, secrets, metadata)
   - Document threat actors (external attackers, malicious users)
   - Document attack vectors (LLM data leakage, webhook replay)

2. **Create data flow diagram**
   - Show: Code → Static Analysis → Secrets Redaction → LLM (optional)
   - Show: What never leaves repo (deterministic analysis)
   - Show: What leaves repo (LLM calls, metadata)

3. **Create "What Never Leaves Repo" guarantees**
   - Document: Deterministic analysis runs locally
   - Document: Secrets redacted before LLM
   - Document: Metadata-only mode available

**Verification:**
- ✅ Threat model reviewed by security team
- ✅ Data flow diagram shows all data paths
- ✅ "What never leaves repo" guarantees documented

**Files to Create:**
- `docs/security/threat-model.md`
- `docs/security/data-flow.md`
- `docs/security/data-residency.md`

---

### 3.3 Audit Logging (Days 51-60)

**Goal:** Comprehensive audit logging for compliance.

**Tasks:**
1. **Log all LLM interactions**
   - What code sent (redacted)
   - What LLM responded
   - Cost per request
   - Timestamp, organization ID

2. **Log all blocks and overrides**
   - Who blocked PR (system or admin)
   - What rule triggered block
   - Who overrode block (if applicable)
   - Justification for override

3. **Add audit log export**
   - CSV/JSON export for compliance
   - Filter by date, organization, action
   - Immutable (cannot delete)

**Verification:**
- ✅ All LLM interactions logged
- ✅ All blocks and overrides logged
- ✅ Audit log export works

**Files to Modify:**
- `services/llm/index.ts` (add logging)
- `services/review-guard/index.ts` (add logging)
- `app/api/v1/audit-logs/route.ts` (new)

---

## PHASE 4: METRICS & OBSERVABILITY (Days 61-75)

### 4.1 Trust Metrics (Days 61-70)

**Goal:** Implement instrumentation for trust-building metrics.

**Tasks:**
1. **Risk score per PR**
   - Calculate risk score (0-100) based on findings
   - Track risk score over time
   - Expose in API and dashboard

2. **False positive rate**
   - Track: Issues marked as false positive by developers
   - Calculate: False positive rate per rule
   - Expose in dashboard

3. **PR latency impact**
   - Track: Time from PR opened to ReadyLayer complete
   - Target: < 30 seconds (P95)
   - Expose in dashboard

4. **"Would-have-caught" retrospective**
   - Track: Production incidents that ReadyLayer would have caught
   - Compare: Issues found in PR vs. issues found in production
   - Expose in dashboard

**Verification:**
- ✅ Risk score calculated and exposed
- ✅ False positive rate tracked
- ✅ PR latency < 30 seconds (P95)
- ✅ Retrospective analysis available

**Files to Modify:**
- `observability/metrics.ts`
- `services/review-guard/index.ts` (add metrics)
- `app/dashboard/page.tsx` (add metrics display)

---

### 4.2 Observability Dashboard (Days 71-75)

**Goal:** Dashboard for DevOps teams.

**Tasks:**
1. **System health dashboard**
   - ReadyLayer uptime
   - LLM availability (circuit breaker state)
   - Queue depth
   - Error rate

2. **PR metrics dashboard**
   - PRs reviewed today
   - Average latency
   - Block rate
   - Top issues found

3. **Cost dashboard**
   - LLM costs per organization
   - Cost per PR
   - Budget usage

**Verification:**
- ✅ Dashboard shows system health
- ✅ Dashboard shows PR metrics
- ✅ Dashboard shows costs

**Files to Create:**
- `app/dashboard/metrics/page.tsx`
- `app/api/v1/metrics/route.ts`

---

## PHASE 5: PRICING & VALUE ALIGNMENT (Days 76-90)

### 5.1 Fixed Pricing Model (Days 76-80)

**Goal:** Align pricing with value and procurement expectations.

**Tasks:**
1. **Remove variable LLM costs**
   - Include LLM costs in fixed monthly price
   - Set LLM budget per tier (enforced at enforcement layer)
   - If budget exceeded: Graceful degradation (advisory-only mode)

2. **Update pricing tiers**
   - **Starter:** $99/month (5 repos, 1,000 PRs/month, $50 LLM budget)
   - **Growth:** $299/month (25 repos, 5,000 PRs/month, $500 LLM budget)
   - **Scale:** Custom (unlimited repos, unlimited PRs, $5,000 LLM budget)

3. **Add ROI calculator**
   - Input: PRs/month, review time per PR
   - Output: Hours saved, cost savings
   - Show: ROI compared to human review

**Verification:**
- ✅ Pricing is fixed (no variable costs)
- ✅ LLM budget enforced at enforcement layer
- ✅ ROI calculator works

**Files to Modify:**
- `product/pricing.md`
- `lib/billing-middleware.ts`
- `app/pricing/page.tsx` (add ROI calculator)

---

### 5.2 Value Alignment (Days 81-90)

**Goal:** Map pricing to value delivered.

**Tasks:**
1. **Map pricing to CI cost**
   - Show: ReadyLayer replaces CI security scanning ($100-500/month)
   - Show: ReadyLayer replaces manual review ($4,000-8,000/month)
   - Show: ReadyLayer total cost ($99-299/month)

2. **Map pricing to incident prevention**
   - Show: Average cost of production incident ($10,000-50,000)
   - Show: ReadyLayer prevents X incidents per month
   - Show: Cost savings from prevented incidents

3. **Map pricing to review hours saved**
   - Show: 2-4 hours per PR × PRs/month = hours saved
   - Show: Hours saved × engineer cost = cost savings
   - Show: ReadyLayer cost vs. cost savings

**Verification:**
- ✅ Pricing mapped to CI cost
- ✅ Pricing mapped to incident prevention
- ✅ Pricing mapped to review hours saved

**Files to Modify:**
- `product/pricing.md`
- `gtm/landing-copy.md`

---

## PHASE 6: GTM REALITY RESET (Days 91-105)

### 6.1 Homepage Narrative Rewrite (Days 91-95)

**Goal:** Rewrite positioning to answer "what nightmare does this prevent?"

**New Homepage Copy:**

> **Prevent AI-Generated Bugs from Reaching Production**
>
> ReadyLayer is a CI/CD security gate that blocks AI-generated code until deterministic security rules pass. It catches SQL injection, secrets, and AI hallucinations before they ship.
>
> **What Nightmare Does This Prevent?**
> - Production bugs from AI hallucinations (non-existent API calls)
> - Security incidents from AI-generated vulnerabilities (SQL injection, secrets)
> - Hours of debugging production issues
>
> **What Breaks Without It?**
> - AI coding tools (Copilot, Cursor) generate code that looks correct but contains bugs
> - Human reviewers miss AI-specific issues (hallucinations, missing error handling)
> - Static analysis doesn't catch AI hallucinations (code is syntactically correct)
>
> **Who Is Accountable?**
> - ReadyLayer blocks PRs for security issues (deterministic rules)
> - Developers fix issues before merge
> - Engineering managers see prevented incidents in dashboard

**Verification:**
- ✅ Homepage answers "what nightmare does this prevent?"
- ✅ Homepage answers "what breaks without it?"
- ✅ Homepage answers "who is accountable?"

**Files to Modify:**
- `app/page.tsx`
- `gtm/landing-copy.md`

---

### 6.2 Case Study (Days 96-100)

**Goal:** One concrete case study (even internal/dogfood).

**Tasks:**
1. **Apply ReadyLayer to its own repo**
   - Enable ReadyLayer on ReadyLayer repo
   - Document what it catches
   - Document what it misses

2. **Create case study**
   - Title: "How ReadyLayer Caught 15 Security Issues in Its Own Codebase"
   - Content: Issues found, fixes applied, incidents prevented
   - Metrics: PRs reviewed, issues found, false positives

**Verification:**
- ✅ ReadyLayer applied to its own repo
- ✅ Case study published
- ✅ Metrics tracked

**Files to Create:**
- `docs/case-studies/self-dogfood.md`

---

### 6.3 "Why Now" Framing (Days 101-105)

**Goal:** Clear "why now" narrative.

**New "Why Now" Copy:**

> **Why ReadyLayer Now?**
>
> AI coding tools (Copilot, Cursor) exploded in 2024. Teams are shipping code faster, but also shipping more bugs. ReadyLayer is the safety net that catches AI-specific issues before they reach production.
>
> **What Changed:**
> - AI coding tool adoption: 10% → 50% of developers (2024)
> - AI-generated code: 20% → 60% of PRs (2024)
> - Production incidents from AI code: 5% → 30% (2024)
>
> **Why Existing Tools Don't Work:**
> - Human reviewers: Don't know if AI-generated API calls exist
> - Static analysis: Doesn't catch hallucinations (code is syntactically correct)
> - Security scanners: Don't catch AI-specific issues
>
> **ReadyLayer's Unique Value:**
> - Deterministic rules: Catch security issues (SQL injection, secrets)
> - AI augmentation: Catch hallucinations (non-existent APIs)
> - Blocks PRs: Prevents bugs from reaching production

**Verification:**
- ✅ "Why now" narrative clear
- ✅ Data points cited
- ✅ Differentiation clear

**Files to Modify:**
- `gtm/landing-copy.md`
- `docs/PITCH.md`

---

## PHASE 7: DOGFOOD & PROOF (Days 106-120)

### 7.1 Apply ReadyLayer to Its Own Repo (Days 106-110)

**Goal:** Trust requires visible constraint.

**Tasks:**
1. **Enable ReadyLayer on ReadyLayer repo**
   - Configure enforcement mode: `ai_augmented`
   - Enable all deterministic rules
   - Enable advisory AI analysis

2. **Document findings**
   - What ReadyLayer catches
   - What ReadyLayer misses
   - False positive rate

3. **Publish findings**
   - Blog post: "ReadyLayer on ReadyLayer"
   - Dashboard: Public metrics
   - Case study: Issues found and fixed

**Verification:**
- ✅ ReadyLayer enabled on its own repo
- ✅ Findings documented
- ✅ Findings published

**Files to Create:**
- `docs/case-studies/self-dogfood.md`
- `app/public-metrics/page.tsx` (public dashboard)

---

### 7.2 Iteration & Improvement (Days 111-120)

**Goal:** Show iteration based on findings.

**Tasks:**
1. **Fix issues found**
   - Apply fixes for issues ReadyLayer found
   - Document fixes

2. **Improve rules**
   - Reduce false positives
   - Add rules for issues ReadyLayer missed

3. **Publish iteration**
   - Blog post: "How ReadyLayer Improved Itself"
   - Dashboard: Show improvement over time

**Verification:**
- ✅ Issues fixed
- ✅ Rules improved
- ✅ Iteration published

**Files to Modify:**
- `docs/case-studies/self-dogfood.md`
- `services/static-analysis/index.ts` (improve rules)

---

## VERIFICATION CRITERIA

### Phase 2 Verification

- ✅ PRs pass when LLM unavailable (deterministic rules only)
- ✅ No PR waits > 30 seconds (P95)
- ✅ Kill-switch disables all enforcement
- ✅ Safe-mode disables LLM calls

### Phase 3 Verification

- ✅ Secrets redacted before LLM call
- ✅ Threat model reviewed by security team
- ✅ All LLM interactions logged

### Phase 4 Verification

- ✅ Risk score calculated and exposed
- ✅ False positive rate tracked
- ✅ Dashboard shows system health

### Phase 5 Verification

- ✅ Pricing is fixed (no variable costs)
- ✅ ROI calculator works

### Phase 6 Verification

- ✅ Homepage answers "what nightmare does this prevent?"
- ✅ Case study published
- ✅ "Why now" narrative clear

### Phase 7 Verification

- ✅ ReadyLayer enabled on its own repo
- ✅ Findings published
- ✅ Iteration documented

---

## RISK MITIGATION

### High Risk Items

1. **LLM API changes** → Mitigation: Abstract LLM provider, support multiple providers
2. **False positive rate too high** → Mitigation: Tune rules, track false positives
3. **Performance issues** → Mitigation: Async processing, caching, limits

### Medium Risk Items

1. **SOC2 certification timeline** → Mitigation: Be honest about timeline, focus on controls
2. **Competitive response** → Mitigation: Focus on wedge, iterate quickly
3. **Adoption slower than expected** → Mitigation: Focus on ICP, prove ROI

---

## SUCCESS METRICS

### 30 Days
- ✅ Deterministic fallback working
- ✅ Kill-switch implemented
- ✅ Secrets redacted before LLM

### 60 Days
- ✅ Threat model complete
- ✅ Audit logging complete
- ✅ Metrics dashboard live

### 90 Days
- ✅ Fixed pricing model
- ✅ Case study published
- ✅ ReadyLayer dogfooded

### 120 Days
- ✅ 10 paying customers
- ✅ False positive rate < 5%
- ✅ PR latency < 30 seconds (P95)

---

**End of Execution Roadmap**
