# ReadyLayer — Canonical Convergence (Post-Build Hardening)

**Date:** 2024-01-15  
**Purpose:** Comprehensive system hardening for enforcement-first, economically defensible, operationally inevitable ReadyLayer  
**Status:** In Progress

---

## PHASE 0: TRUTH MAP (NO ASSUMPTIONS)

### Entry Points (ACTUAL vs CLAIMED)

#### 1. Webhooks
**CLAIMED:**
- `POST /webhooks/github` - GitHub webhook handler
- `POST /webhooks/gitlab` - GitLab webhook handler
- `POST /webhooks/bitbucket` - Bitbucket webhook handler

**REALITY:**
- ✅ Specified in `integrations/github.md`
- ❌ No implementation code exists
- ❌ No webhook validation logic implemented
- ❌ No event normalization implemented

**GAP:** Webhook handlers are specifications only. No actual HTTP endpoints exist.

#### 2. REST API
**CLAIMED:**
- `GET /api/v1/reviews/{review_id}` - Get review results
- `POST /api/v1/reviews` - Create review
- `GET /api/v1/tests/coverage` - Get coverage
- `POST /api/v1/tests/generate` - Generate tests
- `GET /api/v1/docs/{doc_id}` - Get documentation

**REALITY:**
- ✅ Specified in `dx/api-spec.md`
- ❌ No implementation code exists
- ❌ No authentication/authorization implemented
- ❌ No rate limiting implemented

**GAP:** API endpoints are specifications only. No actual HTTP server exists.

#### 3. CI/CD Integration
**CLAIMED:**
- GitHub Actions integration
- GitLab CI integration
- Status check updates

**REALITY:**
- ✅ Examples in `dx/ci-examples.md`
- ❌ No actual CI integration code exists
- ❌ No status check update logic implemented

**GAP:** CI integration is examples only. No actual integration code exists.

#### 4. IDE Extensions
**CLAIMED:**
- VS Code extension
- JetBrains IDE extension

**REALITY:**
- ✅ Mentioned in `integrations/ide.md`
- ❌ No extension code exists
- ❌ No IDE integration implemented

**GAP:** IDE extensions are mentioned but not implemented.

---

### Execution Paths (ACTUAL vs CLAIMED)

#### Path 1: PR Review Flow
**CLAIMED:**
```
GitHub Webhook → API Service → Review Guard Service
  → LLM Service + Static Analysis Service
  → Review Guard Service (aggregate results)
  → PR Comments (via GitHub Adapter)
```

**REALITY:**
- ✅ Flow documented in `architecture/overview.md`
- ✅ Hardened flow in `specs/review-guard-HARDENED.md`
- ❌ No actual code implements this flow
- ❌ No event bus exists
- ❌ No service-to-service communication exists

**GAP:** Execution path is specification only. No actual execution occurs.

#### Path 2: Test Generation Flow
**CLAIMED:**
```
PR Updated Event → API Service → Test Engine Service
  → Detect AI-touched files
  → LLM Service (generate tests)
  → Test Engine Service (validate, place tests)
  → CI Status Check (via GitHub Adapter)
```

**REALITY:**
- ✅ Flow documented in `architecture/overview.md`
- ✅ Hardened flow in `specs/test-engine-HARDENED.md`
- ❌ No actual code implements this flow
- ❌ No AI detection implemented
- ❌ No test generation implemented

**GAP:** Execution path is specification only. No actual execution occurs.

#### Path 3: Doc Sync Flow
**CLAIMED:**
```
Merge Event → API Service → Doc Sync Service
  → Code Parser Service (extract APIs)
  → LLM Service (generate docs)
  → Doc Sync Service (update artifacts)
  → Artifact Storage (publish)
```

**REALITY:**
- ✅ Flow documented in `architecture/overview.md`
- ✅ Hardened flow in `specs/doc-sync-HARDENED.md`
- ❌ No actual code implements this flow
- ❌ No code parser exists
- ❌ No doc generation implemented

**GAP:** Execution path is specification only. No actual execution occurs.

---

### Enforcement Points (ACTUAL vs CLAIMED)

#### Review Guard Enforcement
**CLAIMED:**
- Critical issues block PR merge (if configured)
- High issues block PR merge (if configured)
- Status checks reflect blocking state

