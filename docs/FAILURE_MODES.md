# Failure Modes & Safe Degradation

**Last Updated:** 2026-01-24
**Purpose:** Document how ReadyLayer fails, what happens when checks fail, and why it fails safely

---

## Philosophy

**ReadyLayer is infrastructure. Infrastructure fails.**

This document provides **engineering honesty** about:
1. What happens when checks fail
2. What happens when signals conflict
3. What happens when inputs are missing
4. Why ReadyLayer fails safely (never silently)

**No marketing language. Pure engineering transparency.**

---

## Core Failure Principle

### Fail-Secure, Not Fail-Open

**ReadyLayer's default behavior:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| **Unknown error** | ❌ **Block** | Can't verify safety |
| **Policy missing** | ❌ **Block** | No policy = no governance |
| **Network timeout** | ❌ **Block** | Can't verify dependencies |
| **Database unreachable** | ❌ **Block** | Can't check audit log |
| **LLM timeout** | ✅ **Allow (with warning)** | LLM is enhancement, not gate |
| **Test framework not found** | ❌ **Block** | Can't verify coverage |
| **Secrets scanner crashes** | ❌ **Block** | Can't verify no secrets |

**Default to safety, not convenience.**

---

## Category 1: Security Check Failures

### Failure Mode 1.1: Security Scanner Crashes

**What happens:**

```typescript
// services/review-guard/index.ts
try {
  const securityIssues = await scanForSecurityIssues(code);
} catch (error) {
  logger.error({ error, code: 'SECURITY_SCAN_FAILED' },
    'Security scanner crashed - blocking PR');

  return {
    blocked: true,
    reason: 'Security scan failed to complete',
    error: error.message,
    recommendation: 'Retry scan or contact support'
  };
}
```

**Why block?**

If we can't verify code is safe, we can't allow it to merge. **Failing open would allow unscanned code to reach production.**

**Mitigation:**
1. **Retry logic** (3 attempts with exponential backoff)
2. **Circuit breaker** (if scanner consistently fails, alert ops team)
3. **Manual override** (require waiver with justification)

**Location:** `services/review-guard/index.ts`

---

### Failure Mode 1.2: Secrets Detection Fails

**What happens:**

```typescript
// lib/secrets/redaction.ts
try {
  const secrets = detectSecrets(code);
  if (secrets.length > 0) {
    return { blocked: true, secrets };
  }
} catch (error) {
  // Secrets scanner failed - assume secrets present
  logger.error({ error }, 'Secrets detection failed - blocking as unsafe');

  return {
    blocked: true,
    reason: 'Cannot verify absence of secrets - blocking for safety',
    error: error.message
  };
}
```

**Why block?**

**Secrets in code are catastrophic.** If detection fails, assume secrets are present until proven otherwise.

**Mitigation:**
1. **Retry** (secrets detection is fast, retrying is cheap)
2. **Manual review** (engineer must verify no secrets manually)
3. **Emergency waiver** (requires 2 approvers, expires in 24 hours)

**Location:** `lib/secrets/redaction.ts`

---

### Failure Mode 1.3: Dependency Scanning Timeout

**What happens:**

External dependency scanning (checking for CVEs) may timeout if npm/PyPI/crates.io is slow or unreachable.

```typescript
// services/review-guard/dependency-scanner.ts
try {
  const vulnerabilities = await checkDependencies(packageJson, {
    timeout: 30000  // 30 second timeout
  });
} catch (error) {
  if (error.name === 'TimeoutError') {
    logger.warn({ error }, 'Dependency scan timed out - using cached results');

    // Fallback to last known scan
    const cached = await getCachedDependencyScan(packageJson);
    if (cached && isRecent(cached, 24 * 60 * 60 * 1000)) {  // 24 hours
      return cached;
    }

    // No recent cache - block
    return {
      blocked: true,
      reason: 'Dependency scan timed out and no recent cache available',
      recommendation: 'Retry scan or check network connectivity'
    };
  }
  throw error;
}
```

**Why fallback to cache?**

Dependency databases (npm, PyPI) are **external dependencies**. If they're unreachable, blocking all PRs would halt development.

**Tradeoff:** Use cached results up to 24 hours old. After 24 hours, block.

