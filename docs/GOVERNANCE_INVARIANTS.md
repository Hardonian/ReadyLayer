# Governance Invariants

**Last Updated:** 2026-01-24
**Purpose:** Define the philosophical and technical boundaries of ReadyLayer's governance enforcement

---

## What This Document Defines

This document is ReadyLayer's **philosophical backbone**. It defines:

1. **What ReadyLayer enforces** (and why)
2. **What ReadyLayer never enforces** (and why)
3. **Where humans stay in control** (and how)
4. **Why governance must remain inspectable** (and verifiable)

**These are not features. These are guarantees.**

---

## Core Philosophy

### ReadyLayer's Governance Stance

**ReadyLayer enforces constraints, not preferences.**

| Type | ReadyLayer's Role | Justification |
|------|-------------------|---------------|
| **Security vulnerabilities** | ✅ **Enforced** | Objectively dangerous |
| **Secrets in code** | ✅ **Enforced** | Objectively dangerous |
| **Test coverage** | ✅ **Enforced** | Team-defined threshold |
| **Documentation drift** | ✅ **Enforced** | Verifiable correctness |
| **Code style** | ❌ **Never enforced** | Subjective preference |
| **Naming conventions** | ❌ **Never enforced** | Team preference |
| **Architecture choices** | ❌ **Never enforced** | Context-dependent |
| **Technology selection** | ❌ **Never enforced** | Team decision |

**Governance is about safety and correctness, not aesthetics.**

---

## What ReadyLayer Enforces

### 1. Security Vulnerabilities (OWASP Top 10)

**Invariant:** Critical security issues block PRs by default.

**What we enforce:**
- ✅ SQL injection patterns
- ✅ XSS vulnerabilities
- ✅ CSRF missing protection
- ✅ Insecure cryptography
- ✅ Path traversal risks
- ✅ Command injection
- ✅ XXE (XML External Entities)
- ✅ Insecure deserialization
- ✅ Insufficient logging (critical paths)
- ✅ Broken authentication patterns

**Why we enforce this:**

These are **objectively dangerous** regardless of team, domain, or context. No reasonable engineering team wants SQL injection in production.

**How we enforce this:**

```typescript
// services/review-guard/index.ts
const criticalIssues = securityIssues.filter(
  issue => issue.severity === 'critical'
);

if (criticalIssues.length > 0) {
  return {
    blocked: true,  // Blocks PR merge
    reason: 'Critical security vulnerabilities detected',
    issues: criticalIssues,
    override: 'require-waiver'  // Can be overridden with signed waiver
  };
}
```

**Escape hatch:** Teams can waive specific issues with **signed waivers** that create audit trails.

**Location:** `services/review-guard/rules/security/`

---

### 2. Secrets Detection

**Invariant:** Hardcoded credentials, API keys, and private keys block PRs.

**What we enforce:**
- ✅ AWS access keys (`AKIA[0-9A-Z]{16}`)
- ✅ API tokens (`sk-[a-zA-Z0-9]{32,}`)
- ✅ Private keys (`-----BEGIN .* PRIVATE KEY-----`)
- ✅ Database passwords in connection strings
- ✅ OAuth tokens
- ✅ JWT secrets
- ✅ Stripe keys (`sk_live_`, `pk_live_`)
- ✅ GitHub tokens (`ghp_`, `gho_`)

**Why we enforce this:**

Secrets in code repositories are **catastrophic security failures**. Once committed to git history, they're nearly impossible to remove completely.

**How we enforce this:**

```typescript
// lib/secrets/redaction.ts
export function detectSecrets(code: string): Secret[] {
  const secrets: Secret[] = [];

  // AWS keys
  const awsKeyPattern = /AKIA[0-9A-Z]{16}/g;
  if (awsKeyPattern.test(code)) {
    secrets.push({
      type: 'aws-access-key',
      severity: 'critical',
      pattern: 'AKIA[redacted]',
      recommendation: 'Use AWS Secrets Manager or environment variables'
    });
  }

  // ... more patterns

  return secrets;
}
```

**Escape hatch:** None. Secrets detection cannot be waived. Use environment variables or secret management systems.

**Location:** `lib/secrets/redaction.ts`

---

### 3. Test Coverage Thresholds

**Invariant:** PRs must meet team-defined test coverage thresholds.