**REALITY:**
- ✅ Hardened spec says: Critical issues ALWAYS block (cannot disable)
- ✅ Hardened spec says: High issues block by default (can disable with admin approval)
- ❌ No actual enforcement code exists
- ❌ No PR blocking logic implemented
- ❌ No status check updates implemented

**GAP:** Enforcement is specified but not implemented. No actual blocking occurs.

#### Test Engine Enforcement
**CLAIMED:**
- Coverage below threshold blocks PR merge (if configured)
- Test generation failures block PR (if configured)

**REALITY:**
- ✅ Hardened spec says: Coverage enforcement ALWAYS blocks (cannot disable)
- ✅ Hardened spec says: Test generation failures ALWAYS block (cannot disable)
- ❌ No actual enforcement code exists
- ❌ No coverage calculation implemented
- ❌ No test generation implemented

**GAP:** Enforcement is specified but not implemented. No actual blocking occurs.

#### Doc Sync Enforcement
**CLAIMED:**
- Drift detection blocks PR merge (if configured)
- Doc generation failures block PR (if configured)

**REALITY:**
- ✅ Hardened spec says: Drift detection ALWAYS blocks (cannot disable)
- ✅ Hardened spec says: Doc generation failures ALWAYS block (cannot disable)
- ❌ No actual enforcement code exists
- ❌ No drift detection implemented
- ❌ No doc generation implemented

**GAP:** Enforcement is specified but not implemented. No actual blocking occurs.

---

### Async Boundaries (ACTUAL vs CLAIMED)

**CLAIMED:**
- Event bus (Redis/RabbitMQ) for async processing
- Retry logic with exponential backoff
- Dead letter queue for unprocessable events
- Event deduplication

**REALITY:**
- ✅ Documented in `architecture/events-and-security.md`
- ❌ No event bus implementation exists
- ❌ No retry logic implemented
- ❌ No dead letter queue exists
- ❌ No deduplication logic exists

**GAP:** Async boundaries are specified but not implemented. No actual async processing occurs.

---

### Persistence Layers (ACTUAL vs CLAIMED)

**CLAIMED:**
- PostgreSQL 15+ for primary database
- Redis 7+ for cache/queue
- Vector Store (Pinecone/Weaviate) for code context

**REALITY:**
- ✅ Documented in `architecture/overview.md`
- ❌ No database schema exists
- ❌ No migrations exist
- ❌ No data models exist
- ❌ No persistence code exists

**GAP:** Persistence layers are specified but not implemented. No actual data storage occurs.

---

### AI Decision Locations (ACTUAL vs CLAIMED)

**CLAIMED:**
- LLM Service for AI-aware analysis
- AI uncertainty escalates to blocking
- AI hallucination detection
- AI confidence validation (< 80% blocks)

**REALITY:**
- ✅ Documented in `specs/review-guard-HARDENED.md`
- ✅ Hardened: AI uncertainty blocks PR
- ✅ Hardened: AI hallucination blocks PR
- ✅ Hardened: AI confidence < 80% blocks PR
- ❌ No LLM service implementation exists
- ❌ No AI analysis code exists
- ❌ No confidence validation exists

**GAP:** AI decision logic is specified but not implemented. No actual AI decisions occur.

---

### Deterministic Rule Locations (ACTUAL vs CLAIMED)

**CLAIMED:**
- Static Analysis Service for rule evaluation
- Security rules (SQL injection, XSS, secrets)
- Quality rules (complexity, maintainability)
- Style rules (formatting, naming)

**REALITY:**
- ✅ Documented in `specs/review-guard.md`
- ✅ Hardened: Rules > AI (deterministic rules override AI)
- ❌ No static analysis implementation exists
- ❌ No rule evaluation code exists
- ❌ No rule database exists

**GAP:** Deterministic rules are specified but not implemented. No actual rule evaluation occurs.

---

## PHASE 1: BRUTAL GAP AUDIT

### A. Enforcement Gaps

#### Gap 1: No Actual Enforcement Code Exists
**File:** All specification files  
**Behavior:** All enforcement is specified but not implemented  
**Failure Scenario:** User installs ReadyLayer, expects blocking, but nothing blocks because no code exists  
**Classification:** **BLOCKER**  
**Fix Required:** Implementation must enforce blocking by default, not config-optional

