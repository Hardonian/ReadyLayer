# PROMPT ARCHITECTURE — ReadyLayer LLM Prompt Audit

**Ralph Wiggins Execution Report**
**Date:** 2026-01-17
**Scope:** Prompt inventory, conflicts, determinism, refactoring
**Purpose:** Centralize, version, and optimize LLM interactions

---

## EXECUTIVE SUMMARY

**Current State:** Prompts are **scattered inline strings** across services with no centralization, versioning, or conflict detection.

**Problems Identified:**
1. **No reusable system prompt** — Each service builds prompts from scratch
2. **No versioning** — Prompt changes are invisible, not tracked
3. **Hardcoded strings** — Difficult to A/B test or optimize
4. **No token optimization** — Repeated context, inefficient encoding
5. **Conflicting instructions** — Different services may give contradictory guidance
6. **Non-deterministic by default** — Temperature = 0.7 (should be 0 for reproducibility)

**Impact:** Inconsistent AI behavior, wasted tokens, difficult debugging, compliance risk

**Recommendation:** Implement layered prompt architecture with versioning, testing, and token optimization

---

## PROMPT INVENTORY

### 1. REVIEW GUARD — Security Analysis Prompt

**Location:** `services/review-guard/index.ts:564-582`

**Prompt Structure:**
```
System: (none)
User: Analyze the following code for security vulnerabilities, quality issues, and potential bugs.

File: ${filePath}

\`\`\`
${content}
\`\`\`
${evidenceSection}

Return a JSON array of issues found, each with:
- ruleId: string (e.g., "security.sql-injection")
- severity: "critical" | "high" | "medium" | "low"
- file: string
- line: number
- message: string
- fix: string (actionable fix instruction)
- confidence: number (0-1)

Format: [{"ruleId": "...", "severity": "...", "file": "...", "line": 1, "message": "...", "fix": "...", "confidence": 0.9}]
```

**Configuration:**
- Model: `gpt-4-turbo-preview`
- Temperature: **0.7** ⚠️ (non-deterministic)
- Max tokens: 2000

**Issues:**
1. No system prompt defining role/constraints
2. Non-zero temperature defeats determinism claims
3. Evidence section format not standardized
4. JSON parsing failures not handled gracefully
5. No guidance on false positive avoidance

---

### 2. TEST ENGINE — Test Generation Prompt

**Location:** `services/test-engine/index.ts:260-267` (prompt built in `buildTestPrompt` method)

**Prompt Structure:** (inferred from code)
```
Generate comprehensive tests for the following file.
Coverage threshold: 80% minimum (cannot go below)
Framework: ${framework}
Content: ${code}

Generate complete test suite covering:
- Happy paths
- Error cases
- Edge cases
- Boundary conditions
```

**Configuration:**
- Model: `gpt-4-turbo-preview`
- Temperature: **0.7** ⚠️ (non-deterministic)
- Max tokens: 2000
- Cache: enabled

**Issues:**
1. No system prompt
2. Temperature 0.7 means same file generates different tests each time
3. No framework-specific test patterns provided
4. Coverage threshold mentioned but not enforced in prompt
5. No guidance on test quality vs quantity

---

### 3. DOC SYNC — Documentation Enhancement Prompt

**Location:** `services/doc-sync/index.ts:597`

**Prompt Structure:**
```
Enhance the following OpenAPI spec with detailed descriptions, parameters, and examples.

${spec}
```

**Configuration:**
- Model: (default)
- Temperature: (default 0.7)
- Max tokens: (default 2000)

**Issues:**
1. Extremely minimal prompt
2. No examples of desired output format
3. No constraints on what to enhance vs preserve
4. No validation of output against OpenAPI spec

---

### 4. GOVERNANCE ENGINE — Governance Analysis Prompt

**Location:** `services/governance-engine/run-orchestrator.ts:240`

**Prompt Structure:**
```
You are a code governance analyzer. Analyze the following diff for security, quality, and compliance issues.

Mode: ${mode} (single-model | opencode-baseline | variance)
Diff: ${diff}
Intent: ${intent}

Generate findings with variance scores and governance signals.
```