**Mitigation:**
1. **Retry with backoff**
2. **Use cached results** (if recent)
3. **Allow with warning** (if cache exists but stale)
4. **Block** (if no cache)

**Location:** `services/review-guard/dependency-scanner.ts`

---

## Category 2: Test Coverage Failures

### Failure Mode 2.1: Test Framework Not Detected

**What happens:**

```typescript
// services/test-engine/index.ts
const framework = detectTestFramework(projectPath);

if (!framework) {
  logger.error({ projectPath }, 'No test framework detected');

  return {
    blocked: true,
    reason: 'Cannot detect test framework - unable to verify coverage',
    recommendation: 'Add jest.config.js, vitest.config.ts, pytest.ini, or configure framework in .readylayer/policy.yml'
  };
}
```

**Why block?**

If we can't find a test framework, we can't verify test coverage. **Failing open would allow untested code.**

**Mitigation:**
1. **Manual configuration** (specify framework in policy file)
2. **Waiver** (if legacy code with no tests)
3. **Disable test enforcement** (for specific repos)

**Location:** `services/test-engine/detectors/framework-detector.ts`

---

### Failure Mode 2.2: Coverage Report Parsing Fails

**What happens:**

```typescript
// services/test-engine/coverage-parser.ts
try {
  const coverage = parseCoverageReport(coverageFile, framework);
} catch (error) {
  logger.error({ error, coverageFile, framework },
    'Failed to parse coverage report');

  return {
    blocked: true,
    reason: 'Coverage report malformed or unreadable',
    error: error.message,
    recommendation: 'Re-run tests to regenerate coverage report'
  };
}
```

**Why block?**

Malformed coverage reports may indicate:
- Tests didn't run successfully
- Coverage tool misconfigured
- File corruption

**Failing open would allow potentially untested code.**

**Mitigation:**
1. **Re-run tests** (automated retry)
2. **Manual verification** (engineer checks test results)
3. **Waiver** (if coverage tool issue, not code issue)

**Location:** `services/test-engine/coverage-parser.ts`

---

### Failure Mode 2.3: Coverage Below Threshold

**What happens:**

```typescript
// services/test-engine/index.ts
if (coverage.overall < policy.minimum_coverage) {
  return {
    blocked: true,
    reason: `Coverage ${coverage.overall.toFixed(2)}% below threshold ${policy.minimum_coverage}%`,
    currentCoverage: coverage.overall,
    requiredCoverage: policy.minimum_coverage,
    uncoveredFiles: coverage.files.filter(f => f.coverage < policy.minimum_coverage)
  };
}
```

**This is not a failure mode - this is working as designed.**

**Mitigation:**
1. **Add tests** (correct solution)
2. **Waive specific files** (if generated code, test fixtures, etc.)
3. **Lower threshold** (team decision)

**Location:** `services/test-engine/index.ts`

---

## Category 3: Documentation Validation Failures

### Failure Mode 3.1: Documentation File Not Found

**What happens:**

```typescript
// services/doc-sync/index.ts
const docPath = config.documentation_path || 'README.md';
const docExists = await fs.pathExists(docPath);

if (!docExists) {
  if (config.documentation_required) {
    return {
      blocked: true,
      reason: `Documentation file ${docPath} not found`,
      recommendation: 'Create documentation file or disable doc_sync in policy'
    };
  }

  return {
    blocked: false,
    warning: `Documentation file ${docPath} not found - skipping validation`
  };
}
```

**Why conditional block?**

Documentation is **configurable** as required or optional.

**Mitigation:**
1. **Create documentation** (correct solution)
2. **Disable doc sync** (if documentation not needed)
3. **Specify different doc path** (if docs are elsewhere)

**Location:** `services/doc-sync/index.ts`

---

### Failure Mode 3.2: Code-Doc Drift Detected

**What happens:**

```typescript
// services/doc-sync/drift-detector.ts
const driftIssues = compareCodeToDocs(code, documentation);

if (driftIssues.length > 0) {
  const criticalDrift = driftIssues.filter(i => i.severity === 'critical');

  if (criticalDrift.length > 0) {
    return {
      blocked: true,
      reason: 'Critical documentation drift detected',
      issues: criticalDrift,
      recommendation: 'Update documentation to match code changes'
    };
  }

  return {
    blocked: false,
    warnings: driftIssues,
    recommendation: 'Consider updating documentation'
  };
}
```