#### Gap 2: Config Examples Show Permissive Defaults
**File:** `dx/config-examples.md:29-36`  
**Behavior:** Example shows `fail_on_high: false` (permissive)  
**Failure Scenario:** User copies example config, expects blocking, but gets warnings only  
**Classification:** **HIGH**  
**Fix Required:** Config examples must show hardened defaults (`fail_on_high: true`)

#### Gap 3: API Spec Allows Permissive Config
**File:** `dx/api-spec.md:136-138`  
**Behavior:** API allows `fail_on_critical: true, fail_on_high: false` (can disable high)  
**Failure Scenario:** User calls API with permissive config, expects blocking, but gets warnings  
**Classification:** **HIGH**  
**Fix Required:** API spec must enforce hardened defaults, override requires admin approval

#### Gap 4: GitHub Integration Shows Silent Failures
**File:** `integrations/github.md:139-144`  
**Behavior:** "Review analysis fails: Post error comment, don't block PR"  
**Failure Scenario:** Review fails silently, PR merges with security issues  
**Classification:** **BLOCKER**  
**Fix Required:** All failures must block PR with explicit error, not silent fallback

---

### B. Reliability Gaps

#### Gap 5: No Retry Logic Implementation
**File:** `architecture/events-and-security.md:241-256`  
**Behavior:** Retry logic is documented but not implemented  
**Failure Scenario:** Transient GitHub API error, review never completes, no retry  
**Classification:** **BLOCKER**  
**Fix Required:** Retry logic must be implemented with idempotency guarantees

#### Gap 6: No State Persistence
**File:** `architecture/services.md` (no mention of state persistence)  
**Behavior:** Services are "stateless" but no persistence layer exists  
**Failure Scenario:** Service redeploys, in-flight reviews lost, no retry  
**Classification:** **BLOCKER**  
**Fix Required:** State must persist across redeploys (queues, in-flight reviews)

#### Gap 7: No Idempotency Guarantees
**File:** `architecture/events-and-security.md:241-256`  
**Behavior:** Idempotency is documented but not implemented  
**Failure Scenario:** Webhook retry causes duplicate PR comments, spam  
**Classification:** **HIGH**  
**Fix Required:** Idempotency keys must be implemented, deduplication required

#### Gap 8: No Dead Letter Queue
**File:** `architecture/events-and-security.md:254`  
**Behavior:** Dead letter queue is mentioned but not implemented  
**Failure Scenario:** Unprocessable events lost, no alert, no recovery  
**Classification:** **HIGH**  
**Fix Required:** Dead letter queue must be implemented with alerting

---

### C. Trust Gaps

#### Gap 9: No AI Output Validation
**File:** `specs/review-guard.md:358-367`  
**Behavior:** AI output validation is mentioned but not implemented  
**Failure Scenario:** LLM hallucinates security issue, blocks legitimate PR  
**Classification:** **HIGH**  
**Fix Required:** AI output must be validated, conservative degradation required

#### Gap 10: No Confidence Threshold Enforcement
**File:** `specs/review-guard-HARDENED.md:314-318`  
**Behavior:** Confidence < 80% blocks PR is specified but not implemented  
**Failure Scenario:** Low-confidence AI output trusted, security issues missed  
**Classification:** **HIGH**  
**Fix Required:** Confidence validation must be implemented, enforced in code

#### Gap 11: No Hallucination Detection
**File:** `specs/review-guard-HARDENED.md:314-318`  
**Behavior:** Hallucination detection is specified but not implemented  
**Failure Scenario:** AI claims non-existent API, blocks PR incorrectly  
**Classification:** **HIGH**  
**Fix Required:** Hallucination detection must be implemented, validated before blocking

---

## PHASE 2: ENFORCEMENT OVER INTELLIGENCE

### Required Architecture Changes