**What we enforce:**
- ✅ Minimum coverage percentage (default: 80%)
- ✅ No decrease in coverage (ratcheting)
- ✅ New code must have tests (incremental coverage)

**Why we enforce this:**

**Unlike security rules, this is team-configurable.** But once a team sets a threshold, ReadyLayer enforces it deterministically.

**How we enforce this:**

```yaml
# .readylayer/policy.yml
test_engine:
  minimum_coverage: 80  # Team decision
  allow_coverage_decrease: false
  enforce_incremental: true
```

```typescript
// services/test-engine/index.ts
if (coverage.overall < policy.minimum_coverage) {
  return {
    blocked: true,
    reason: `Coverage ${coverage.overall}% below threshold ${policy.minimum_coverage}%`,
    currentCoverage: coverage.overall,
    requiredCoverage: policy.minimum_coverage
  };
}
```

**Escape hatch:** Teams can adjust thresholds in `.readylayer/policy.yml` or waive specific files (e.g., generated code).

**Location:** `services/test-engine/`

---

### 4. Documentation-Code Drift

**Invariant:** Documentation must match code behavior.

**What we enforce:**
- ✅ Function signatures match documented examples
- ✅ API endpoints match documented paths
- ✅ Parameter types match documentation
- ✅ Documented behavior aligns with implementation

**Why we enforce this:**

Outdated documentation is **factually incorrect**. It misleads users, creates support burden, and causes integration failures.

**How we enforce this:**

```typescript
// services/doc-sync/index.ts
const driftIssues = compareCodeToDocs(code, documentation);

if (driftIssues.length > 0) {
  return {
    blocked: true,
    reason: 'Documentation drift detected',
    issues: driftIssues,
    // Example: "Function `getUser(id)` documented as `getUser(id, options)`"
  };
}
```

**Escape hatch:** Mark documentation as "aspirational" with `<!-- FUTURE: ... -->` or disable doc sync for specific files.

**Location:** `services/doc-sync/`

---

### 5. Policy Compliance

**Invariant:** Custom policies defined by the organization are enforced deterministically.

**What we enforce:**

**Organizations define custom rules:**

```yaml
# .readylayer/policy.yml
custom_rules:
  - id: no-console-log-in-production
    pattern: "console.log"
    paths: ["src/**/*.ts"]
    severity: high
    message: "Use logger instead of console.log"

  - id: require-error-handling
    pattern: "fetch\\("
    require_nearby: "try|catch"
    severity: medium
    message: "All fetch calls must have error handling"
```

**ReadyLayer enforces these like built-in rules.**

**Why we enforce this:**

Teams know their domain better than we do. Custom policies allow context-specific governance without changing ReadyLayer's code.

**How we enforce this:**

```typescript
// services/policy-engine/evaluator.ts
for (const rule of customRules) {
  const matches = findPatternMatches(code, rule.pattern);
  if (matches.length > 0 && rule.severity === 'high') {
    return {
      blocked: true,
      reason: `Policy violation: ${rule.id}`,
      matches: matches,
      message: rule.message
    };
  }
}
```

**Escape hatch:** Policies are versioned. Teams can update policies to reflect new standards.

**Location:** `services/policy-engine/`

---

## What ReadyLayer NEVER Enforces

### 1. Code Style or Formatting

**Invariant:** ReadyLayer does not enforce tabs vs. spaces, semicolons, line length, etc.

**Why we don't enforce this:**

Code style is **subjective**. Teams already have Prettier, ESLint, Ruff, Black, etc. Governance tooling shouldn't duplicate linters.

**What we recommend:**

Use dedicated formatters:
- **JavaScript/TypeScript:** Prettier, ESLint
- **Python:** Black, Ruff
- **Go:** gofmt
- **Rust:** rustfmt

**Separation of concerns:**
- **Linter** → Code style (subjective)
- **ReadyLayer** → Security, correctness (objective)

---

### 2. Naming Conventions

**Invariant:** ReadyLayer does not enforce variable names, function names, or file naming schemes.

**Why we don't enforce this:**

Naming is **team preference**. Some teams use `camelCase`, others use `snake_case`. Some use `PascalCase` for classes, others for all types.

**What we recommend:**