**Severity levels:**
- **Critical:** Function signature changed, documented example now fails
- **High:** Parameter types changed, behavior different
- **Medium:** New function added, not documented
- **Low:** Documented example uses deprecated syntax

**Mitigation:**
1. **Update documentation** (correct solution)
2. **Mark docs as "aspirational"** (`<!-- FUTURE: ... -->`)
3. **Waive specific drift** (if intentional)

**Location:** `services/doc-sync/drift-detector.ts`

---

## Category 4: Policy Evaluation Failures

### Failure Mode 4.1: Policy File Missing

**What happens:**

```typescript
// services/policy-engine/loader.ts
const policyPath = '.readylayer/policy.yml';
const policyExists = await fs.pathExists(policyPath);

if (!policyExists) {
  logger.error({ policyPath }, 'Policy file not found - no governance defined');

  return {
    blocked: true,
    reason: 'No policy file found - governance cannot run without policy',
    recommendation: 'Create .readylayer/policy.yml or run: readylayer init'
  };
}
```

**Why block?**

**No policy = no governance.** Allowing PRs without policy defeats the purpose of ReadyLayer.

**Mitigation:**
1. **Create policy file** (`readylayer init` generates default)
2. **Use org-level policy** (if repo-level missing)
3. **Emergency mode** (use minimal default policy)

**Location:** `services/policy-engine/loader.ts`

---

### Failure Mode 4.2: Policy File Malformed

**What happens:**

```typescript
// services/policy-engine/loader.ts
try {
  const policy = yaml.parse(policyContent);
  validatePolicySchema(policy);  // Throws if invalid
} catch (error) {
  logger.error({ error, policyPath }, 'Policy file malformed');

  return {
    blocked: true,
    reason: 'Policy file syntax error',
    error: error.message,
    recommendation: 'Fix policy file syntax or run: readylayer validate-policy'
  };
}
```

**Why block?**

Malformed policy file means **governance rules are undefined**. We can't enforce rules we can't parse.

**Mitigation:**
1. **Fix syntax** (run `readylayer validate-policy` for hints)
2. **Revert to last known good policy** (if versioned)
3. **Emergency fallback** (use org-level policy)

**Location:** `services/policy-engine/loader.ts`

---

### Failure Mode 4.3: Conflicting Policy Rules

**What happens:**

When org, team, and repo policies conflict:

```typescript
// services/policy-engine/inheritance.ts
const orgPolicy = await loadOrgPolicy(organizationId);
const teamPolicy = await loadTeamPolicy(teamId);
const repoPolicy = await loadRepoPolicy(repositoryId);

// Merge policies (stricter wins)
const mergedPolicy = mergePolicies([orgPolicy, teamPolicy, repoPolicy], {
  strategy: 'stricter-wins'  // If org says 80% coverage, team can say 85%, not 75%
});

if (mergedPolicy.conflicts.length > 0) {
  logger.warn({ conflicts: mergedPolicy.conflicts },
    'Policy conflicts detected - using stricter enforcement');

  return {
    blocked: false,  // Don't block on conflicts
    warnings: mergedPolicy.conflicts,
    resolvedPolicy: mergedPolicy.resolved
  };
}
```

**Resolution strategy:**

| Conflict Type | Resolution |
|---------------|------------|
| **Coverage threshold** | Use highest threshold |
| **Security rules** | Union (apply all rules) |
| **Custom rules** | Repo-level overrides team-level overrides org-level |

**This is not a failure - conflicts are resolved deterministically.**

**Location:** `services/policy-engine/inheritance.ts`

---

## Category 5: LLM Enhancement Failures

### Failure Mode 5.1: LLM Provider Timeout

**What happens:**