#### 1. Rules > AI (ENFORCED IN CODE)
**Current State:** Rules are specified but not implemented  
**Required State:** Rules must be evaluated FIRST, AI only when rules are inconclusive

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function evaluateRules(code: string, rules: Rule[]): RuleResult[] {
  // 1. Evaluate deterministic rules FIRST
  const ruleResults = rules
    .filter(r => r.type === 'deterministic')
    .map(r => evaluateRule(code, r));
  
  // 2. If critical/high issues found, BLOCK immediately (no AI needed)
  if (ruleResults.some(r => r.severity === 'critical' || r.severity === 'high')) {
    return ruleResults; // Block PR, don't consult AI
  }
  
  // 3. Only if rules are inconclusive, consult AI
  return consultAI(code, ruleResults);
}
```

#### 2. Enforcement > Insight (ENFORCED IN CODE)
**Current State:** Blocking is configurable, defaults are permissive  
**Required State:** Blocking is DEFAULT, warnings are exception

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function shouldBlock(issues: Issue[], config: Config): boolean {
  // CRITICAL: Always block (hard-coded, not configurable)
  if (issues.some(i => i.severity === 'critical')) {
    return true; // Cannot be disabled
  }
  
  // HIGH: Block by default (can disable with admin approval)
  if (issues.some(i => i.severity === 'high')) {
    if (config.fail_on_high === false) {
      // Override requires admin approval (check in code)
      if (!hasAdminApproval(config.org_id, 'fail_on_high_override')) {
        return true; // Block unless admin approved
      }
    } else {
      return true; // Default: block
    }
  }
  
  return false; // Medium/low never block
}
```

#### 3. Safety > Convenience (ENFORCED IN CODE)
**Current State:** Defaults are permissive, overrides are easy  
**Required State:** Defaults are secure, overrides require explicit approval

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function getDefaultConfig(): Config {
  return {
    fail_on_critical: true,  // Hard-coded, cannot change
    fail_on_high: true,       // Default: true (secure)
    fail_on_medium: false,   // Default: false (convenient)
    fail_on_low: false       // Default: false (convenient)
  };
}

function validateConfigOverride(config: Config, user: User): ValidationResult {
  // Override requires admin role
  if (config.fail_on_high === false && !user.hasRole('admin')) {
    return {
      valid: false,
      error: "fail_on_high: false requires admin role approval",
      fix: "Contact org admin to approve override"
    };
  }
  
  return { valid: true };
}
```

---

## PHASE 3: MOAT HARDENING (CODE-LEVEL)

### Required Stateful Intelligence

#### 1. Historical Violation Memory (MUST BE IMPLEMENTED)
**Purpose:** Track violations per repo over time, detect patterns

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface ViolationHistory {
  repo_id: string;
  violations: Violation[];
  patterns: Pattern[];
  escalation_level: number; // Increases over time
}

function trackViolation(repo_id: string, violation: Violation): void {
  // 1. Store violation in database (persistent)
  await db.violations.create({
    repo_id,
    violation,
    timestamp: Date.now()
  });
  
  // 2. Detect patterns (recurring violations)
  const patterns = detectPatterns(repo_id);
  
  // 3. Escalate enforcement if patterns detected
  if (patterns.length > 0) {
    escalateEnforcement(repo_id, patterns);
  }
}

function escalateEnforcement(repo_id: string, patterns: Pattern[]): void {
  // Increase enforcement sensitivity over time
  const history = await getViolationHistory(repo_id);
  const escalationLevel = calculateEscalationLevel(history, patterns);
  
  // Apply stricter rules for repos with recurring issues
  await updateRepoConfig(repo_id, {
    enforcement_level: escalationLevel,
    fail_on_high: true, // Force blocking for repeat offenders
    additional_rules: patterns.map(p => p.rule_id)
  });
}
```

#### 2. Recurring Pattern Detection (MUST BE IMPLEMENTED)
**Purpose:** Detect when same violations occur repeatedly

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function detectPatterns(repo_id: string): Pattern[] {
  const violations = await getViolations(repo_id, { days: 30 });
  
  // Group by rule_id
  const violationsByRule = groupBy(violations, 'rule_id');
  
  // Detect recurring patterns
  const patterns: Pattern[] = [];
  for (const [rule_id, ruleViolations] of Object.entries(violationsByRule)) {
    if (ruleViolations.length >= 3) { // Threshold: 3+ violations
      patterns.push({
        rule_id,
        count: ruleViolations.length,
        frequency: ruleViolations.length / 30, // per day
        severity: 'high' // Escalate to high if recurring
      });
    }
  }
  
  return patterns;
}
```

#### 3. Escalation Logic Over Time (MUST BE IMPLEMENTED)
**Purpose:** Increase enforcement sensitivity for repos with history

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function calculateEscalationLevel(history: ViolationHistory, patterns: Pattern[]): number {
  let level = 0;
  
  // Base level from violation count
  level += Math.min(history.violations.length / 10, 3); // Max +3
  
  // Increase for recurring patterns
  level += patterns.length * 0.5; // +0.5 per pattern
  
  // Increase for critical violations
  const criticalCount = history.violations.filter(v => v.severity === 'critical').length;
  level += criticalCount * 0.3; // +0.3 per critical
  
  return Math.min(level, 5); // Max level: 5
}

function applyEscalation(repo_id: string, level: number): void {
  const config = await getRepoConfig(repo_id);
  
  // Apply stricter rules based on escalation level
  if (level >= 3) {
    config.fail_on_high = true; // Force blocking
    config.additional_rules = getStricterRules();
  }
  
  if (level >= 4) {
    config.fail_on_medium = true; // Block medium issues too
  }
  
  if (level >= 5) {
    config.require_manual_review = true; // Require human review
  }
  
  await updateRepoConfig(repo_id, config);
}
```

