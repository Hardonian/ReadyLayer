# INVARIANTS — ReadyLayer System Guarantees

**Ralph Wiggins Execution Report**
**Date:** 2026-01-17
**Scope:** Implicit assumptions → Explicit invariants
**Purpose:** Make system behavior predictable, testable, and defendable

---

## WHAT IS AN INVARIANT?

An **invariant** is a condition that must always be true at a specific point in program execution. Invariants define the boundaries of correct system behavior.

**Why document invariants:**
1. **Testability** — Each invariant can be validated with assertions
2. **Debugging** — Violations pinpoint logic errors
3. **Trust** — Clear guarantees are defensible in audits
4. **Maintainability** — Future changes cannot break documented contracts

**Ralph's Rule:** If it's not written down, it doesn't exist. If it's not enforced, it's not real.

---

## CLASSIFICATION

### 1. DATA INVARIANTS
Constraints on data structures and persistence

### 2. WORKFLOW INVARIANTS
Ordering and state transition guarantees

### 3. ENFORCEMENT INVARIANTS
Security and policy guarantees

### 4. SCORING INVARIANTS
Calculation and signal semantics

### 5. API INVARIANTS
Contract guarantees for external integrations

---

## 1. DATA INVARIANTS

### INV-D1: Review Status Consistency
**Invariant:** A review marked `isBlocked: true` MUST have `status: 'blocked'`

**Current State:** ⚠️ NOT ENFORCED
**Location:** `services/review-guard/index.ts:294`
**Code:**
```typescript
status: isBlocked ? 'blocked' : reviewStatus,
```
**Issue:** `isBlocked` and `status` are separate fields that can diverge

**Enforcement:**
- Add database constraint: `CHECK (isBlocked = false OR status = 'blocked')`
- Add runtime assertion before save
- Add migration to fix existing data

**Test:**
```typescript
test('blocked reviews have blocked status', () => {
  const review = { isBlocked: true, status: 'completed' };
  expect(() => validateReview(review)).toThrow();
});
```

---

### INV-D2: Evidence Bundle Immutability
**Invariant:** Once created, evidence bundles are immutable (no UPDATE operations)

**Current State:** ⚠️ ASSUMED, NOT ENFORCED
**Location:** Evidence bundle creation in `services/review-guard/index.ts:307-330`
**Issue:** No database-level immutability guarantee

**Enforcement:**
- Add database trigger that rejects UPDATEs on `EvidenceBundle` table
- Add application-level assertion
- Add audit log for any attempted modifications

**Test:**
```typescript
test('evidence bundles cannot be modified', async () => {
  const bundle = await createEvidenceBundle(...);
  await expect(
    prisma.evidenceBundle.update({
      where: { id: bundle.id },
      data: { artifacts: {} }
    })
  ).rejects.toThrow('Evidence bundles are immutable');
});
```

---

### INV-D3: Policy Checksum Uniqueness
**Invariant:** Policy checksum uniquely identifies policy content (collision-free within org)

**Current State:** ✅ ENFORCED (SHA-256)
**Location:** Policy engine calculates checksums
**Assumption:** SHA-256 collision probability negligible

**Enforcement:**
- Document checksum algorithm in policy docs
- Add warning if checksum collision detected
- Consider namespacing checksums by org ID

---

### INV-D4: Confidence Score Bounds
**Invariant:** All confidence scores are in range [0, 1] or [0, 100] consistently

**Current State:** ⚠️ INCONSISTENT
**Locations:**
- `services/cultural-artifacts/index.ts:93` — confidence as 0-100
- `services/review-guard/index.ts:580` — confidence as 0-1
- `services/static-analysis/` — confidence as 0-1

**Issue:** Mixed scales (0-1 vs 0-100) across codebase

**Enforcement:**
- Standardize on single scale (recommend 0-1 for calculations, 0-100 for display)
- Add TypeScript branded types: `type Confidence01 = number & { __brand: 'confidence-0-1' }`
- Add runtime validation

**Test:**
```typescript
test('all confidence scores are 0-1', () => {
  const issues = analyzeFile(...);
  issues.forEach(issue => {
    expect(issue.confidence).toBeGreaterThanOrEqual(0);
    expect(issue.confidence).toBeLessThanOrEqual(1);
  });
});
```

---

### INV-D5: Severity Levels Are Exhaustive
**Invariant:** Issue severity is one of: `'critical' | 'high' | 'medium' | 'low'`

**Current State:** ✅ ENFORCED in validation
**Location:** `services/review-guard/index.ts:604`

**Enforcement:**
- TypeScript type ensures compile-time safety
- Runtime validation filters invalid severities
- Database enum type enforces at persistence layer

---

## 2. WORKFLOW INVARIANTS