```typescript
// services/llm/index.ts
try {
  const response = await provider.complete(request, {
    timeout: 60000  // 60 seconds
  });
} catch (error) {
  if (error.name === 'TimeoutError') {
    logger.warn({ provider: providerName, request },
      'LLM request timed out - continuing without LLM enhancement');

    return {
      blocked: false,  // LLM never blocks
      skipped: 'llm-enhancement',
      reason: 'LLM provider timed out',
      fallback: 'static-analysis-only'
    };
  }
  throw error;
}
```

**Why allow?**

**LLMs are enhancements, not requirements.** Core governance (security scanning, test coverage) works without LLMs.

**Fallback chain:**
1. **Primary provider** (e.g., Anthropic)
2. **Secondary provider** (e.g., OpenAI)
3. **No LLM** (static analysis only)

**Location:** `services/llm/index.ts`

---

### Failure Mode 5.2: LLM Provider Rate Limit

**What happens:**

```typescript
// services/llm/index.ts
try {
  const response = await provider.complete(request);
} catch (error) {
  if (error.statusCode === 429) {  // Rate limit
    logger.warn({ provider: providerName },
      'LLM provider rate limited - using fallback or skipping');

    // Try fallback provider
    if (fallbackProvider) {
      return await fallbackProvider.complete(request);
    }

    // No fallback - skip LLM
    return {
      blocked: false,
      skipped: 'llm-enhancement',
      reason: 'LLM provider rate limited',
      fallback: 'static-analysis-only'
    };
  }
  throw error;
}
```

**Why allow?**

Rate limits are **temporary**. Blocking all PRs because OpenAI is rate-limiting would halt development.

**Mitigation:**
1. **Fallback provider** (switch to Anthropic, OpenCode, etc.)
2. **Retry with backoff** (429 often temporary)
3. **Skip LLM** (continue with static analysis)

**Location:** `services/llm/index.ts`

---

### Failure Mode 5.3: LLM Returns Malformed Response

**What happens:**

```typescript
// services/llm/index.ts
const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';

if (!content) {
  logger.error({ data, provider: providerName },
    'LLM returned empty response');

  return {
    blocked: false,  // LLM never blocks
    skipped: 'llm-enhancement',
    reason: 'LLM response empty or malformed',
    fallback: 'static-analysis-only'
  };
}
```

**Why allow?**

LLM responses are **untrusted**. If malformed, skip and continue.

**Mitigation:**
1. **Retry** (transient error)
2. **Fallback provider**
3. **Skip LLM** (not a critical failure)

**Location:** `services/llm/index.ts`

---

## Category 6: Infrastructure Failures

### Failure Mode 6.1: Database Unreachable

**What happens:**

```typescript
// lib/prisma.ts
try {
  await prisma.$connect();
} catch (error) {
  logger.error({ error }, 'Database unreachable - blocking all requests');

  return {
    blocked: true,
    reason: 'Cannot connect to database - governance state unknown',
    error: error.message,
    recommendation: 'Check database connectivity'
  };
}
```

**Why block?**

Without database, we can't:
- Verify policy versions
- Check audit log
- Track waivers
- Enforce usage limits

**Failing open would allow ungoverned code.**

**Mitigation:**
1. **Retry connection** (automatic, 3 attempts)
2. **Alert ops team** (Pagerduty, Slack, etc.)
3. **Emergency mode** (use in-memory policy, no audit log)

**Location:** `lib/prisma.ts`

---

### Failure Mode 6.2: Redis Unavailable (Queue)

**What happens:**

```typescript
// workers/job-processor.ts
try {
  await redis.ping();
} catch (error) {
  logger.warn({ error }, 'Redis unavailable - falling back to database queue');

  // Fallback to database-backed queue
  return useDatabaseQueue();
}
```

**Why allow?**

Redis is used for **job queue**, not critical path. Fallback to database queue (slower, but works).

**Degradation:**
- **Normal:** Background jobs via Redis (fast)
- **Degraded:** Background jobs via PostgreSQL (slower)
- **Critical failure:** Synchronous processing (blocking, but works)

**Location:** `workers/job-processor.ts`

---

### Failure Mode 6.3: Network Partition

**What happens:**

If ReadyLayer service is unreachable from CI/CD:

```yaml
# .github/workflows/readylayer.yml
- name: Run ReadyLayer
  run: |
    set -e
    timeout 300 readylayer scan || {
      echo "ReadyLayer scan failed or timed out - blocking PR"
      exit 1
    }
```

