# ReadyLayer — Review Guard Specification (HARDENED)

## ENFORCEMENT-FIRST PRINCIPLES

**This is a hardened specification that enforces blocking by default.**

### Core Invariants
1. **Rules > AI:** Deterministic rules always override AI judgment
2. **Enforcement > Insight:** Blocking is default, warnings are exception
3. **Safety > Convenience:** Fail-secure defaults, explicit overrides required
4. **Explicit > Silent:** All failures are explicit, no silent degradation

---

## Hardened Block vs. Warn Logic

### Block Conditions (ENFORCED BY DEFAULT)
**PR is blocked from merge if ANY of:**
1. Critical issues found (REQUIRED: cannot disable)
2. High issues found (DEFAULT: can disable with explicit override)
3. Coverage below threshold (REQUIRED: cannot disable)
4. LLM analysis fails (REQUIRED: cannot silently degrade)

**Block Mechanism (MANDATORY):**
- Update status check to "failure" (not "success with warnings")
- Post PR comment explaining block with:
  - Exact issue(s) found
  - File(s) and line(s) affected
  - Rule(s) violated
  - Concrete fix instructions
- Prevent merge via git host API (enforced, not advisory)

### Warn Conditions (EXCEPTION ONLY)
**PR shows warnings (but doesn't block) ONLY if:**
1. Medium/Low issues found (never blocks)
2. High issues found AND explicit override: `fail_on_high: false` (requires admin approval)
3. Critical issues found: **NEVER ALLOWED** (cannot override)

**Warn Mechanism:**
- Update status check to "success" BUT description must include warning count
- Example: "Review completed, 3 warnings (non-blocking)"
- Post PR comments with warnings
- Allow merge (user can override)

### Hardened Configuration
```typescript
interface ReviewConfig {
  // REQUIRED: Cannot be disabled
  fail_on_critical: true; // Hard-coded, not configurable
  
  // DEFAULT: Can disable with explicit override (requires admin approval)
  fail_on_high: boolean; // Default: true, override requires admin role
  
  // OPTIONAL: Never blocks by default
  fail_on_medium: boolean; // Default: false
  fail_on_low: boolean; // Default: false
  
  // Severity overrides (requires admin approval)
  severity_overrides: {
    [rule_id: string]: "critical" | "high" | "medium" | "low" | "ignore";
  }; // Changes require admin role, audit logged
}
```

### Enforcement Guarantees
1. **Critical issues ALWAYS block** (no override possible)
2. **High issues block by default** (override requires admin approval)
3. **Status check reflects reality** (failure = blocking, success = non-blocking)
4. **All blocks are explicit** (comment explains why, how to fix)

---

## Hardened Error Handling

### LLM Failures (MUST BE EXPLICIT)
**Previous (PERMISSIVE):**
- "LLM failures: Fallback to static analysis only"

**Hardened (ENFORCEMENT-FIRST):**
- **LLM failures MUST block PR** with explicit error:
  ```
  ⚠️ ReadyLayer Review Failed
  
  Cause: LLM analysis unavailable
  Reason: OpenAI API rate limit exceeded
  Impact: Cannot complete AI-aware security analysis
  
  Required Action:
  1. Wait 60 seconds and push a new commit to retry
  2. Or contact support@readylayer.com if issue persists
  
  This PR is BLOCKED until analysis completes.
  ```
- **No silent fallback** to static analysis only
- **Status check:** "failure" (not "success with degraded analysis")

### Static Analysis Failures
- **Parse errors:** Block PR with explicit error (file, line, reason)
- **Unsupported language:** Block PR with explicit error (language, supported alternatives)
- **Configuration errors:** Block PR with explicit error (config file, line, fix)

### Graceful Degradation (EXPLICIT ONLY)
**Previous (PERMISSIVE):**
- "Partial analysis: Return results for analyzed files, log errors for failed files"

**Hardened (ENFORCEMENT-FIRST):**
- **Partial failures MUST be explicit:**
  ```
  ⚠️ ReadyLayer Review Partially Completed
  
  Analyzed: 5 files
  Failed: 2 files
  
  Failed Files:
  - src/auth.ts (Reason: Parse error at line 42)
  - src/utils.ts (Reason: Unsupported language feature)
  
  This PR is BLOCKED until all files can be analyzed.
  ```
- **No silent partial success**
- **Status check:** "failure" if any file fails

---

## Hardened Status Checks

### Status Check States (EXPLICIT)
1. **"success"** — No blocking issues, PR can merge
2. **"failure"** — Blocking issues found, PR cannot merge
3. **"pending"** — Analysis in progress
4. **"error"** — System error, PR blocked until resolved

### Status Check Descriptions (MUST BE EXPLICIT)
**Success:**
```
✅ ReadyLayer Review Passed
No issues found. PR ready to merge.
```

**Failure (Critical):**
```
❌ ReadyLayer Review Failed
1 critical issue found:
- security.sql-injection in src/auth.ts:42
PR blocked. See comments for details.
```

**Failure (High):**
```
❌ ReadyLayer Review Failed
3 high issues found:
- quality.high-complexity in src/utils.ts:15
- quality.missing-error-handling in src/api.ts:89
- ai.hallucination in src/auth.ts:42
PR blocked. See comments for details.
```

**Failure (System Error):**
```
⚠️ ReadyLayer Review Failed
System error: LLM API unavailable
Reason: Rate limit exceeded
Action: Retry in 60 seconds or contact support
PR blocked until resolved.
```

**Pending:**
```
⏳ ReadyLayer Review In Progress
Analyzing 5 files...
```

**Error:**
```
⚠️ ReadyLayer Review Error
Failed to analyze PR
Reason: GitHub API error (500)
Action: Retry or contact support@readylayer.com
PR blocked until resolved.
```

### Status Check Visibility
- **All failures are visible** in PR status checks
- **No hidden warnings** in success status
- **Description includes issue count** and severity

---

## Hardened Comment Format

### Inline Comments (MUST INCLUDE FIX)
```markdown
⚠️ **Security Issue: SQL Injection Risk**

**Rule:** security.sql-injection  
**Severity:** Critical  
**File:** src/auth.ts  
**Line:** 42

**Issue:**
Unparameterized SQL query detected. User input is directly concatenated into SQL string.

**Vulnerable Code:**
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Fix:**
```typescript
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
```

**Why This Matters:**
SQL injection can lead to data breach, data loss, or system compromise.

**This issue BLOCKS merge.**
```

### Summary Comment (MUST INCLUDE ACTION)
```markdown
## 🔒 ReadyLayer Review Summary

**Status:** ❌ **BLOCKED** (1 critical, 2 high issues)

### Issues Found: 3
- 🔴 **Critical:** 1
- 🟠 **High:** 2
- 🟡 **Medium:** 0
- 🟢 **Low:** 0

### Files Affected: 2
- `src/auth.ts` (1 critical, 1 high)
- `src/utils.ts` (1 high)

### Rules Triggered
- `security.sql-injection` (Critical)
- `quality.high-complexity` (High)
- `ai.hallucination` (High)

### Required Actions
1. Fix critical issue in `src/auth.ts:42` (SQL injection)
2. Address high issues in `src/utils.ts:15` and `src/auth.ts:89`
3. Push fixes and ReadyLayer will re-review

**This PR cannot merge until all critical and high issues are resolved.**
```

---

## Hardened Configuration Validation

### Config Validation (FAIL-SECURE)
```typescript
function validateConfig(config: ReviewConfig): ValidationResult {
  // Critical enforcement cannot be disabled
  if (config.fail_on_critical === false) {
    return {
      valid: false,
      error: "fail_on_critical cannot be disabled. Critical issues always block PRs.",
      fix: "Remove 'fail_on_critical: false' from config or set to true."
    };
  }
  
  // High enforcement requires admin approval if disabled
  if (config.fail_on_high === false && !hasAdminRole()) {
    return {
      valid: false,
      error: "fail_on_high: false requires admin role approval.",
      fix: "Contact org admin to approve high-issue override."
    };
  }
  
  // Severity overrides require admin approval
  if (Object.keys(config.severity_overrides).length > 0 && !hasAdminRole()) {
    return {
      valid: false,
      error: "severity_overrides require admin role approval.",
      fix: "Contact org admin to approve rule overrides."
    };
  }
  
  return { valid: true };
}
```

### Config Error Handling
- **Invalid config:** Block PR with explicit error
- **Missing config:** Use secure defaults (fail_on_critical: true, fail_on_high: true)
- **Config parse error:** Block PR with explicit error (file, line, reason)

---

## Hardened AI Degradation

### AI Uncertainty (MUST ESCALATE)
**Previous (PERMISSIVE):**
- AI uncertain → Warn, don't block

**Hardened (ENFORCEMENT-FIRST):**
- **AI uncertain → Block, require explicit review**
  ```
  ⚠️ ReadyLayer Review: AI Uncertainty
  
  AI analysis returned uncertain result for:
  - src/auth.ts:42 (Potential security issue, confidence: 60%)
  
  Action Required:
  Manual review required. AI cannot determine if this is a security issue.
  
  This PR is BLOCKED until manual review confirms safety.
  ```

### AI Hallucination Detection (MUST VALIDATE)
- **AI claims non-existent API:** Block PR, require validation
- **AI suggests incorrect fix:** Block PR, require manual review
- **AI confidence < 80%:** Block PR, require manual review

---

## Implementation Requirements

### Code Enforcement (NOT CONFIG-OPTIONAL)
1. **Critical blocking:** Hard-coded, not configurable
2. **High blocking:** Default true, override requires admin approval
3. **Status checks:** Must reflect blocking state, not hidden warnings
4. **Comments:** Must include fix instructions, not just descriptions

### Failure Handling (EXPLICIT, NOT SILENT)
1. **LLM failures:** Block PR, explicit error
2. **Parse errors:** Block PR, explicit error
3. **Config errors:** Block PR, explicit error
4. **No silent fallbacks:** All failures are explicit

### Audit Logging (REQUIRED)
1. **All blocks logged:** Who, what, when, why
2. **All overrides logged:** Admin approvals, config changes
3. **All failures logged:** System errors, LLM failures, parse errors

---

## Migration from Permissive to Hardened

### Breaking Changes
1. **Default behavior:** PRs with critical/high issues now BLOCK (previously warned)
2. **Status checks:** Failures now show "failure" (previously "success with warnings")
3. **Config validation:** Invalid configs now BLOCK (previously warned)

### Backward Compatibility
- **Existing configs:** Migrated to hardened defaults
- **Override process:** Admin approval required for permissive overrides
- **Migration guide:** Provided to users before deployment

---

## Acceptance Criteria (HARDENED)

### Functional Requirements
1. ✅ Critical issues ALWAYS block PR merge (cannot disable)
2. ✅ High issues block by default (can disable with admin approval)
3. ✅ Status checks reflect blocking state (failure = blocked)
4. ✅ All failures are explicit (no silent degradation)
5. ✅ All comments include fix instructions
6. ✅ Config validation fails secure (invalid = block)

### Non-Functional Requirements
1. ✅ Complete analysis within 5 minutes (P95)
2. ✅ Handle PRs with 100+ files
3. ✅ Support 10+ languages
4. ✅ Cache results to reduce API calls
5. ✅ **Explicit failures** (no silent degradation)
6. ✅ **Audit logging** for all blocks and overrides

### Quality Requirements
1. ✅ False positive rate <5% (validated by user feedback)
2. ✅ Critical issue detection rate >95%
3. ✅ Comment clarity (actionable suggestions with fixes)
4. ✅ **Enforcement reliability** (blocks are enforced, not advisory)
