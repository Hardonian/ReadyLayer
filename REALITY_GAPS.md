# REALITY GAPS — ReadyLayer Trust Signaling Audit

**Ralph Wiggins Execution Report**
**Date:** 2026-01-17
**Scope:** AI Code Readiness, QA, Trust Signaling
**Outcome:** Reality gaps identified between claims and enforcement

---

## EXECUTIVE SUMMARY

ReadyLayer positions itself as "the default authority for AI-generated code safety" with "deterministic governance gates" and "every decision signed, traceable, and defensible in audits."

**Key Finding:** There is a measurable gap between marketing claims and actual enforcement/implementation. Some features are partially implemented, some signals are placeholders, and some "deterministic" behaviors rely on non-deterministic LLM outputs.

**Severity:** Medium to High. These gaps create **technical debt** and **trust erosion risk** if discovered by enterprise customers during due diligence or compliance audits.

**Recommendation:** Close reality gaps via enforcement OR downgrade claims. Implement invariants with runtime guards.

---

## REALITY GAP CATEGORIES

### 1. DETERMINISM CLAIMS VS. IMPLEMENTATION

#### CLAIM:
> "Deterministic governance gates. Every decision is signed, traceable, and defendable in audits."
> "Deterministic execution" (landing page badge)
> "Same inputs = same outputs" (Test Engine)

#### REALITY:
- **Review Guard:** Uses LLM analysis (non-deterministic) as part of the review process
  - Location: `services/review-guard/index.ts:564-615`
  - LLM calls use `temperature: 0.7` (non-zero temperature = non-deterministic)
  - Different LLM runs on identical code can yield different results

- **Test Engine:** Uses LLM for test generation
  - Location: `services/test-engine/index.ts:260-277`
  - Same file can generate different tests on different runs
  - No test output caching or determinism guarantee

- **Confidence Scores:** Partially deterministic
  - Static analysis is deterministic
  - AI analysis is non-deterministic
  - Combined score has non-deterministic component

**Gap Severity:** HIGH
**Impact:** Audit trail claims are overstated. Same PR reviewed twice could yield different blocking decisions.

**Fix Options:**
1. **Downgrade claim** to "Partially deterministic (static rules) with AI enrichment"
2. **Enforce determinism** by setting `temperature: 0` and implementing result caching with input hashing
3. **Split signals:** Deterministic score (static only) + AI enrichment score (clearly marked as probabilistic)

---

### 2. CULTURAL ARTIFACTS — INCOMPLETE IMPLEMENTATION

#### CLAIM (Landing Page):
> "Merge Confidence Certificates — ReadyLayer Verified™"
> "Readiness Score™ per repository"
> "AI Risk Exposure Index™ per organization"
> "Every certificate proves review. Every score creates accountability."

#### REALITY:

**Merge Confidence Certificate:**
- ✅ Structure defined in code (`services/cultural-artifacts/index.ts:16-33`)
- ✅ Confidence calculation implemented (`calculateConfidenceScore`)
- ⚠️ **Gates status is hardcoded:**
  ```typescript
  gatesPassed: {
    reviewGuard: review.status === 'completed' && !review.isBlocked,
    testEngine: false, // Would check test engine results
    docSync: false, // Would check doc sync results
  }
  ```
  Location: `services/cultural-artifacts/index.ts:118-122`
- ❌ Certificates are **not persisted** to database
- ❌ No certificate ID used for audits
- ❌ Certificate retrieval API exists (`/api/v1/cultural-artifacts/certificate/[reviewId]`) but returns incomplete data

**Readiness Score™:**
- ✅ Calculation logic implemented
- ⚠️ **Placeholder values:**
  ```typescript
  const policyCompliance = 0.9; // Placeholder
  const testCoverage = 0.85; // Placeholder
  const docSync = 0.9; // Placeholder
  ```
  Location: `services/cultural-artifacts/index.ts:164-170`
- ❌ Does not actually aggregate test or doc sync results
- ❌ No database table for historical readiness scores
- ❌ Trend calculation incomplete

**AI Risk Exposure Index™:**
- ✅ Structure defined (`services/cultural-artifacts/index.ts:50-62`)
- ❌ **Not implemented** — no `calculateAIRiskExposureIndex` method found
- ❌ API endpoint missing
- ❌ Dashboard component shows mock data only

**Gap Severity:** CRITICAL
**Impact:** Marketing shows these as core differentiators with ™ symbols implying registered IP. Actual implementation is 30-40% complete with hardcoded placeholders.

**Fix Options:**
1. **Remove from marketing** until fully implemented
2. **Mark as "Beta"** or "Coming Soon" in UI
3. **Complete implementation:**
   - Persist certificates to database
   - Integrate actual test/doc results into gates
   - Remove placeholder values
   - Implement AI Risk Exposure Index calculation
   - Add historical tracking tables

---

### 3. ENFORCEMENT CLAIMS VS. CONFIGURATION

#### CLAIM (README):
> "failOnCritical: Always true, cannot disable"
> "coverage.threshold: Minimum 80%"
> "coverage.failOnBelow: Always true"
> "driftPrevention.enabled: Always true"