Use language-specific linters:
- **TypeScript:** `@typescript-eslint/naming-convention`
- **Python:** `pylint --naming-style=snake_case`
- **Go:** `golint`

**Governance should not dictate aesthetics.**

---

### 3. Architecture Decisions

**Invariant:** ReadyLayer does not enforce MVC, microservices, monoliths, or any architectural pattern.

**Why we don't enforce this:**

Architecture is **context-dependent**. What works for a 5-person startup doesn't work for a 500-person enterprise. Governance tooling shouldn't impose architecture.

**What we enable:**

Teams can create **custom policies** for architecture if desired:

```yaml
# Optional: Team-specific architecture rules
custom_rules:
  - id: no-circular-dependencies
    type: architecture
    severity: low  # Advisory, not blocking
    message: "Circular dependencies detected"
```

**But ReadyLayer doesn't ship with architecture opinions.**

---

### 4. Technology Selection

**Invariant:** ReadyLayer does not enforce React over Vue, PostgreSQL over MySQL, or any technology choice.

**Why we don't enforce this:**

Technology selection is a **business decision**, not a governance decision. Teams choose tech based on:
- Team expertise
- Performance requirements
- Ecosystem maturity
- Cost constraints

**Governance is stack-agnostic.**

---

### 5. Performance Benchmarks

**Invariant:** ReadyLayer does not enforce "must run in < 100ms" or similar performance requirements.

**Why we don't enforce this:**

Performance is **contextual**. A background job can take 10 seconds. An API endpoint should respond in 100ms. A batch job might run for hours.

**What we enable:**

Teams can add performance tests as **custom policies** if needed:

```yaml
custom_rules:
  - id: api-response-time
    type: performance
    threshold: 200ms
    severity: low  # Advisory
```

**But performance governance is team-specific.**

---

### 6. License Compliance

**Invariant:** ReadyLayer does not enforce "no GPL dependencies" or license restrictions.

**Why we don't enforce this:**

License compliance is **legal and business context-dependent**. Some organizations can use GPL, others cannot. Some require Apache 2.0, others allow MIT.

**What we recommend:**

Use dedicated tools:
- **npm:** `license-checker`
- **Python:** `licensecheck`
- **Go:** `go-licenses`

**Governance is about code quality, not legal policy.**

---

## Where Humans Stay in Control

### 1. Waiver System

**Invariant:** All enforcement can be overridden with signed waivers.

**How it works:**

```typescript
// Creating a waiver
await prisma.waiver.create({
  data: {
    organizationId: 'org-123',
    issueId: 'sec-456',
    reason: 'False positive: This SQL query uses parameterized statements',
    createdBy: 'user-789',
    expiresAt: new Date('2026-12-31'),
    signature: signWaiver(userId, issueId, reason)  // Cryptographic signature
  }
});
```

**Waivers create audit trails:**
- Who approved the waiver
- Why the issue was waived
- When the waiver expires
- Cryptographic signature (non-repudiation)

**Waivers are NOT escapes. They're documented risk acceptance.**

**Location:** `prisma/schema.prisma` (Waiver model), `services/policy-engine/waivers.ts`

---

### 2. Policy Versioning

**Invariant:** Policies are versioned. Changes create new versions, never mutate existing.

**Why this matters:**

Teams should be able to **evolve their governance** without breaking existing PRs.

**How it works:**

```typescript
// Creating a new policy version
const newVersion = await prisma.policyPack.create({
  data: {
    organizationId: 'org-123',
    name: 'Production Security Policy',
    version: 2,  // Incremented from v1
    rules: updatedRules,
    checksum: hashPolicy(updatedRules),  // Cryptographic hash
    createdBy: 'user-789'
  }
});

// Old PRs use v1, new PRs use v2
const policy = await prisma.policyPack.findFirst({
  where: {
    organizationId: pr.organizationId,
    version: pr.policyVersion  // Locked at PR creation time
  }
});
```

**Teams can experiment with policies without breaking production.**

**Location:** `prisma/schema.prisma` (PolicyPack model), `services/policy-engine/`

---

### 3. Org → Team → Repo Inheritance

**Invariant:** Policies cascade from org-level to team-level to repo-level, with overrides.

**How it works:**