**Why block?**

If we can't reach ReadyLayer, we can't verify governance. **Fail-secure.**

**Mitigation:**
1. **Retry** (network issues often transient)
2. **Health check** (verify service is up before starting scan)
3. **Circuit breaker** (if service consistently down, alert ops)

**Location:** CI/CD configuration

---

## Category 7: Input Validation Failures

### Failure Mode 7.1: Invalid Code Input

**What happens:**

```typescript
// services/review-guard/index.ts
if (!code || code.trim().length === 0) {
  return {
    blocked: true,
    reason: 'No code provided - nothing to scan',
    recommendation: 'Ensure PR includes code changes'
  };
}

if (code.length > MAX_CODE_SIZE) {  // 10MB
  return {
    blocked: true,
    reason: `Code size ${code.length} exceeds maximum ${MAX_CODE_SIZE}`,
    recommendation: 'Split large changes into multiple PRs'
  };
}
```

**Why block?**

- **Empty code:** Nothing to scan, possible API error
- **Huge code:** May indicate accidental large file commit (node_modules, build artifacts)

**Mitigation:**
1. **Verify PR has changes** (check git diff)
2. **Split large PRs** (good practice anyway)
3. **Increase limit** (if genuinely large changes)

**Location:** `services/review-guard/index.ts`

---

### Failure Mode 7.2: Unsupported File Type

**What happens:**

```typescript
// services/review-guard/file-classifier.ts
const language = detectLanguage(filePath);

if (!language) {
  logger.warn({ filePath }, 'Unsupported file type - skipping');

  return {
    blocked: false,
    skipped: filePath,
    reason: 'File type not recognized',
    recommendation: 'Add language support or configure in policy'
  };
}
```

**Why allow?**

Unsupported file types (`.exe`, `.jpg`, `.pdf`) shouldn't block PRs. They're not code.

**Mitigation:**
1. **Skip binary files** (correct behavior)
2. **Add language support** (if new programming language)
3. **Configure extensions** (in policy file)

**Location:** `services/review-guard/file-classifier.ts`

---

## Category 8: Concurrent Modification Conflicts

### Failure Mode 8.1: Policy Updated During Scan

**What happens:**

```typescript
// services/policy-engine/evaluator.ts
const policyVersion = pr.policyVersionLocked;  // Locked at PR creation

const policy = await prisma.policyPack.findFirst({
  where: {
    organizationId: pr.organizationId,
    version: policyVersion  // Use locked version, not latest
  }
});

if (!policy) {
  logger.error({ policyVersion, pr: pr.id },
    'Policy version not found - may have been deleted');

  return {
    blocked: true,
    reason: `Policy version ${policyVersion} no longer exists`,
    recommendation: 'Re-create PR to use latest policy'
  };
}
```

**Why lock policy version?**

Prevents **moving target** problem. PR should be evaluated against policy that existed when PR was created.

**Mitigation:**
1. **Policy versioning** (immutable)
2. **Lock policy at PR creation**
3. **Allow re-evaluation** (with explicit opt-in)

**Location:** `services/policy-engine/evaluator.ts`

---

### Failure Mode 8.2: Race Condition in Waiver Creation

**What happens:**

```typescript
// services/policy-engine/waivers.ts
try {
  await prisma.waiver.create({
    data: {
      organizationId,
      issueId,
      reason,
      createdBy
    }
  });
} catch (error) {
  if (error.code === 'P2002') {  // Unique constraint violation
    logger.warn({ issueId }, 'Waiver already exists - using existing');

    return await prisma.waiver.findUnique({
      where: { issueId }
    });
  }
  throw error;
}
```

**Why allow?**

If two users create waiver simultaneously, one succeeds, one fails. **Use the existing waiver.**

**This is not a failure - it's correct concurrent behavior.**

**Location:** `services/policy-engine/waivers.ts`

---

## Category 9: Cascading Failures

### Failure Mode 9.1: Multiple Checks Fail

**What happens:**

