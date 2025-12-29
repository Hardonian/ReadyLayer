# ReadyLayer — Test Engine Specification (HARDENED)

## ENFORCEMENT-FIRST PRINCIPLES

**This is a hardened specification that enforces test coverage by default.**

### Core Invariants
1. **Coverage > Convenience:** Test coverage is required, not optional
2. **Enforcement > Generation:** Coverage enforcement is default, not config-optional
3. **Failure > Silent:** Test generation failures block PR, don't silently degrade
4. **Explicit > Vague:** All failures name cause, file, and fix

---

## Hardened Coverage Enforcement

### Coverage Thresholds (REQUIRED, NOT OPTIONAL)
**Previous (PERMISSIVE):**
```yaml
test:
  coverage:
    threshold: 80
    fail_on_below: true  # Optional, can be false
```

**Hardened (ENFORCEMENT-FIRST):**
```yaml
test:
  coverage:
    threshold: 80  # Minimum: 80%, cannot go below
    metric: "lines"  # Required
    enforce_on: "pr"  # Required: pr, merge, or both
    fail_on_below: true  # REQUIRED: Cannot be disabled
```

### Enforcement Logic (HARDENED)
```typescript
function enforceCoverage(coverage: CoverageMetrics, config: TestConfig): EnforcementResult {
  // Validate config (fail-secure)
  if (config.coverage.threshold < 80) {
    throw new Error("Coverage threshold cannot be below 80%. Minimum enforced: 80%");
  }
  
  if (config.coverage.fail_on_below === false) {
    throw new Error("fail_on_below cannot be disabled. Coverage enforcement is required.");
  }
  
  const threshold = config.coverage.threshold;
  const metric = coverage[config.coverage.metric];
  
  if (metric.percentage < threshold) {
    return {
      passed: false,
      blocked: true,  // REQUIRED: Always block
      message: `Coverage ${metric.percentage}% below threshold ${threshold}%`,
      action: "block",  // REQUIRED: Always block, not warn
      details: {
        threshold: threshold,
        actual: metric.percentage,
        gap: threshold - metric.percentage,
        files_below_threshold: getFilesBelowThreshold(coverage, threshold)
      }
    };
  }
  
  return {
    passed: true,
    blocked: false,
    message: `Coverage ${metric.percentage}% meets threshold ${threshold}%`
  };
}
```

### Coverage Enforcement Guarantees
1. **Coverage threshold:** Minimum 80%, cannot go below
2. **Enforcement:** Always blocks if below threshold (cannot disable)
3. **Status check:** "failure" if below threshold (not "success with warning")
4. **PR merge:** Blocked if coverage below threshold (enforced, not advisory)

---

## Hardened Test Generation Failures

### Generation Failures (MUST BLOCK PR)
**Previous (PERMISSIVE):**
- "Test generation fails: Post warning comment, don't block PR"

**Hardened (ENFORCEMENT-FIRST):**
- **Test generation failures MUST block PR** with explicit error:
  ```
  ⚠️ ReadyLayer Test Generation Failed
  
  Cause: Cannot generate tests for AI-touched files
  Reason: LLM API rate limit exceeded
  Impact: Cannot ensure test coverage for AI-generated code
  
  Files Affected:
  - src/auth.ts (AI-touched, no tests generated)
  - src/utils.ts (AI-touched, no tests generated)
  
  Required Action:
  1. Wait 60 seconds and push a new commit to retry
  2. Or contact support@readylayer.com if issue persists
  
  This PR is BLOCKED until tests are generated.
  ```
- **No silent fallback** (cannot merge without tests)
- **Status check:** "failure" (not "success with warning")

### Test Validation Failures (MUST BLOCK PR)
- **Syntax errors:** Block PR with explicit error (file, line, reason)
- **Framework mismatch:** Block PR with explicit error (detected framework, expected framework)
- **Test execution failures:** Block PR with explicit error (test file, reason)

### Coverage Calculation Failures (MUST BLOCK PR)
- **Coverage parsing errors:** Block PR with explicit error (coverage file, reason)
- **Missing coverage data:** Block PR with explicit error (files missing coverage)
- **Coverage tool unavailable:** Block PR with explicit error (tool, reason)

---