```yaml
# Organization-level policy (strictest)
org_policy:
  minimum_coverage: 80%
  block_on_secrets: true

# Team-level policy (can be stricter)
team_policy:
  minimum_coverage: 85%  # Stricter than org
  custom_rules:
    - no-console-log

# Repo-level policy (can be stricter OR more lenient with approval)
repo_policy:
  minimum_coverage: 90%  # Stricter than team
  waive_files: ["src/legacy/**"]  # More lenient for specific files
```

**Hierarchy:**

```
Organization (baseline)
    ↓
Team (can add constraints)
    ↓
Repository (can add constraints + waivers)
```

**Teams can never weaken org-level security policies without explicit approval.**

**Location:** `services/policy-engine/inheritance.ts`

---

### 4. Self-Hosting

**Invariant:** Organizations can run ReadyLayer on their own infrastructure.

**Why this matters:**

**Control over governance = control over infrastructure.**

Self-hosted ReadyLayer means:
- ✅ No external API calls (unless configured)
- ✅ No data custody by third parties
- ✅ Full audit trail in organization's database
- ✅ Custom modifications allowed (OSS)

**Humans control where governance runs.**

**Location:** All of ReadyLayer (it's OSS)

---

## Why Governance Must Be Inspectable

### 1. Transparent Rules

**Invariant:** All security rules are public and documented.

**No "secret sauce."** Every rule ReadyLayer enforces is in:
- `services/review-guard/rules/security/` (security rules)
- `services/test-engine/` (test coverage logic)
- `services/doc-sync/` (documentation validation)
- `lib/secrets/redaction.ts` (secret detection patterns)

**Community can audit, fork, and improve.**

---

### 2. Evidence Bundles

**Invariant:** Every governance decision includes an evidence bundle.

**What's in an evidence bundle:**

```typescript
interface EvidenceBundle {
  policyVersion: string;         // SHA-256 of policy
  policyChecksum: string;         // Cryptographic hash
  inputHash: string;              // SHA-256 of input code
  timestamp: Date;                // When evaluated
  evaluatorVersion: string;       // ReadyLayer version
  result: GovernanceResult;       // Pass/fail + reasons
  auditTrail: AuditEntry[];       // Step-by-step evaluation
}
```

**Why this matters:**

Teams can **verify** that governance was applied correctly. Evidence bundles are:
- ✅ Cryptographically signed
- ✅ Immutable (stored in audit log)
- ✅ Reproducible (same inputs → same hash)

**Location:** `services/policy-engine/evidence.ts`, `prisma/schema.prisma` (AuditLog model)

---

### 3. Deterministic Evaluation

**Invariant:** Same inputs + same policy = same outputs.

**How we guarantee this:**

```typescript
// services/policy-engine/evaluator.ts
export function evaluatePolicy(
  code: string,
  policy: Policy,
  context: Context
): DeterministicResult {
  // 1. Hash inputs
  const inputHash = sha256(code);
  const policyHash = sha256(JSON.stringify(policy));

  // 2. Check cache (deterministic requests are cached)
  const cached = cache.get(`${inputHash}:${policyHash}`);
  if (cached) return cached;

  // 3. Evaluate (pure function, no side effects)
  const result = runPolicyEngine(code, policy, context);

  // 4. Cache result
  cache.set(`${inputHash}:${policyHash}`, result);

  return result;
}
```

**Determinism enables:**
- ✅ Reproducible builds
- ✅ Caching for performance
- ✅ Verification by third parties
- ✅ Dispute resolution (re-run gives same result)

**Location:** `services/policy-engine/`, `lib/cache/`

---

## Enforcement Philosophy

### Fail-Secure, Not Fail-Open

**Invariant:** When in doubt, block.

| Scenario | ReadyLayer's Behavior | Justification |
|----------|----------------------|---------------|
| **Policy file missing** | ❌ **Block** | No policy = no governance |
| **Security scan errors** | ❌ **Block** | Can't verify safety |
| **Test coverage unknown** | ❌ **Block** | Can't verify quality |
| **LLM timeout** | ✅ **Allow** (with warning) | LLM is enhancement, not gate |
| **Network failure** | ❌ **Block** | Can't verify external deps |

**Default to safety, not convenience.**

---

### Non-Blocking Enhancements

**Invariant:** LLM suggestions never block PRs.

**Why this matters:**

LLMs are **non-deterministic**. They can provide useful suggestions, but they cannot be the source of blocking decisions.

```typescript
// ✅ Deterministic (can block)
const securityIssues = staticAnalyzer.scan(code);
if (securityIssues.critical.length > 0) {
  return { blocked: true };
}

// ✅ Non-deterministic (cannot block)
const llmSuggestions = await llm.suggestImprovements(redactedCode);
return { suggestions: llmSuggestions };  // Informational only
```

**LLMs enhance, but never gate.**

**Location:** `services/llm/`, `services/review-guard/`

---

## Edge Cases and Boundaries

### 1. What if a team wants ZERO enforcement?

**Answer:** Run ReadyLayer in "advisory mode."

```yaml
# .readylayer/policy.yml
enforcement:
  mode: advisory  # Report issues, never block
  block_on:
    - secrets  # Only block on secrets (always enforced)
```

**Secrets detection cannot be disabled.** Everything else can be advisory.

---

### 2. What if a team wants STRICTER enforcement than defaults?

**Answer:** Add custom rules via policies.

```yaml
# .readylayer/policy.yml
custom_rules:
  - id: require-types-everywhere
    pattern: "^(?!.*:.*).*$"  # No untyped variables
    severity: high
    message: "All variables must have explicit types"
```

**Organizations can be as strict as they want.**

---

### 3. What if governance blocks a critical hotfix?

**Answer:** Use emergency waivers.

```typescript
// Emergency waiver (requires 2 approvers)
await prisma.waiver.create({
  data: {
    issueId: 'sec-789',
    reason: 'Production incident P0, fix required immediately',
    createdBy: 'user-123',
    approvedBy: ['user-456', 'user-789'],  // 2 approvers
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 24 hours
    requiresFollowUp: true  // Must fix after incident
  }
});
```

**Emergency waivers are logged and require follow-up.**

---

### 4. What if ReadyLayer has a bug that blocks valid code?

**Answer:** Waive + file bug report.

1. **Short-term:** Create waiver with reason "Suspected false positive"
2. **Long-term:** File GitHub issue with code sample
3. **Community fix:** We fix the rule, deploy update

**Waivers prevent teams from being blocked by bugs.**

---

## What ReadyLayer Does NOT Govern

### Things Outside ReadyLayer's Scope

| Category | Reason |
|----------|--------|
| **Deployment strategies** | Business decision, not code quality |
| **Infrastructure choices** | Operations concern, not governance |
| **Database schema design** | Application-specific, not universal |
| **API versioning strategy** | Product decision, not safety issue |
| **Monitoring/alerting** | Operational concern, not code governance |
| **Team workflows (Agile/Kanban)** | Process, not code |
| **Hiring practices** | Not code-related |
| **Compensation** | Not code-related |

**Governance is about code quality and safety, not operations or process.**

---

## Summary Table: What ReadyLayer Enforces

| Category | Enforced? | Configurable? | Escape Hatch? |
|----------|-----------|---------------|---------------|
| **Security (OWASP Top 10)** | ✅ Yes | ❌ No | Waiver required |
| **Secrets detection** | ✅ Yes | ❌ No | None (never waivable) |
| **Test coverage** | ✅ Yes | ✅ Yes (threshold) | Waiver or adjust policy |
| **Documentation drift** | ✅ Yes | ✅ Yes (enable/disable) | Waiver or mark aspirational |
| **Custom policies** | ✅ Yes | ✅ Yes (team-defined) | Waiver or update policy |
| **Code style** | ❌ No | N/A | N/A |
| **Naming conventions** | ❌ No | N/A | N/A |
| **Architecture patterns** | ❌ No | N/A | N/A |
| **Performance benchmarks** | ❌ No | N/A | N/A |
| **License compliance** | ❌ No | N/A | N/A |

---

## Related Documents

- [Repository Invariants](./INVARIANTS.md) - Code-level invariants
- [Model & Tool Agnosticity](./MODEL_AND_TOOL_AGNOSTICITY.md) - LLM independence
- [Failure Modes](./FAILURE_MODES.md) - Safe degradation patterns
- [OSS vs Enterprise Boundary](./OSS_VS_ENTERPRISE_BOUNDARY.md) - Feature boundaries

---

<div align="center">

**Governance is about constraints, not preferences.**

ReadyLayer enforces safety and correctness. Teams control everything else.

</div>