```typescript
// services/governance-engine/run-orchestrator.ts
const results = await Promise.allSettled([
  reviewGuard.scan(code),
  testEngine.checkCoverage(code),
  docSync.validateDocs(code)
]);

const failures = results.filter(r => r.status === 'rejected');
const successes = results.filter(r => r.status === 'fulfilled');

if (failures.length === results.length) {
  // Total failure
  return {
    blocked: true,
    reason: 'All governance checks failed',
    errors: failures.map(f => f.reason),
    recommendation: 'Check ReadyLayer service health'
  };
}

if (failures.length > 0) {
  // Partial failure
  logger.error({ failures }, 'Some governance checks failed');

  return {
    blocked: true,  // Fail-secure
    reason: 'Some governance checks failed',
    passed: successes.map(s => s.value),
    failed: failures.map(f => f.reason)
  };
}
```

**Why block on partial failure?**

Can't verify governance if some checks failed. **Fail-secure.**

**Mitigation:**
1. **Retry failed checks** (may be transient)
2. **Check service health** (database, network, etc.)
3. **Emergency mode** (manual review)

**Location:** `services/governance-engine/run-orchestrator.ts`

---

### Failure Mode 9.2: Dependency Chain Failure

**What happens:**

```
Database down → Can't load policy → Can't run governance → Block PR
       ↓
Redis down → Can't queue background jobs → Fall back to sync processing
       ↓
LLM down → Can't get suggestions → Continue with static analysis only
```

**Failure isolation:**

| Component | Critical? | Failure Behavior |
|-----------|-----------|------------------|
| **Database** | ✅ Yes | Block (no fallback) |
| **Policy file** | ✅ Yes | Block (no fallback) |
| **Security scanner** | ✅ Yes | Block (no fallback) |
| **Redis** | ❌ No | Degrade (use database queue) |
| **LLM** | ❌ No | Degrade (skip suggestions) |

**Location:** Multiple services

---

## Category 10: Human Error Failures

### Failure Mode 10.1: User Misconfigures Policy

**What happens:**

```yaml
# .readylayer/policy.yml (WRONG)
test_engine:
  minimum_coverage: 150  # Invalid: > 100%
```

```typescript
// services/policy-engine/validator.ts
if (policy.test_engine.minimum_coverage > 100) {
  return {
    blocked: true,
    reason: 'Invalid policy: minimum_coverage cannot exceed 100%',
    recommendation: 'Fix .readylayer/policy.yml'
  };
}
```

**Why block?**

Invalid policy indicates **configuration error**. Better to block with clear error than silently fail.

**Mitigation:**
1. **Policy validation** (run `readylayer validate-policy`)
2. **Schema validation** (Zod schemas catch errors early)
3. **Examples** (provide working templates)

**Location:** `services/policy-engine/validator.ts`

---

### Failure Mode 10.2: User Creates Waiver Without Justification

**What happens:**

```typescript
// services/policy-engine/waivers.ts
if (!reason || reason.trim().length < 10) {
  return {
    blocked: true,
    reason: 'Waiver requires detailed justification (minimum 10 characters)',
    recommendation: 'Provide specific reason for waiving this issue'
  };
}
```

**Why block?**

Waivers without justification defeat audit trail. **Require meaningful reasons.**

**Mitigation:**
1. **Enforce minimum reason length** (10 characters)
2. **Require approvals** (for high-severity waivers)
3. **Expiration** (waivers expire, must be renewed)

**Location:** `services/policy-engine/waivers.ts`

---

## Safe Degradation Patterns

### Pattern 1: Graceful Fallback

```
Primary behavior → Fallback behavior → Emergency mode → Block
```

**Example: LLM suggestions**

1. **Primary:** Use Anthropic Claude
2. **Fallback:** Use OpenAI GPT-4
3. **Emergency:** Use OpenCode baseline
4. **Block:** Skip LLM entirely (static analysis only)

---

### Pattern 2: Circuit Breaker

```typescript
// lib/circuit-breaker.ts
const breaker = new CircuitBreaker(llmProvider.complete, {
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 2,    // Close after 2 successes
  timeout: 60000,         // 60 second timeout
  resetTimeout: 30000     // Try again after 30 seconds
});

try {
  return await breaker.fire(request);
} catch (error) {
  if (breaker.opened) {
    logger.warn('LLM provider circuit breaker open - skipping');
    return { skipped: true, reason: 'circuit-breaker-open' };
  }
  throw error;
}
```

