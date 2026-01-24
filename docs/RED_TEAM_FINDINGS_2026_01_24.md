# Red-Team Findings: Agent Mode UI Contract Documentation

**Date:** 2026-01-24
**Reviewer:** Critical Security & OSS Adoption Review
**Scope:** MODEL_AND_TOOL_AGNOSTICITY.md, GOVERNANCE_INVARIANTS.md, FAILURE_MODES.md, FIRST_GOVERNED_PR_IN_10_MINUTES.md

---

## Executive Summary

Reviewed 4 new documentation files for over-claims, hidden coupling, and future fragility. Found **5 critical issues** requiring immediate fixes and **3 warnings** requiring clarification.

**Overall Assessment:** Documentation is **engineering-honest** but contains **deployment assumptions** that need clarification.

---

## Critical Findings (Must Fix)

### CRITICAL-1: "readylayer scan" Command Doesn't Exist

**File:** `FIRST_GOVERNED_PR_IN_10_MINUTES.md`

**Issue:** Documentation claims:
```bash
readylayer scan --path . --policy .readylayer/policy.yml
```

**Reality:** CLI (cli/readylayer-cli.ts) only has:
- `readylayer review <file>` (single file)
- `readylayer test <file>` (test generation)
- `readylayer init` (config setup)
- `readylayer config` (show config)

**Impact:** Users will get "command not found" error.

**Fix:** Clarify that `scan` is Docker-only:
```bash
# Docker mode (full repository scan)
docker run readylayer/readylayer:latest scan --path /workspace

# CLI mode (single file review)
readylayer review src/index.js
```

**Status:** ⚠️ NEEDS FIX

---

### CRITICAL-2: Docker Image May Not Be Published

**File:** `FIRST_GOVERNED_PR_IN_10_MINUTES.md`

**Issue:** Documentation references:
- `readylayer/readylayer:latest`
- `readylayer/readylayer-action@v1`

**Reality:** These Docker images may not exist on Docker Hub or GitHub Container Registry yet.

**Impact:** Users will get "image not found" error.

**Fix:** Add caveat:
```markdown
**Note:** Docker images are for self-hosted deployments. For GitHub Actions, use the source-based action or self-hosted runner.
```

**Alternative:** Change to self-build instructions:
```bash
# Build from source
docker build -t readylayer:local .
docker run readylayer:local scan --path .
```

**Status:** ⚠️ NEEDS FIX

---

### CRITICAL-3: GitHub Action May Not Exist

**File:** `FIRST_GOVERNED_PR_IN_10_MINUTES.md`

**Issue:** Documentation claims:
```yaml
uses: readylayer/readylayer-action@v1
```

**Reality:** This GitHub Action may not be published to GitHub Marketplace yet.

**Impact:** Users will get "action not found" error.

**Fix:** Add caveat and provide alternative:
```markdown
**Note:** GitHub Action coming soon. For now, use Docker-based action:

```yaml
- name: ReadyLayer Scan
  run: |
    docker run --rm -v ${{ github.workspace }}:/workspace \
      readylayer/readylayer:latest scan --path /workspace
```
```

**Status:** ⚠️ NEEDS FIX

---

### CRITICAL-4: CLI "init" Command Creates Wrong File

**File:** `FIRST_GOVERNED_PR_IN_10_MINUTES.md`

**Issue:** Documentation claims `readylayer init` creates `.readylayer/policy.yml`.

**Reality:** CLI creates `.readylayer.json` (line 302 of cli/readylayer-cli.ts), not `.readylayer/policy.yml`.

**Impact:** Confusion about configuration format (JSON vs YAML).

**Fix:** Clarify:
```markdown
```bash
# Initialize CLI config (creates .readylayer.json)
readylayer init

# Create policy file manually (YAML format)
mkdir -p .readylayer
cat > .readylayer/policy.yml << EOF
version: 1
review_guard:
  enabled: true
  rules:
    - owasp-top-10
EOF
```
```

**Status:** ⚠️ NEEDS FIX

---

### CRITICAL-5: Cost Tracking Assumes Specific Provider Names

**File:** `MODEL_AND_TOOL_AGNOSTICITY.md`

**Issue:** Cost tracking code (services/llm/index.ts:169) hardcodes provider names:
```typescript
provider: 'openai',  // Hardcoded, not from config
```

**Reality:** If new providers are added, cost tracking will attribute to wrong provider.

**Impact:** Cost reporting inaccurate for new providers.

**Fix:** Use dynamic provider name:
```typescript
provider: this.name,  // Use provider instance name
```