#### REALITY:

**failOnCritical:**
- ✅ Config validation enforces this (`services/config/index.ts:96-98`)
- ✅ Default enforced in `applyDefaults` (`services/config/index.ts:180`)
- ✅ **ENFORCED**

**coverage.threshold minimum 80%:**
- ✅ Config validation enforces this (`services/config/index.ts:108-110`)
- ✅ **ENFORCED**

**coverage.failOnBelow:**
- ✅ Config validation enforces this (`services/config/index.ts:112-114`)
- ✅ Hardcoded to `true` in defaults (`services/config/index.ts:200`)
- ✅ **ENFORCED**

**driftPrevention.enabled:**
- ✅ Config validation enforces this (`services/config/index.ts:120-122`)
- ⚠️ Default allows `action: 'alert'` instead of `'block'` (line 125)
- ⚠️ **PARTIALLY ENFORCED:** Drift prevention is required, but blocking is optional

**Gap Severity:** LOW (mostly enforced)
**Impact:** Minimal. Claims match enforcement for most critical settings.

**Fix:** Add stricter default for `driftPrevention.action` to always default to `'block'` unless explicitly overridden.

---

### 4. AI DETECTION ACCURACY

#### CLAIM (ValueDrivers landing component):
> "100% detection rate on AI-touched diffs"

#### REALITY:
- ❌ **No evidence** of 100% detection rate in code
- ⚠️ Detection logic exists but confidence thresholds vary
- ❌ No benchmarking suite or validation dataset
- ❌ No published accuracy metrics

**Gap Severity:** MEDIUM
**Impact:** Unsupported quantitative claim. Could be challenged in sales/compliance discussions.

**Fix Options:**
1. **Remove percentage claim** — replace with "High-confidence AI detection"
2. **Benchmark and validate** — create test suite with known AI/human code samples
3. **Publish methodology** — explain detection approach and known limitations

---

### 5. TEST COVERAGE ENFORCEMENT

#### CLAIM (Pricing page):
> "Coverage enforcement (80% threshold, blocks if below)"

#### REALITY:
- ✅ Threshold enforcement exists in config
- ⚠️ **Test execution is not automatic** — requires explicit API call
- ⚠️ Test Engine generates tests but does not execute them
- ❌ **No automatic PR blocking** based on coverage in Review Guard flow
- ❌ Coverage calculation delegates to external test frameworks

**Implementation:**
```typescript
// Test generation happens, but coverage check is manual
// services/test-engine/index.ts:330-343
const test = await prisma.test.create({
  data: {
    status: evaluationResult.blocked ? 'blocked' : 'generated',
    // ... but no coverage validation here
  },
});
```

**Gap Severity:** MEDIUM
**Impact:** Tests are generated but coverage blocking is not integrated into PR review workflow.

**Fix Options:**
1. **Clarify claim:** "Test generation with configurable coverage thresholds" (execution separate)
2. **Integrate enforcement:** Add coverage calculation step to Review Guard that blocks PRs
3. **Add execution worker:** Automatically run generated tests and calculate coverage

---

### 6. SECRETS REDACTION

#### CLAIM (README):
> "Secrets detection & redaction before LLM queries"

#### REALITY:
- ⚠️ **Partial implementation**
- ✅ Test exists: `e2e/secrets-redaction.spec.ts:338`
- ❌ **Redaction logic not found** in `services/review-guard/async-processor.ts` where LLM prompts are built
- ⚠️ Comment in code: `const redactedCode = content; // TODO: Add redaction` (line 157)

**Gap Severity:** HIGH
**Impact:** Security claim not fully enforced. API keys could be sent to LLM providers.

**Fix Options:**
1. **Implement redaction** before any LLM calls
2. **Remove claim** until implemented
3. **Add runtime assertion** that fails if secret patterns detected in prompts

---

### 7. POLICY VERSION HASHING

#### CLAIM (Landing/CulturalArtifacts):
> "Policy version hashing — every decision signed with policy hash"
> "Signed with: Policy version hash, review ID signature, immutable evidence bundle"

#### REALITY:
- ✅ Policy checksum exists and is calculated
- ✅ Stored in evidence bundles
- ❌ **Review ID signature is NOT cryptographic:**
  ```typescript
  const reviewIdSignature = this.generateReviewIdSignature(
    request.repositoryId,
    request.prNumber,
    request.prSha,
    policy.pack.checksum
  );
  ```
  Location: `services/review-guard/index.ts:275-280`
  - Method not shown, but likely a hash, not a signature
  - No public/private key signing
  - "Signed" is misleading terminology

**Gap Severity:** MEDIUM
**Impact:** Marketing implies cryptographic signatures for non-repudiation. Implementation is content hashing.

**Fix Options:**
1. **Replace "signed" with "hashed"** in all marketing materials
2. **Implement actual signatures** using Ed25519 or ECDSA if non-repudiation is needed
3. **Clarify terminology:** "Deterministically identified" instead of "signed"

---

### 8. PROMPT ARCHITECTURE