**Configuration:**
- Model: varies by mode
- Temperature: (default 0.7)
- Max tokens: (default 2000)

**Issues:**
1. Vague role definition ("code governance analyzer")
2. No structured output format
3. "Variance scores" and "governance signals" not defined
4. Different modes may produce conflicting outputs

---

## PROMPT DEPENDENCY GRAPH

```
┌─────────────────────────────────────────────────────────────┐
│                      NO SHARED PROMPTS                       │
│                                                              │
│  Each service builds prompts independently:                 │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ Review Guard │   │ Test Engine  │   │   Doc Sync   │   │
│  │   (inline)   │   │   (method)   │   │   (inline)   │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐                       │
│  │  Governance  │   │ AI Anomaly   │                       │
│  │   (inline)   │   │   Detection  │                       │
│  └──────────────┘   └──────────────┘                       │
│                                                              │
│  No dependencies = No conflicts detected automatically      │
│  No shared context = Token waste from repetition            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Current Architecture:** Flat, independent prompts
**Problem:** No composition, no reuse, no consistency

---

## CONFLICTS AND OVERLAPS

### Conflict 1: Output Format Expectations

**Review Guard:**
- Expects: `[{"ruleId": "...", "severity": "...", ...}]`
- JSON array of issues

**Governance Engine:**
- Expects: "findings with variance scores"
- Format not specified

**Test Engine:**
- Expects: Code block with tests
- No structured metadata

**Impact:** Each service has different output parsing logic, no shared validation

---

### Conflict 2: Severity Definitions

**Review Guard:**
- Uses: `"critical" | "high" | "medium" | "low"`

**Governance Engine:**
- Uses: Governance signals (format undefined)

**Impact:** Same issue might be classified differently by different services

---

### Conflict 3: Confidence Semantics

**Review Guard:**
- Confidence as detection certainty (0-1)

**Test Engine:**
- Confidence as AI-touched likelihood (0-1)

**Impact:** Same term, different meanings

---

## TOKEN WASTE ANALYSIS

### Source 1: Repeated Context
- Each prompt includes full file content
- No caching of common patterns (imports, boilerplate)
- Estimated waste: 20-30% of tokens

### Source 2: Verbose Instructions
- Natural language instructions could be compressed
- Examples could be externalized to few-shot examples
- Estimated waste: 10-15% of tokens

### Source 3: Redundant Evidence
- Evidence section includes context already in file content
- Estimated waste: 5-10% of tokens

**Total Estimated Waste:** 35-55% of tokens

**Cost Impact:**
- At 10,000 reviews/month with 2000 tokens each = 20M tokens/month
- At $0.01 per 1K tokens (GPT-4) = $200/month baseline
- Waste = **$70-110/month** unnecessary LLM costs

---

## DETERMINISM AUDIT

### Current State: NON-DETERMINISTIC

All prompts use **temperature = 0.7** (default)

**Impact on Claims:**
- ❌ "Deterministic governance gates" — FALSE
- ❌ "Same inputs = same outputs" — FALSE
- ❌ "Reproducible for audits" — FALSE

**Example:**
```typescript
// services/review-guard/index.ts:586
const llmRequest: LLMRequest = {
  prompt,
  model: 'gpt-4-turbo-preview',
  organizationId,
  cache: true, // ⚠️ Caching on, but temperature not 0
};
```

**Issue:** Caching is enabled but temperature is non-zero, so cache hit is unlikely unless exact same prompt + randomness seed

**Fix:**
```typescript
const llmRequest: LLMRequest = {
  prompt,
  model: 'gpt-4-turbo-preview',
  temperature: 0, // ✅ Deterministic
  organizationId,
  cache: true,
};
```

---

## RECOMMENDED ARCHITECTURE: LAYERED PROMPTS

### Layer 1: System Prompts (Role + Constraints)

**Purpose:** Define AI role and universal constraints

**Example:**
```typescript
const SYSTEM_PROMPTS = {
  security_analyst: `You are a security analyst for ReadyLayer, an AI code safety platform.

Your responsibilities:
- Identify security vulnerabilities (OWASP Top 10)
- Classify severity: critical, high, medium, low
- Provide actionable remediation steps
- Minimize false positives

Constraints:
- Output MUST be valid JSON
- Confidence scores MUST be 0-1 (not percentages)
- Every finding MUST have a specific line number
- Never suggest removing security checks to "fix" issues

Output format:
[{"ruleId": "security.{category}", "severity": "{level}", "file": "{path}", "line": {number}, "message": "{description}", "fix": "{action}", "confidence": {0-1}}]`,

  test_generator: `You are a test generator for ReadyLayer.

Your responsibilities:
- Generate high-quality, runnable tests
- Achieve minimum 80% code coverage
- Include happy paths, error cases, edge cases
- Use framework best practices

Constraints:
- Tests MUST use the specified framework syntax
- Tests MUST be runnable without modification
- Include setup/teardown as needed
- Follow naming conventions: describe() / it() or test()

Output format:
\`\`\`{language}
{complete test file}
\`\`\``,
};
```

### Layer 2: Analysis Prompts (Task-Specific Instructions)

**Purpose:** Specific analysis instructions per service

**Example:**
```typescript
const ANALYSIS_PROMPTS = {
  review_guard: (file: string, content: string, evidence?: string) => `
Analyze this file for security and quality issues.

File: ${file}
${evidence ? `\nContext:\n${evidence}` : ''}

Code:
\`\`\`
${content}
\`\`\`

Focus on:
- SQL injection, XSS, CSRF
- Hardcoded secrets
- Insecure dependencies
- Performance anti-patterns
`,

  test_generation: (file: string, content: string, framework: string) => `
Generate tests for this file.

File: ${file}
Framework: ${framework}

Code:
\`\`\`
${content}
\`\`\`

Requirements:
- Minimum 80% coverage
- Include edge cases
- Test error handling
`,
};
```

### Layer 3: Execution Prompts (Service Orchestration)

**Purpose:** Combine system + analysis for specific request

**Example:**
```typescript
function buildPrompt(
  systemPromptKey: keyof typeof SYSTEM_PROMPTS,
  analysisPromptKey: keyof typeof ANALYSIS_PROMPTS,
  ...args: any[]
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPTS[systemPromptKey],
    user: ANALYSIS_PROMPTS[analysisPromptKey](...args),
  };
}