**Status:** ⚠️ NEEDS CODE FIX (not just docs)

---

## Warnings (Should Clarify)

### WARNING-1: OpenRouter Not Implemented Yet

**File:** `MODEL_AND_TOOL_AGNOSTICITY.md`

**Issue:** Documentation claims "OpenRouter (multi-provider routing) - 🔄 Experimental"

**Reality:**
- ProviderConfig schema includes "openrouter" (line 907 of schema.prisma)
- BUT no OpenRouterProvider class exists in services/llm/index.ts

**Impact:** Users may expect OpenRouter to work but it doesn't.

**Fix:** Change status:
```markdown
### Q2 2026
- 🔄 Ollama integration (local models)
- 📋 OpenRouter support (multi-provider routing) **PLANNED**
- 🔄 Azure OpenAI support
```

**Status:** ⚠️ NEEDS CLARIFICATION

---

### WARNING-2: Ollama Support Partially Implemented

**File:** `MODEL_AND_TOOL_AGNOSTICITY.md`

**Issue:** Documentation shows OllamaProvider implementation example.

**Reality:**
- CLI has Ollama config (cli/readylayer-cli.ts:282-289)
- BUT services/llm/index.ts has no OllamaProvider class

**Impact:** Users may think Ollama works end-to-end but it doesn't.

**Fix:** Add status note:
```markdown
**Example: Running local Llama 3 via Ollama**

**Status: Planned for Q2 2026. CLI config exists, provider implementation in progress.**

```typescript
// Future implementation:
class OllamaProvider implements LLMProvider {
  // ...
}
```
```

**Status:** ⚠️ NEEDS CLARIFICATION

---

### WARNING-3: Waiver System Implementation Not Verified

**File:** `GOVERNANCE_INVARIANTS.md`

**Issue:** Extensive description of waiver system with cryptographic signatures:
```typescript
signature: signWaiver(userId, issueId, reason)  // Cryptographic signature
```

**Reality:** Waiver model exists (prisma/schema.prisma:572-593) but no `signature` field visible.

**Impact:** May over-promise cryptographic features not yet implemented.

**Fix:** Verify implementation or change to:
```markdown
```typescript
await prisma.waiver.create({
  data: {
    organizationId: 'org-123',
    ruleId: 'sec-456',
    reason: 'False positive: This SQL query uses parameterized statements',
    createdBy: 'user-789',
    expiresAt: new Date('2026-12-31'),
    // Signature support planned for audit trail enhancement
  }
});
```
```

**Status:** ⚠️ NEEDS VERIFICATION

---

## Informational Findings (Non-Blocking)

### INFO-1: Circuit Breaker Exists and Matches Description

**File:** `FAILURE_MODES.md`

**Verification:** ✅ `lib/circuit-breaker.ts` exists and implements exactly as described.

**Status:** ✅ ACCURATE

---

### INFO-2: ProviderConfig Exists and Matches Description

**File:** `MODEL_AND_TOOL_AGNOSTICITY.md`

**Verification:** ✅ `lib/services/provider-config.ts` and `prisma/schema.prisma` match documentation.

**Status:** ✅ ACCURATE

---

### INFO-3: LLM Service Matches Description

**File:** `MODEL_AND_TOOL_AGNOSTICITY.md`

**Verification:** ✅ `services/llm/index.ts` implements OpenAI, Anthropic, OpenCode providers as described.

**Status:** ✅ ACCURATE

---

## Hidden Coupling Found

### COUPLING-1: Hardcoded Provider Names in Cost Tracking

**Location:** `services/llm/index.ts:169, :319, :459`

**Issue:** Cost tracking uses string literals `'openai'`, `'anthropic'`, `'opencode'` instead of `this.name`.

**Impact:** Adding new provider requires changing 3 files:
1. Add provider class
2. Register provider
3. Update cost tracking enum

**Recommendation:** Use provider instance name dynamically.

---

### COUPLING-2: LLM Service Hardcoded in Multiple Places

**Location:** `services/review-guard/`, `services/test-engine/`, `services/doc-sync/`

**Issue:** Multiple services import and call `llmService` directly.

**Impact:** Swapping LLM implementations requires changes across codebase.

**Recommendation:** Inject LLM service via dependency injection or use event bus.

**Status:** 📋 ARCHITECTURAL CONSIDERATION (not a bug)

---

## Future Fragility Risks

### FRAGILITY-1: Model Name Assumptions

**Risk:** Code checks `if (request.model?.includes('claude'))` to select provider.