## Hardened CI Integration

### CI Status Checks (EXPLICIT)
**Previous (PERMISSIVE):**
```typescript
{
  state: "success",  // Even with warnings
  description: "Coverage 75% (threshold: 80%)"  // Warning, not failure
}
```

**Hardened (ENFORCEMENT-FIRST):**
```typescript
// Coverage below threshold
{
  state: "failure",  // REQUIRED: Must be failure
  description: "❌ Coverage 75% below threshold 80%",
  context: "readylayer/coverage",
  target_url: "https://readylayer.com/coverage/repo_123/pr_456"
}

// Coverage meets threshold
{
  state: "success",
  description: "✅ Coverage 85% meets threshold 80%",
  context: "readylayer/coverage"
}

// Test generation failed
{
  state: "failure",
  description: "⚠️ Test generation failed: LLM API unavailable",
  context: "readylayer/test-generation"
}

// Coverage calculation failed
{
  state: "failure",
  description: "⚠️ Coverage calculation failed: Missing coverage data",
  context: "readylayer/coverage"
}
```

### CI Fail Conditions (HARDENED)
**CI fails (PR blocked) if ANY of:**
1. Coverage below threshold (REQUIRED: cannot disable)
2. Test generation fails (REQUIRED: cannot disable)
3. Test validation fails (REQUIRED: cannot disable)
4. Coverage calculation fails (REQUIRED: cannot disable)

**CI passes ONLY if:**
1. Coverage meets threshold
2. Tests generated successfully
3. Tests validated successfully
4. Coverage calculated successfully

---

## Hardened Test Generation Pipeline

### Step 1: Detect AI-Touched Files (MUST BE EXPLICIT)
```typescript
interface AITouchedFile {
  path: string;
  confidence: number; // 0-1
  methods: string[]; // Which methods detected AI
  ai_tool?: "copilot" | "cursor" | "claude" | "other";
  requires_tests: boolean; // REQUIRED: true if AI-touched
}

function detectAITouchedFiles(diff: Diff, config: AIDetectionConfig): AITouchedFile[] {
  const files: AITouchedFile[] = [];
  
  for (const file of diff.files) {
    const detection = detectAI(file, config);
    
    if (detection.confidence >= config.confidence_threshold) {
      files.push({
        path: file.path,
        confidence: detection.confidence,
        methods: detection.methods,
        ai_tool: detection.tool,
        requires_tests: true  // REQUIRED: AI-touched files must have tests
      });
    }
  }
  
  return files;
}
```

### Step 2: Check Existing Tests (MUST VALIDATE)
- **Missing tests:** Block PR, require generation
- **Incomplete tests:** Block PR, require generation
- **Test validation:** Must pass before PR can merge

### Step 3: Generate Tests (MUST SUCCEED)
- **Generation failure:** Block PR, explicit error
- **Syntax errors:** Block PR, explicit error
- **Framework mismatch:** Block PR, explicit error

### Step 4: Validate Tests (MUST PASS)
- **Syntax validation:** Must pass
- **Structure validation:** Must match framework
- **Execution validation:** Must run successfully (if possible)

### Step 5: Calculate Coverage (MUST SUCCEED)
- **Coverage calculation:** Must succeed
- **Coverage parsing:** Must succeed
- **Coverage reporting:** Must be accurate

### Step 6: Enforce Coverage (MUST BLOCK IF BELOW)
- **Coverage check:** Must meet threshold
- **Status check:** Must reflect blocking state
- **PR merge:** Must be blocked if below threshold

---

## Hardened Error Messages

### Test Generation Failure (EXPLICIT)
```
⚠️ ReadyLayer Test Generation Failed

Cause: Cannot generate tests for AI-touched files
Reason: LLM API rate limit exceeded
Impact: Cannot ensure test coverage for AI-generated code

Files Affected:
- src/auth.ts (AI-touched, no tests generated)
- src/utils.ts (AI-touched, no tests generated)

Required Action:
1. Wait 60 seconds and push a new commit to retry
2. Or contact support@readylayer.com if issue persists

This PR is BLOCKED until tests are generated.
```