**Prevents cascading failures.**

**Location:** `lib/circuit-breaker.ts`

---

### Pattern 3: Exponential Backoff

```typescript
// lib/retry.ts
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s
      logger.warn({ attempt, delay }, 'Retrying after failure');
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

**Handles transient failures.**

**Location:** `lib/retry.ts`

---

## Observability: Detecting Failures

### Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| **Security scan failure rate** | > 5% | Page ops team |
| **Database connection errors** | > 0 | Immediate alert |
| **LLM timeout rate** | > 20% | Investigate |
| **Policy load failures** | > 0 | Immediate alert |
| **Test coverage check failures** | > 10% | Investigate |
| **Waiver creation rate** | Sudden spike | Review audit log |

### Logging Strategy

```typescript
// observability/logging.ts
logger.error({
  errorCode: 'SECURITY_SCAN_FAILED',
  organizationId: 'org-123',
  repositoryId: 'repo-456',
  prNumber: 789,
  error: error.message,
  stack: error.stack
}, 'Security scan failed - blocking PR');
```

**Structured logging enables:**
- ✅ Alerting on error codes
- ✅ Aggregating failures by org/repo
- ✅ Root cause analysis
- ✅ SLA tracking

**Location:** `observability/logging.ts`

---

## Testing Failure Modes

### Failure Mode Tests

```typescript
// tests/failure-modes/security-scanner.test.ts
describe('Security Scanner Failure Modes', () => {
  it('should block when scanner crashes', async () => {
    mockSecurityScanner.mockRejectedValue(new Error('Scanner crashed'));

    const result = await reviewGuard.scan(code);

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Security scan failed');
  });

  it('should retry on transient failure', async () => {
    mockSecurityScanner
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ issues: [] });

    const result = await reviewGuard.scan(code);

    expect(result.blocked).toBe(false);
    expect(mockSecurityScanner).toHaveBeenCalledTimes(2);
  });

  it('should use fallback on persistent failure', async () => {
    mockPrimaryScanner.mockRejectedValue(new Error('Down'));
    mockFallbackScanner.mockResolvedValue({ issues: [] });

    const result = await reviewGuard.scan(code);

    expect(result.blocked).toBe(false);
    expect(mockFallbackScanner).toHaveBeenCalled();
  });
});
```

**Location:** `tests/failure-modes/`

---

## Summary: Failure Mode Classification

| Category | Default Behavior | Rationale |
|----------|------------------|-----------|
| **Security check failure** | ❌ **Block** | Can't verify safety |
| **Secrets detection failure** | ❌ **Block** | Assume secrets present |
| **Test framework not found** | ❌ **Block** | Can't verify coverage |
| **Coverage parsing failure** | ❌ **Block** | Tests may not have run |
| **Policy file missing** | ❌ **Block** | No governance defined |
| **Policy file malformed** | ❌ **Block** | Can't parse rules |
| **Database unreachable** | ❌ **Block** | State unknown |
| **LLM timeout** | ✅ **Allow (warn)** | Enhancement, not gate |
| **LLM rate limit** | ✅ **Allow (warn)** | Temporary condition |
| **Redis unavailable** | ✅ **Degrade** | Fallback to database queue |
| **Dependency scan timeout** | ⚠️ **Cache fallback** | Use recent results |
| **Unsupported file type** | ✅ **Skip** | Not code, ignore |
| **Empty code input** | ❌ **Block** | Nothing to scan |
| **Concurrent waiver** | ✅ **Use existing** | Idempotent operation |

---

## Related Documents

- [Governance Invariants](./GOVERNANCE_INVARIANTS.md) - What ReadyLayer enforces
- [Model & Tool Agnosticity](./MODEL_AND_TOOL_AGNOSTICITY.md) - LLM independence
- [Stack Agnosticity](./STACK_AGNOSTICITY.md) - Platform independence
- [Architecture Deep Dives](./architecture/deep-dives.md) - Technical details

---

<div align="center">

**ReadyLayer fails safely, never silently.**

When in doubt, block. Transparency over convenience.

</div>