### INV-W1: LLM Failure Blocks PR
**Invariant:** If LLM analysis fails, the PR MUST be blocked (fail-secure)

**Current State:** ✅ ENFORCED
**Location:** `services/review-guard/index.ts:610-615`
**Code:**
```typescript
throw new Error(
  `LLM analysis failed: ${error.message}. ` +
  `Cannot complete AI-aware security analysis.`
);
```

**Enforcement:**
- Exception propagates to API layer
- Review status set to 'failed'
- PR cannot merge

**Invariant Guarantee:** LLM unavailability does not reduce security posture

---

### INV-W2: Static Analysis Runs Before AI Analysis
**Invariant:** Static analysis MUST complete before LLM enrichment is queued

**Current State:** ✅ ENFORCED
**Location:** `services/review-guard/index.ts:157-177`
**Order:**
1. Static analysis runs synchronously
2. Results stored
3. LLM enrichment queued asynchronously

**Enforcement:**
- Sequential execution in code
- LLM job depends on static analysis output

**Invariant Guarantee:** Core security findings available immediately, AI enrichment is additive

---

### INV-W3: Policy Evaluation Runs After All Analysis
**Invariant:** Policy evaluation runs only after all findings are collected

**Current State:** ✅ ENFORCED
**Location:** `services/review-guard/index.ts:241-263`
**Order:**
1. Static analysis
2. AI analysis (or queued)
3. Schema reconciliation (if applicable)
4. Policy loading
5. Policy evaluation

**Enforcement:**
- Sequential execution ensures complete findings list
- Policy evaluation receives all findings

**Invariant Guarantee:** Blocking decision considers all available evidence

---

### INV-W4: Evidence Bundle Created After Decision
**Invariant:** Evidence bundle is created AFTER final blocking decision is made

**Current State:** ✅ ENFORCED
**Location:** `services/review-guard/index.ts:307-330`

**Enforcement:**
- Evidence bundle creation happens after `isBlocked` determination
- Includes final decision in metadata

**Invariant Guarantee:** Evidence matches actual decision made

---

### INV-W5: Enrichment Does Not Change Blocking Decision
**Invariant:** Async LLM enrichment CANNOT retroactively unblock a PR

**Current State:** ⚠️ ASSUMED, NOT ENFORCED
**Issue:** Enrichment updates review but blocking decision already made
**Risk:** Enrichment could add critical findings but PR already merged

**Enforcement Needed:**
- Add flag: `enrichmentMayChangeDecision`
- Re-evaluate policy after enrichment completes
- Notify if enrichment would have changed decision
- Consider blocking PRs pending enrichment (config option)

**Test:**
```typescript
test('enrichment cannot unblock PR', async () => {
  const blockedReview = await reviewGuard.review({...});
  expect(blockedReview.isBlocked).toBe(true);

  await enrichReview(blockedReview.id, /* new findings */);

  const updated = await getReview(blockedReview.id);
  expect(updated.isBlocked).toBe(true); // Still blocked
});
```

---

## 3. ENFORCEMENT INVARIANTS

### INV-E1: Critical Issues Always Block
**Invariant:** Issues with `severity: 'critical'` MUST block PRs (cannot be disabled)

**Current State:** ✅ ENFORCED
**Location:** `services/config/index.ts:96-98`, `applyDefaults:180`

**Enforcement:**
- Config validation rejects `failOnCritical: false`
- Default hardcoded to `true`
- No override mechanism

**Invariant Guarantee:** Critical security issues never auto-merge

---

### INV-E2: Coverage Threshold Minimum 80%
**Invariant:** Coverage threshold cannot be set below 80%

**Current State:** ✅ ENFORCED
**Location:** `services/config/index.ts:108-110`

**Enforcement:**
- Config validation rejects values < 80
- Default is 80

**Invariant Guarantee:** Minimum quality bar is maintained

---

### INV-E3: Waivers Are Scoped
**Invariant:** Waivers apply only to specific rule + scope (repo/branch/path)

**Current State:** ✅ ENFORCED
**Location:** Policy engine waiver matching logic

**Enforcement:**
- Waiver scope checked before suppression
- Expired waivers ignored

**Invariant Guarantee:** Waivers do not create blanket security holes

---

### INV-E4: Policy Inheritance Order
**Invariant:** Repository policy overrides organization policy

**Current State:** ✅ ENFORCED
**Location:** `services/config/index.ts:138-172`

**Enforcement:**
- Merge strategy: `{ ...orgConfig, ...repoConfig }`
- Repo config applied last

**Invariant Guarantee:** Repos can tighten (but not loosen, due to INV-E1) org rules

---

### INV-E5: Secrets Never Logged
**Invariant:** Detected secrets MUST NOT appear in logs, errors, or LLM prompts