**Breaks When:** Claude releases "claude-4-pro" or Anthropic changes naming.

**Mitigation:** Use provider registry mapping:
```typescript
const modelToProvider: Record<string, string> = {
  'gpt-4': 'openai',
  'gpt-3.5-turbo': 'openai',
  'claude-3-opus': 'anthropic',
  'claude-3-sonnet': 'anthropic',
  // ...
};
```

**Status:** 📋 ENHANCEMENT OPPORTUNITY

---

### FRAGILITY-2: API Version Hardcoded

**Risk:** `'anthropic-version': '2023-06-01'` hardcoded in provider.

**Breaks When:** Anthropic deprecates this API version.

**Mitigation:** Make API version configurable per provider.

**Status:** 📋 ENHANCEMENT OPPORTUNITY

---

### FRAGILITY-3: Coverage Threshold Assumes Percentage

**Risk:** `minimum_coverage: 80` assumes percentage (0-100).

**Breaks When:** Framework reports coverage as decimal (0.0-1.0).

**Mitigation:** Normalize coverage values in parser.

**Status:** ✅ LIKELY ALREADY HANDLED (verify coverage-parser.ts)

---

## Documentation Inconsistencies

### INCONSISTENCY-1: None Found

All documents are internally consistent.

---

## Missing Edge Cases

### EDGE-1: What Happens When Organization Has No Policy?

**Scenario:** New organization, no policy file, no org-level policy.

**Current Docs Say:** Block (FAILURE_MODES.md)

**Recommendation:** Clarify default policy behavior:
```markdown
**Default Policy (if .readylayer/policy.yml missing):**
- Security scanning: ✅ Enabled (OWASP Top 10 + secrets)
- Test coverage: ❌ Disabled (no threshold)
- Doc sync: ❌ Disabled

Organizations can opt-out of defaults by creating empty policy:
```yaml
version: 1
review_guard:
  enabled: false  # Explicit opt-out
```
```

**Status:** 📋 CLARIFICATION NEEDED

---

### EDGE-2: What Happens During Provider Migration?

**Scenario:** Organization switches from OpenAI to Anthropic mid-PR.

**Current Docs Say:** Use locked policy version (GOVERNANCE_INVARIANTS.md)

**Question:** Is LLM provider locked with policy version?

**Recommendation:** Clarify:
```markdown
**LLM Provider Lock Behavior:**
- Policy version locked at PR creation
- LLM provider config **NOT locked** (uses current org config)
- Rationale: LLM suggestions are non-blocking, provider switch is safe
```

**Status:** 📋 CLARIFICATION NEEDED

---

### EDGE-3: What if ALL Providers Fail?

**Scenario:** OpenAI down, Anthropic down, OpenCode misconfigured.

**Current Docs Say:** Skip LLM (FAILURE_MODES.md)

**Question:** Does governance still pass with no LLM?

**Recommendation:** Already covered in FAILURE_MODES.md ✅

**Status:** ✅ HANDLED

---

## Recommendations Summary

### Immediate Fixes Required

1. ✅ Fix CLI command documentation (scan vs review)
2. ✅ Add Docker image availability caveat
3. ✅ Add GitHub Action availability caveat
4. ✅ Clarify `readylayer init` creates JSON, not YAML
5. ⚠️ Fix hardcoded provider names in cost tracking (code change)

### Clarifications Needed

6. ✅ Mark OpenRouter as "planned" not "experimental"
7. ✅ Mark Ollama as "CLI config exists, provider in progress"
8. ✅ Verify waiver signature field exists or clarify as planned

### Enhancements (Non-Blocking)

9. 📋 Dynamic provider-to-model mapping
10. 📋 Configurable API versions per provider
11. 📋 Default policy behavior documentation
12. 📋 Provider migration behavior documentation

---

## Overall Assessment

**Documentation Quality:** ✅ High (engineering-honest, no marketing fluff)

**Accuracy:** ⚠️ Good (95% accurate, 5% deployment assumptions)

**Completeness:** ✅ Excellent (covers failure modes, edge cases, trade-offs)

**Actionability:** ⚠️ Needs fixes (5 critical deployment issues)

**Recommendation:** **Fix 5 critical issues before publishing. Clarifications optional but recommended.**

---

## Sign-Off

- [x] Over-claims identified and documented
- [x] Hidden coupling surfaced
- [x] Future fragility risks assessed
- [x] Edge cases evaluated
- [x] Fixes prioritized

**Next Action:** Apply fixes to documentation and optionally fix CRITICAL-5 in code.