### Coverage Below Threshold (EXPLICIT)
```
❌ ReadyLayer Coverage Check Failed

Coverage: 75% (Threshold: 80%)
Gap: 5 percentage points

Files Below Threshold:
- src/auth.ts: 60% coverage (needs 20% more)
- src/utils.ts: 70% coverage (needs 10% more)

Required Action:
1. Add tests to increase coverage above 80%
2. Focus on files listed above
3. Push fixes and ReadyLayer will re-check

This PR is BLOCKED until coverage meets threshold.
```

### Test Validation Failure (EXPLICIT)
```
⚠️ ReadyLayer Test Validation Failed

Cause: Generated tests have syntax errors
Reason: Invalid TypeScript syntax in test file

Files Affected:
- src/__tests__/auth.test.ts (Syntax error at line 15)

Error Details:
Expected ';' but found '}'

Required Action:
1. Fix syntax error in test file
2. Or regenerate tests by pushing a new commit
3. ReadyLayer will re-validate

This PR is BLOCKED until tests are valid.
```

---

## Hardened Configuration

### Configuration Validation (FAIL-SECURE)
```typescript
interface TestConfig {
  enabled: boolean; // Default: true
  framework: string; // Auto-detect if not specified
  placement: "co-located" | "separate" | "mirror" | "custom";
  test_dir?: string; // Required if placement: "separate"
  
  ai_detection: {
    methods: ("commit_message" | "author" | "pattern" | "metadata")[];
    confidence_threshold: number; // Default: 0.7, minimum: 0.5
    require_multiple_methods: boolean; // Default: false
  };
  
  coverage: {
    threshold: number; // REQUIRED: Minimum 80, cannot go below
    metric: "lines" | "branches" | "functions"; // Required
    enforce_on: "pr" | "merge" | "both"; // Required
    fail_on_below: true; // REQUIRED: Cannot be false
  };
  
  generation: {
    include_edge_cases: boolean; // Default: true
    include_error_cases: boolean; // Default: true
    match_existing_style: boolean; // Default: true
  };
  
  excluded_paths: string[]; // Default: ["**/vendor/**", "**/node_modules/**"]
}

function validateTestConfig(config: TestConfig): ValidationResult {
  // Coverage threshold cannot be below 80
  if (config.coverage.threshold < 80) {
    return {
      valid: false,
      error: "Coverage threshold cannot be below 80%. Minimum enforced: 80%",
      fix: `Set coverage.threshold to at least 80 (current: ${config.coverage.threshold})`
    };
  }
  
  // fail_on_below cannot be disabled
  if (config.coverage.fail_on_below === false) {
    return {
      valid: false,
      error: "fail_on_below cannot be disabled. Coverage enforcement is required.",
      fix: "Remove 'fail_on_below: false' from config or set to true."
    };
  }
  
  // Confidence threshold cannot be below 0.5
  if (config.ai_detection.confidence_threshold < 0.5) {
    return {
      valid: test_dir: "AI detection confidence threshold cannot be below 0.5",
      fix: `Set ai_detection.confidence_threshold to at least 0.5 (current: ${config.ai_detection.confidence_threshold})`
    };
  }
  
  return { valid: true };
}
```

---

## Hardened Acceptance Criteria

### Functional Requirements
1. ✅ Coverage enforcement ALWAYS blocks PR if below threshold (cannot disable)
2. ✅ Test generation failures ALWAYS block PR (cannot disable)
3. ✅ Coverage threshold minimum 80% (cannot go below)
4. ✅ Status checks reflect blocking state (failure = blocked)
5. ✅ All failures are explicit (no silent degradation)
6. ✅ All errors include fix instructions

### Non-Functional Requirements
1. ✅ Generate tests within 2 minutes per file (P95)
2. ✅ Support 5+ test frameworks
3. ✅ Handle PRs with 50+ files
4. ✅ Cache results to reduce API calls
5. ✅ **Explicit failures** (no silent degradation)
6. ✅ **Audit logging** for all blocks and overrides

### Quality Requirements
1. ✅ Generated tests are syntactically correct (>95%)
2. ✅ Generated tests follow framework best practices
3. ✅ Coverage calculation accuracy (>99%)
4. ✅ False positive rate <5% (AI detection)
5. ✅ **Enforcement reliability** (blocks are enforced, not advisory)