**Current State:** ❌ NOT ENFORCED
**Issue:** Redaction logic not implemented (see REALITY_GAPS.md #6)

**Enforcement Needed:**
- Add redaction function before all logging
- Add redaction before LLM prompt construction
- Add test that fails if secret patterns detected in logs

**Test:**
```typescript
test('secrets are redacted from logs', () => {
  const code = 'const key = "sk-proj-abc123";';
  const logs = captureLogsForAnalysis(code);
  expect(logs).not.toContain('sk-proj-abc123');
  expect(logs).toContain('[REDACTED:SECRET]');
});
```

---

## 4. SCORING INVARIANTS

### INV-S1: Confidence Score Is Causal
**Invariant:** Confidence score can be traced to specific rule firings and severities

**Current State:** ⚠️ PARTIAL
**Location:** `services/cultural-artifacts/index.ts:93-133`

**Current Calculation:**
```typescript
calculateConfidenceScore(review) {
  const issuesFound = review.issuesFound || 0;
  const baseScore = Math.max(0, 100 - issuesFound * 5);
  const severityPenalty = calculateSeverityPenalty(review);
  return Math.max(0, Math.min(100, baseScore - severityPenalty));
}
```

**Issue:** Calculation is heuristic, not documented, not explainable

**Enforcement Needed:**
- Document scoring formula in code comments
- Provide `explain()` method that returns scoring breakdown
- Ensure score is reproducible from evidence bundle

**Test:**
```typescript
test('confidence score is reproducible from evidence', () => {
  const review = { issuesFound: 3, summary: { critical: 1 } };
  const score1 = calculateConfidenceScore(review);
  const score2 = calculateConfidenceScore(review);
  expect(score1).toBe(score2);

  const explanation = explainConfidenceScore(review);
  expect(explanation.factors).toHaveProperty('baseScore');
  expect(explanation.factors).toHaveProperty('severityPenalty');
});
```

---

### INV-S2: Readiness Score Weights Sum to 1.0
**Invariant:** Readiness score factor weights MUST sum to 1.0

**Current State:** ✅ CORRECT
**Location:** `services/cultural-artifacts/index.ts:173-180`
**Weights:** 0.3 + 0.3 + 0.2 + 0.1 + 0.1 = 1.0

**Enforcement:**
- Add compile-time assertion
- Add test

**Test:**
```typescript
test('readiness score weights sum to 1.0', () => {
  const weights = {
    gatePassRate: 0.3,
    averageConfidence: 0.3,
    policyCompliance: 0.2,
    testCoverage: 0.1,
    docSync: 0.1,
  };
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(1.0);
});
```

---

### INV-S3: Readiness Level Thresholds Are Monotonic
**Invariant:** Readiness levels have non-overlapping score ranges

**Current State:** ✅ ENFORCED
**Location:** `services/cultural-artifacts/index.ts:183-190`
**Levels:**
- Excellent: >= 90
- Good: >= 75
- Fair: >= 60
- Poor: < 60

**Enforcement:**
- Thresholds are hardcoded and non-overlapping
- Add test to verify monotonicity

---

### INV-S4: AI Risk Index Factors Are Bounded
**Invariant:** All AI Risk Exposure Index factors are in [0, 1] range

**Current State:** ⚠️ NOT IMPLEMENTED (see REALITY_GAPS.md #2)

**Enforcement Needed:**
- Implement AI Risk calculation
- Add bounds checking for all factors
- Add test

---

### INV-S5: Scores Do Not Mutate After Issuance
**Invariant:** Published readiness scores are immutable snapshots

**Current State:** ⚠️ NOT ENFORCED (no persistence)

**Enforcement Needed:**
- Create `ReadinessScoreSnapshot` table with timestamps
- Store scores on calculation
- Add unique constraint to prevent overwrites
- Return historical snapshots for trend analysis

---

## 5. API INVARIANTS

### INV-A1: Tenant Isolation
**Invariant:** Users can ONLY access resources from their own organizations

**Current State:** ✅ ENFORCED
**Location:** Middleware + API handlers

**Enforcement:**
- Session includes organization membership
- Every query filters by `organizationId`
- Authorization checks on every request

**Invariant Guarantee:** No cross-tenant data leakage

---

### INV-A2: API Keys Have Explicit Scopes
**Invariant:** API key can only perform actions within granted scopes (read/write/admin)

**Current State:** ✅ ENFORCED
**Location:** `lib/authz.ts`

**Enforcement:**
- API key scopes stored in database
- Middleware validates scope before handler execution

**Invariant Guarantee:** Least-privilege access control

---

### INV-A3: Evidence Bundles Are Exportable
**Invariant:** Every review has an exportable evidence bundle in stable JSON format

**Current State:** ⚠️ PARTIAL
**Issue:** Export endpoint exists but evidence bundles not always created

**Enforcement Needed:**
- Ensure ALL reviews create evidence bundles (no null bundles)
- Add database constraint: reviews table foreign key to evidence bundles (non-null)
- Add export format version to ensure backward compatibility

---

### INV-A4: Webhooks Are Idempotent
**Invariant:** Processing the same webhook twice produces the same outcome

**Current State:** ⚠️ ASSUMED, NOT ENFORCED

**Enforcement Needed:**
- Add `webhook_event_id` tracking table
- Check for duplicates before processing
- Return 200 for duplicate events

**Test:**
```typescript
test('duplicate webhooks are idempotent', async () => {
  const event = { id: 'evt_123', ... };
  const result1 = await processWebhook(event);
  const result2 = await processWebhook(event); // Same event

  expect(result1).toEqual(result2);
  expect(await countReviews()).toBe(1); // Not 2
});
```

---

### INV-A5: Rate Limits Are Per-Organization
**Invariant:** Rate limits apply per organization, not per user

**Current State:** ✅ ENFORCED
**Location:** Middleware rate limiting

**Enforcement:**
- Rate limit keys namespaced by org ID
- Limits configured per org (based on tier)

**Invariant Guarantee:** One user cannot exhaust org quota

---

## 6. IMPLICIT ASSUMPTIONS TO FORMALIZE

### ASSUMPTION-1: LLM Providers Are Available
**Current Assumption:** OpenAI/Anthropic APIs are reachable

**Risk:** LLM unavailability causes review failures (fail-secure but blocks all PRs)

**Formalize:**
- Add health check endpoint for LLM providers
- Add circuit breaker pattern
- Add fallback to static-only mode (with clear warning)

---

### ASSUMPTION-2: Database Transactions Are ACID
**Current Assumption:** PostgreSQL transactions guarantee atomicity

**Risk:** Partial writes could create inconsistent state

**Formalize:**
- Explicitly wrap multi-step operations in transactions
- Add savepoints for complex operations
- Document transaction boundaries in code comments

---

### ASSUMPTION-3: File Content Is UTF-8
**Current Assumption:** All code files are valid UTF-8

**Risk:** Binary files or invalid encoding could cause crashes

**Formalize:**
- Add encoding detection
- Reject non-text files early
- Add error handling for decode failures

---

### ASSUMPTION-4: Diff Sizes Are Bounded
**Current Assumption:** PR diffs fit in memory and LLM context windows

**Risk:** Very large PRs could exceed limits

**Formalize:**
- Add max diff size limit (e.g., 1MB)
- Add max files per PR limit (e.g., 100 files)
- Reject oversized PRs with clear error message

---

### ASSUMPTION-5: Policy Changes Are Backward Compatible
**Current Assumption:** Updating a policy does not invalidate past reviews

**Risk:** Policy changes could make historical reviews un-interpretable

**Formalize:**
- Version all policies
- Store policy version with each review
- Provide policy migration guide for breaking changes

---

## ENFORCEMENT STRATEGY

### Phase 1: Add Assertions (Week 1)
- Add runtime assertions for all P0 invariants
- Assertions throw in development, log in production
- Example:
  ```typescript
  function saveReview(review: Review) {
    invariant(
      !review.isBlocked || review.status === 'blocked',
      'INV-D1 violation: blocked review must have blocked status'
    );
    return prisma.review.create({ data: review });
  }
  ```

### Phase 2: Add Tests (Week 2)
- Create `invariants.test.ts` test suite
- One test per invariant
- Tests run in CI

### Phase 3: Add Database Constraints (Week 3)
- Add CHECK constraints for data invariants
- Add triggers for immutability
- Add unique constraints where needed

### Phase 4: Add Documentation (Week 4)
- Document all invariants in API reference
- Add inline code comments linking to invariant IDs
- Generate invariant compliance report

---

## INVARIANT COMPLIANCE CHECKLIST

Each invariant should have:
- ✅ **ID:** Unique identifier (e.g., INV-D1)
- ✅ **Statement:** Clear English description
- ✅ **Enforcement:** How it's guaranteed (code + DB + tests)
- ✅ **Test:** Automated test that validates it
- ✅ **Documentation:** Referenced in code and API docs

---

## NEXT STEPS

1. **Prioritize:** Focus on security-critical invariants first (INV-E5, INV-W1)
2. **Implement:** Add enforcement mechanisms
3. **Test:** Validate with invariant test suite
4. **Document:** Update API reference and architecture docs
5. **Monitor:** Add runtime monitoring for invariant violations

**Goal:** Every behavioral assumption becomes an explicit, tested, documented guarantee.

---

**Report generated by Ralph Wiggins execution block**
**Next:** Prompt architecture audit and test quality report