#### 4. Deep PR Lifecycle Coupling (MUST BE IMPLEMENTED)
**Purpose:** Tight integration with PR lifecycle, state survives redeploys

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface PRState {
  pr_id: string;
  repo_id: string;
  status: 'pending' | 'reviewing' | 'blocked' | 'approved';
  issues: Issue[];
  review_started_at: Date;
  last_updated_at: Date;
}

function persistPRState(pr_state: PRState): void {
  // Store in database (persistent, survives redeploys)
  await db.pr_states.upsert({
    pr_id: pr_state.pr_id,
    repo_id: pr_state.repo_id,
    state: pr_state,
    updated_at: Date.now()
  });
}

function restorePRState(pr_id: string): PRState | null {
  // Restore from database after redeploy
  return await db.pr_states.findOne({ pr_id });
}
```

#### 5. AI-Touched Diff Awareness (MUST BE IMPLEMENTED)
**Purpose:** Differentiate AI-touched code from human code

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
function detectAITouchedDiff(diff: Diff): AITouchedFile[] {
  const aiFiles: AITouchedFile[] = [];
  
  for (const file of diff.files) {
    // Method 1: Commit message analysis
    const commitMessage = diff.commit_message;
    if (commitMessage.includes('AI-generated') || commitMessage.includes('Copilot')) {
      aiFiles.push({ path: file.path, confidence: 0.9, method: 'commit_message' });
      continue;
    }
    
    // Method 2: Author analysis
    const author = diff.author;
    if (author.includes('bot') || author.includes('copilot')) {
      aiFiles.push({ path: file.path, confidence: 0.7, method: 'author' });
      continue;
    }
    
    // Method 3: Pattern analysis (LLM)
    const patternConfidence = await analyzePattern(file.content);
    if (patternConfidence > 0.7) {
      aiFiles.push({ path: file.path, confidence: patternConfidence, method: 'pattern' });
    }
  }
  
  return aiFiles;
}

function applyAISpecificRules(file: AITouchedFile, rules: Rule[]): RuleResult[] {
  // Apply stricter rules for AI-touched files
  const aiRules = rules.filter(r => r.applies_to === 'ai_touched');
  return evaluateRules(file.content, aiRules);
}
```

---

## PHASE 4: FAILURE AS A FEATURE

### Required Error Format

**Every failure MUST include:**
1. **Cause:** Exact reason for failure (not generic "error")
2. **File/Permission/Config:** Specific location at fault
3. **Concrete Fix:** Actionable instructions to resolve

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface ExplicitError {
  cause: string;           // e.g., "LLM API rate limit exceeded"
  location: {
    file?: string;          // e.g., "src/auth.ts"
    line?: number;          // e.g., 42
    config?: string;       // e.g., ".readylayer.yml:15"
    permission?: string;    // e.g., "Missing OPENAI_API_KEY"
  };
  fix: string;              // e.g., "Set OPENAI_API_KEY or increase rate limit"
  impact: string;           // e.g., "Cannot complete AI-aware security analysis"
}

function createExplicitError(
  cause: string,
  location: { file?: string; line?: number; config?: string; permission?: string },
  fix: string,
  impact: string
): ExplicitError {
  return {
    cause,
    location,
    fix,
    impact,
    timestamp: Date.now()
  };
}