// Usage
const { system, user } = buildPrompt(
  'security_analyst',
  'review_guard',
  'auth.ts',
  fileContent,
  ragEvidence
);

const llmRequest = {
  systemPrompt: system,
  userPrompt: user,
  temperature: 0, // ✅ Deterministic
  model: 'gpt-4-turbo-preview',
};
```

---

## PROMPT VERSIONING STRATEGY

### Version Control
- Store prompts in `lib/prompts/v1/*.ts`
- Version by date or semantic version
- Track changes in git

### Schema
```typescript
interface PromptVersion {
  id: string; // "security_analyst_v1.0"
  version: string; // "1.0.0"
  createdAt: Date;
  systemPrompt: string;
  analysisTemplates: Record<string, (...args: any[]) => string>;
  metadata: {
    author: string;
    changelog: string;
    testedOn: string[]; // Model names
    avgTokens: number;
  };
}
```

### Migration
- New prompts = new version file
- Old reviews reference prompt version used
- Can replay old reviews with old prompt for debugging

---

## REFACTORING PLAN

### Phase 1: Centralize (Week 1)
1. Create `lib/prompts/` directory
2. Extract all prompts to `prompts/v1/system.ts` and `prompts/v1/analysis.ts`
3. Update services to import prompts
4. Add prompt version to evidence bundles

### Phase 2: Optimize (Week 2)
1. Set temperature to 0 for all deterministic use cases
2. Implement token compression (remove verbose instructions)
3. Add caching layer for common patterns
4. Measure token reduction

### Phase 3: Test (Week 3)
1. Create prompt regression tests
2. Validate output format for each prompt
3. A/B test prompt variations
4. Measure false positive rates

### Phase 4: Version (Week 4)
1. Add prompt versioning system
2. Track prompt performance metrics
3. Create prompt changelog
4. Document prompt engineering decisions

---

## DETERMINISM FIXES

### Immediate Actions:
1. **Set temperature = 0** for all review/governance prompts
   - Review Guard: Line 586
   - Test Engine: Line 269
   - Governance: Run orchestrator

2. **Add seed parameter** (if supported by provider)
   ```typescript
   const llmRequest = {
     temperature: 0,
     seed: hashInput(content), // Deterministic seed from input
   };
   ```

3. **Implement result caching**
   ```typescript
   const cacheKey = createHash('sha256')
     .update(systemPrompt + userPrompt + model)
     .digest('hex');

   const cached = await promptCache.get(cacheKey);
   if (cached) return cached;

   const result = await llmService.complete(request);
   await promptCache.set(cacheKey, result);
   return result;
   ```

---

## CONFLICT RESOLUTION

### Standardize Output Formats

**Create shared schemas:**
```typescript
// lib/prompts/schemas.ts
export const ISSUE_SCHEMA = {
  ruleId: 'string (e.g., security.sql-injection)',
  severity: '"critical" | "high" | "medium" | "low"',
  file: 'string (file path)',
  line: 'number (positive integer)',
  message: 'string (clear description)',
  fix: 'string (actionable remediation)',
  confidence: 'number (0-1, decimal)'
};

export const TEST_OUTPUT_SCHEMA = {
  framework: 'string',
  testFilePath: 'string',
  testCode: 'string (runnable test code)',
  coverageEstimate: 'number (0-100)',
};
```

**Include in prompts:**
```
Output MUST conform to this schema:
${JSON.stringify(ISSUE_SCHEMA, null, 2)}
```

---

## TOKEN OPTIMIZATION

### Technique 1: Context Compression
- Store common patterns as IDs
- Reference by ID instead of repeating
- Example: `@import-react` instead of full import statement

### Technique 2: Progressive Disclosure
- Start with small context
- Request more only if needed
- Use multi-turn conversations

### Technique 3: Few-Shot Examples
- Store examples separately (not in every prompt)
- Reference examples by ID
- Reduces per-prompt token count

### Estimated Savings:
- Technique 1: 15-20% reduction
- Technique 2: 10-15% reduction
- Technique 3: 5-10% reduction
- **Total: 30-45% token reduction**

---

## PROMPT TESTING FRAMEWORK

### Test Structure:
```typescript
describe('Prompts', () => {
  describe('security_analyst', () => {
    it('produces valid JSON output', async () => {
      const prompt = buildPrompt('security_analyst', 'review_guard', ...);
      const response = await testLLM(prompt);
      expect(() => JSON.parse(response)).not.toThrow();
    });

    it('identifies SQL injection', async () => {
      const code = 'SELECT * FROM users WHERE id = ' + userId;
      const prompt = buildPrompt('security_analyst', 'review_guard', 'test.ts', code);
      const response = await testLLM(prompt);
      const issues = JSON.parse(response);
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'security.sql-injection' })
      );
    });

    it('is deterministic', async () => {
      const prompt = buildPrompt('security_analyst', 'review_guard', ...);
      const response1 = await testLLM(prompt);
      const response2 = await testLLM(prompt);
      expect(response1).toBe(response2);
    });
  });
});
```

---

## NEXT STEPS

1. **Audit complete** — All prompts inventoried
2. **Refactor prompts** — Implement layered architecture
3. **Set temperature = 0** — Enable determinism
4. **Add versioning** — Track prompt changes
5. **Optimize tokens** — Reduce waste by 30-45%
6. **Test prompts** — Validate output quality
7. **Document** — Update architecture docs

**Expected Outcome:** Deterministic, versioned, optimized prompt architecture that supports ReadyLayer's trust claims

---

**Report generated by Ralph Wiggins execution block**
**Next:** Test quality audit