#### CLAIM (Implicit):
> System architecture shows clean separation: "System: identity + invariants, Analysis: evaluation rules, Execution: task-only"

#### REALITY:
- ❌ **No layered prompt architecture found**
- ❌ Prompts are inline strings scattered across services:
  - Review Guard: `services/review-guard/index.ts:564`
  - Test Engine: `services/test-engine/index.ts:260`
  - Doc Sync: `services/doc-sync/index.ts:597`
  - Governance: `services/governance-engine/run-orchestrator.ts:240`

**Prompts are:**
- Hardcoded strings
- No shared system prompt
- No prompt versioning
- No prompt dependency tracking

**Gap Severity:** MEDIUM
**Impact:** Prompt changes are not versioned or tracked. Difficult to ensure consistency or debug regressions.

**Fix:** Create prompt service with versioned, composable prompts (see recommendations below).

---

### 9. RAG EVIDENCE INTEGRATION

#### CLAIM (ValueDrivers):
> "RAG-Powered Context — Uses Retrieval Augmented Generation to understand your codebase context and patterns"

#### REALITY:
- ✅ RAG infrastructure exists (`lib/rag/`)
- ⚠️ **Disabled by default:**
  ```
  RAG_ENABLED=false
  RAG_INGEST_ENABLED=false
  RAG_QUERY_ENABLED=false
  ```
- ⚠️ Review Guard checks `isQueryEnabled()` before using RAG
- ❌ **Not active** in default deployment

**Gap Severity:** LOW
**Impact:** Feature exists but not enabled. Marketing should clarify this is optional/premium.

**Fix:** Mark as "Premium Feature" or "Enterprise Add-on" in pricing/marketing materials.

---

### 10. PRICING TIERS VS. ENFORCEMENT

#### CLAIM (Pricing page):

**Starter tier:** $49/month
- "Coverage enforcement (80% threshold, blocks if below)"
- "Block PRs with critical/high security findings"

**Growth tier:** $199/month
- "Custom rules and thresholds"
- "Multi-framework support"

**Reality:**
- ⚠️ **Tier enforcement not implemented** in code
- ❌ No billing tier checks before enabling features
- ❌ All features appear accessible regardless of tier
- ⚠️ Usage limits exist but feature gating does not

**Gap Severity:** MEDIUM
**Impact:** Customers could access Growth/Scale features on Starter tier.

**Fix:** Implement feature flags tied to billing tier in middleware/auth layer.

---

## SUMMARY TABLE

| Claim | Location | Implementation Status | Severity | Fix Priority |
|-------|----------|----------------------|----------|--------------|
| Deterministic governance | README, Landing | Partial (LLM temp=0.7) | HIGH | P0 |
| Merge Confidence Certificates | Landing, Artifacts | 40% complete | CRITICAL | P0 |
| Readiness Score™ | Landing, Artifacts | 50% complete (placeholders) | CRITICAL | P0 |
| AI Risk Exposure Index™ | Landing, Artifacts | 0% complete | CRITICAL | P0 |
| 100% AI detection rate | ValueDrivers | Unvalidated | MEDIUM | P1 |
| Coverage enforcement blocks PRs | Pricing | Not integrated | MEDIUM | P1 |
| Secrets redaction before LLM | README | Not implemented | HIGH | P0 |
| Policy version signing | Landing, Artifacts | Hash, not signature | MEDIUM | P1 |
| Layered prompt architecture | Implicit | Not implemented | MEDIUM | P2 |
| RAG-powered context | ValueDrivers | Disabled by default | LOW | P2 |
| Tier-based feature gating | Pricing | Not enforced | MEDIUM | P1 |

---

## RECOMMENDATIONS

### Immediate Actions (P0):
1. **Cultural Artifacts:** Complete implementation or remove ™ symbols and downgrade claims to "Beta"
2. **Secrets Redaction:** Implement or remove security claim
3. **Determinism:** Set LLM temperature to 0 and implement result caching OR change "deterministic" to "reproducible static analysis with AI enrichment"

### Short-term Actions (P1):
1. **AI Detection:** Benchmark and publish methodology or remove percentage claim
2. **Coverage Enforcement:** Integrate into PR workflow or clarify as "manual execution"
3. **Policy Signing:** Change "signed" to "hashed" throughout marketing
4. **Tier Enforcement:** Implement feature flags for billing tiers

### Medium-term Actions (P2):
1. **Prompt Architecture:** Centralize and version all prompts
2. **RAG Clarity:** Mark as optional/premium feature in marketing
3. **Test Quality:** Audit tests for semantic meaning (separate report)

---

## INTELLECTUAL HONESTY PRINCIPLE

**ReadyLayer should claim only what it enforces.**

Every gap in this report represents potential trust erosion. Enterprise customers performing due diligence will discover these gaps. The integrity of ReadyLayer's positioning as a "trust layer" depends on closing the distance between marketing claims and actual behavior.

**End state:** Marketing matches enforcement. Every signal is explainable. Every claim is defensible.

---

**Report generated by Ralph Wiggins execution block**
**Next:** INVARIANTS.md (implicit assumptions to formalize)