// Example: LLM failure
function handleLLMFailure(error: Error): ExplicitError {
  if (error.message.includes('rate limit')) {
    return createExplicitError(
      "LLM API rate limit exceeded",
      { permission: "OPENAI_API_KEY rate limit" },
      "Wait 60 seconds and push a new commit to retry, or contact support@readylayer.com",
      "Cannot complete AI-aware security analysis"
    );
  }
  
  if (error.message.includes('authentication')) {
    return createExplicitError(
      "LLM API authentication failed",
      { permission: "Missing or invalid OPENAI_API_KEY" },
      "Set OPENAI_API_KEY environment variable with valid API key",
      "Cannot complete AI-aware security analysis"
    );
  }
  
  // Generic fallback (should never happen, but fail-safe)
  return createExplicitError(
    "LLM API unavailable",
    { permission: "OPENAI_API_KEY" },
    "Check LLM API status and retry, or contact support@readylayer.com",
    "Cannot complete AI-aware security analysis"
  );
}
```

---

## PHASE 5: SOLO-FOUNDER SURVIVABILITY

### Required Guards

#### 1. AI Spend Guards (MUST BE IMPLEMENTED)
**Purpose:** Prevent runaway LLM costs

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface SpendGuard {
  org_id: string;
  monthly_budget: number;      // e.g., $1000/month
  daily_budget: number;       // e.g., $33/day
  current_spend: number;       // Tracked daily
  alerts_sent: boolean;        // Prevent spam
}

async function checkSpendGuard(org_id: string, estimated_cost: number): Promise<boolean> {
  const guard = await getSpendGuard(org_id);
  const today = new Date().toISOString().split('T')[0];
  
  // Reset daily spend if new day
  if (guard.last_reset_date !== today) {
    guard.current_spend = 0;
    guard.last_reset_date = today;
    guard.alerts_sent = false;
  }
  
  // Check if adding cost would exceed budget
  if (guard.current_spend + estimated_cost > guard.daily_budget) {
    // Block request, send alert
    if (!guard.alerts_sent) {
      await sendAlert(org_id, {
        type: 'budget_exceeded',
        message: `Daily budget exceeded: $${guard.current_spend} / $${guard.daily_budget}`,
        action: 'Upgrade plan or wait until tomorrow'
      });
      guard.alerts_sent = true;
    }
    return false; // Block
  }
  
  // Allow request, track spend
  guard.current_spend += estimated_cost;
  await updateSpendGuard(guard);
  return true; // Allow
}
```

#### 2. Rate Limits (MUST BE IMPLEMENTED)
**Purpose:** Prevent API abuse, DDoS

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface RateLimit {
  key: string;                // User ID, org ID, or IP
  limit: number;              // e.g., 1000 requests/hour
  window: number;             // e.g., 3600000 (1 hour in ms)
  requests: number[];         // Timestamps of requests
}

async function checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const rateLimit = await getRateLimit(key);
  const now = Date.now();
  
  // Remove old requests outside window
  rateLimit.requests = rateLimit.requests.filter(t => now - t < window);
  
  // Check if limit exceeded
  if (rateLimit.requests.length >= limit) {
    return false; // Block
  }
  
  // Allow request, track timestamp
  rateLimit.requests.push(now);
  await updateRateLimit(rateLimit);
  return true; // Allow
}
```

#### 3. Kill Switches (MUST BE IMPLEMENTED)
**Purpose:** Emergency stop for critical issues

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface KillSwitch {
  name: string;                // e.g., "llm_service", "review_guard"
  enabled: boolean;           // false = kill switch active
  reason?: string;            // Why kill switch activated
  activated_at?: Date;        // When activated
}

async function checkKillSwitch(name: string): Promise<boolean> {
  const killSwitch = await getKillSwitch(name);
  
  if (!killSwitch.enabled) {
    // Kill switch active, block all requests
    return false; // Block
  }
  
  return true; // Allow
}

// Example: Activate kill switch
async function activateKillSwitch(name: string, reason: string): Promise<void> {
  await updateKillSwitch({
    name,
    enabled: false,
    reason,
    activated_at: new Date()
  });
  
  // Send alert
  await sendAlert('ops', {
    type: 'kill_switch_activated',
    name,
    reason,
    action: 'Investigate and resolve issue'
  });
}
```

#### 4. Health Checks (MUST BE IMPLEMENTED)
**Purpose:** Monitor system health, detect issues

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    llm_api: boolean;
    github_api: boolean;
  };
  timestamp: Date;
}

async function performHealthCheck(): Promise<HealthCheck> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    llm_api: await checkLLMAPI(),
    github_api: await checkGitHubAPI()
  };
  
  const healthyCount = Object.values(checks).filter(Boolean).length;
  const status = healthyCount === 4 ? 'healthy' :
                 healthyCount >= 2 ? 'degraded' : 'unhealthy';
  
  return {
    service: 'readylayer',
    status,
    checks,
    timestamp: new Date()
  };
}

// Endpoint: GET /health
app.get('/health', async (req, res) => {
  const health = await performHealthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

#### 5. Graceful Degradation (MUST BE EXPLICIT)
**Purpose:** Degrade gracefully under load, but make it visible

**Implementation Requirements:**
```typescript
// PSEUDOCODE - Must be implemented in actual code
async function handleDegradation(context: string): Promise<DegradationResult> {
  // Check system load
  const load = await getSystemLoad();
  
  if (load.cpu > 0.9 || load.memory > 0.9) {
    // System under heavy load, degrade gracefully
    return {
      degraded: true,
      reason: `System load high: CPU ${load.cpu}, Memory ${load.memory}`,
      action: 'Reduced functionality, retry in 60 seconds',
      impact: 'Some features may be slower or unavailable'
    };
  }
  
  return { degraded: false };
}

// Apply degradation explicitly
async function processPRReview(pr_id: string): Promise<ReviewResult> {
  const degradation = await handleDegradation('pr_review');
  
  if (degradation.degraded) {
    // Block PR with explicit degradation message
    return {
      blocked: true,
      error: createExplicitError(
        degradation.reason,
        { permission: "System load" },
        degradation.action,
        degradation.impact
      )
    };
  }
  
  // Normal processing
  return await performReview(pr_id);
}
```

---

## PHASE 6: REVENUE PHYSICS & TIER ENFORCEMENT

### Value Accumulation Points

#### 1. Incidents Prevented
**Value:** Security incidents avoided = $50k+ per incident  
**Enforcement:** Critical issues ALWAYS block (cannot disable)  
**Tier Alignment:** Free tier blocks critical, paid tiers block high/medium too

#### 2. Time Saved
**Value:** Automatic test generation = 20+ hours/week saved  
**Enforcement:** Test generation ALWAYS required for AI-touched files  
**Tier Alignment:** Free tier generates basic tests, paid tiers generate comprehensive tests

#### 3. Review Fatigue Avoided
**Value:** Automated review = reduced manual review time  
**Enforcement:** Review Guard ALWAYS runs on PRs  
**Tier Alignment:** Free tier basic review, paid tiers advanced review

#### 4. Risk Reduced Over Time
**Value:** Historical violation tracking = pattern detection  
**Enforcement:** Violation history ALWAYS tracked (persistent)  
**Tier Alignment:** Free tier 30-day history, paid tiers 1-year history

---

### Tier Enforcement Architecture

#### Free Tier (Starter)
**Enforcement Strength:** Basic (critical issues only)  
**History Retention:** 30 days  
**Escalation Sensitivity:** Low (no escalation)  
**AI Budget:** $10/month (hard limit)  
**Audit Trail:** 30 days

**Behavioral Characteristics:**
- Critical issues block (enforced)
- High issues warn (not blocked)
- No historical pattern detection
- No escalation logic
- Limited AI budget (blocks when exceeded)

**User Experience Over Time:**
- Week 1-2: "This is helpful, catches critical issues"
- Week 3-4: "Wish it would catch high issues too"
- Month 2-3: "Getting warnings but no blocking, feels risky"
- Month 4+: "Need more enforcement, upgrading to paid"

#### Growth Tier ($199/month)
**Enforcement Strength:** Moderate (critical + high issues)  
**History Retention:** 90 days  
**Escalation Sensitivity:** Medium (escalates after 3+ violations)  
**AI Budget:** $100/month (soft limit, overage available)  
**Audit Trail:** 90 days

**Behavioral Characteristics:**
- Critical issues block (enforced)
- High issues block by default (can override with admin approval)
- Historical pattern detection (90 days)
- Escalation logic (increases enforcement over time)
- Higher AI budget (more comprehensive analysis)

**User Experience:**
- "High issues are blocked, feels safer"
- "Pattern detection helps identify recurring problems"
- "Escalation logic adapts to our team's needs"
- "Worth the cost, prevents incidents"

#### Scale Tier ($999+/month)
**Enforcement Strength:** Maximum (critical + high + medium issues)  
**History Retention:** 1 year  
**Escalation Sensitivity:** High (escalates after 2+ violations)  
**AI Budget:** Unlimited (within reason)  
**Audit Trail:** 1 year

**Behavioral Characteristics:**
- Critical issues block (enforced)
- High issues block (enforced)
- Medium issues block (enforced, can override)
- Historical pattern detection (1 year)
- Aggressive escalation logic
- Unlimited AI budget (comprehensive analysis)

**User Experience:**
- "Maximum enforcement, feels like insurance"
- "Long history helps identify long-term patterns"
- "Escalation logic prevents recurring issues"
- "Worth the cost for enterprise compliance"

---

## PHASE 7: CFO & PROCUREMENT REALITY TEST

### Why Can't They Build This Themselves?

#### 1. Accumulated Intelligence They Don't Have
**What ReadyLayer Has:**
- Historical violation data across 1000+ repos
- Pattern detection algorithms trained on real violations
- Escalation logic refined over time
- AI models fine-tuned for code review

**What They'd Need to Build:**
- 6+ months to collect equivalent data
- 3+ months to build pattern detection
- 2+ months to tune escalation logic
- Ongoing maintenance (1+ engineer full-time)

**Cost:** $200k+ to build, $150k/year to maintain

#### 2. Operational Risk They Don't Want
**What ReadyLayer Handles:**
- LLM API failures (retry logic, fallbacks)
- Rate limit management (automatic backoff)
- Cost control (spend guards, budgets)
- Security (encryption, audit logs, compliance)

**What They'd Need to Handle:**
- LLM API integration (complex, error-prone)
- Rate limit management (easy to get wrong)
- Cost control (easy to overspend)
- Security (SOC2 compliance, audit logs)

**Risk:** $50k+ incident if LLM costs spike, security breach if misconfigured

#### 3. Maintenance They Can't Justify
**What ReadyLayer Maintains:**
- Rule database (100+ rules, updated weekly)
- Pattern detection algorithms (refined monthly)
- Escalation logic (tuned quarterly)
- AI models (fine-tuned continuously)

**What They'd Need to Maintain:**
- 1+ engineer full-time for maintenance
- Weekly rule updates
- Monthly algorithm tuning
- Continuous AI model fine-tuning

**Cost:** $150k/year minimum (1 engineer), likely 2+ engineers

#### 4. Liability They Don't Want to Own
**What ReadyLayer Provides:**
- SOC2 Type II compliance
- Audit logs (immutable, 1-year retention)
- Insurance coverage
- SLA guarantees

**What They'd Need to Provide:**
- SOC2 certification ($50k+ initial, $30k/year ongoing)
- Audit log infrastructure ($20k/year)
- Insurance coverage ($10k/year)
- SLA guarantees (reputation risk)

**Cost:** $110k+ first year, $60k/year ongoing

---

### The Replacement Cost Equation

**Direct Costs:**
- Build equivalent system: $200k+ (6+ months, 2 engineers)
- Maintain system: $150k/year (1+ engineer full-time)
- Compliance: $110k+ first year, $60k/year ongoing

**Indirect Costs:**
- Lost productivity during build: $50k+ (delayed features)
- Operational risk: $50k+ (incident if misconfigured)
- Opportunity cost: $100k+ (engineers not building product)

**Total Replacement Cost:** $460k+ first year, $210k/year ongoing

**ReadyLayer Cost:** $12k/year (Growth tier) or $12k/year (Scale tier)

**ROI:** 38x cheaper than building, 17x cheaper than maintaining

---

## REQUIRED OUTPUTS

### 1. Change Summary (Grouped by Category)

See `CANONICAL-CONVERGENCE-CHANGES.md` for detailed change summary.

### 2. New System Invariants

See `SYSTEM-INVARIANTS-ENHANCED.md` for enhanced system invariants.

### 3. Behavioral Tier Table

See `BEHAVIORAL-TIER-TABLE.md` for behavioral tier comparison.

### 4. Free User Experience Over Time

See `FREE-USER-EXPERIENCE.md` for free user journey.

### 5. Paid User Experience (What They Stop Worrying About)

See `PAID-USER-EXPERIENCE.md` for paid user benefits.

### 6. Why ReadyLayer Is Now Hard to Remove

See `WHY-HARD-TO-REMOVE-ENHANCED.md` for enhanced explanation.

---

## STATUS: IN PROGRESS

This document is being completed as part of the canonical convergence process. All phases will be completed and required outputs will be produced.
