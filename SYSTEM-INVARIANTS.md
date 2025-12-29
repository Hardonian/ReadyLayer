# ReadyLayer — System Invariants

**What ReadyLayer Guarantees, Always**

---

## Core Invariants

### 1. Rules > AI
**Guarantee:** Deterministic rules always override AI judgment.

**Enforcement:**
- Static analysis rules are evaluated first
- AI analysis is used only when rules are inconclusive
- AI uncertainty escalates to blocking, not permissive
- AI hallucination is detected and blocked

**Example:**
- Rule detects SQL injection → Blocks PR (AI not consulted)
- Rule uncertain → AI analyzes → If AI uncertain → Blocks PR

---

### 2. Enforcement > Insight
**Guarantee:** Blocking is default, warnings are exception.

**Enforcement:**
- Critical issues **always block** (cannot disable)
- High issues **block by default** (can disable with admin approval)
- Status checks reflect blocking state (failure = blocked)
- PR merge is prevented if blocking issues exist

**Example:**
- Critical security issue found → PR blocked, cannot merge
- High quality issue found → PR blocked by default, can override with admin approval
- Medium style issue found → PR warned, can merge

---

### 3. Safety > Convenience
**Guarantee:** Fail-secure defaults, explicit overrides required.

**Enforcement:**
- Defaults are secure (blocking, not permissive)
- Overrides require admin approval
- Config validation fails secure (invalid = block)
- Missing config uses secure defaults

**Example:**
- Config missing → Uses secure defaults (fail_on_critical: true, fail_on_high: true)
- Config invalid → PR blocked with explicit error
- Override requested → Requires admin approval

---

### 4. Explicit > Silent
**Guarantee:** All failures are explicit, no silent degradation.

**Enforcement:**
- LLM failures block PR with explicit error (not silent fallback)
- Parse errors block PR with explicit error (file, line, reason)
- Config errors block PR with explicit error (config file, line, fix)
- Partial failures are explicit (not silent partial success)

**Example:**
- LLM API down → PR blocked with explicit error: "LLM API unavailable, retry in 60 seconds"
- Parse error → PR blocked with explicit error: "Syntax error in src/auth.ts:42, fix required"
- Config error → PR blocked with explicit error: "Invalid config at line 5, fix required"

---

## Module-Specific Invariants

### Review Guard Invariants

1. **Critical issues ALWAYS block PR merge** (cannot disable)
2. **High issues block by default** (can disable with admin approval)
3. **Status checks reflect blocking state** (failure = blocked, not "success with warnings")
4. **All failures include fix instructions** (not just descriptions)
5. **LLM failures block PR** (not silent fallback to static analysis)

**Guarantees:**
- No critical security issue can merge without explicit override (admin approval)
- No high quality issue can merge without explicit override (admin approval)
- All blocking issues are visible in status checks
- All failures are explicit with fix instructions

---

### Test Engine Invariants

1. **Coverage threshold minimum 80%** (cannot go below)
2. **Coverage enforcement ALWAYS blocks if below threshold** (cannot disable)
3. **Test generation failures block PR** (not silent fallback)
4. **Coverage calculation failures block PR** (not silent fallback)
5. **All failures include fix instructions** (not just descriptions)

**Guarantees:**
- No PR can merge with coverage below 80%
- No PR can merge if test generation fails
- No PR can merge if coverage calculation fails
- All failures are explicit with fix instructions

---

### Doc Sync Invariants

1. **Drift prevention ALWAYS enabled** (cannot disable)
2. **Drift action default is "block"** (not "auto-update")
3. **Generation failures block PR** (not silent fallback)
4. **Validation failures block PR** (not silent fallback)
5. **All failures include fix instructions** (not just descriptions)

**Guarantees:**
- No PR can merge if documentation drift is detected
- No PR can merge if documentation generation fails
- No PR can merge if documentation validation fails
- All failures are explicit with fix instructions

---

## System-Wide Invariants

### Error Handling Invariants

1. **All failures name cause** (not generic "error")
2. **All failures name file/permission/config at fault** (specific location)
3. **All failures give concrete fix** (actionable instructions)
4. **No silent fallbacks** (all failures are explicit)
5. **No silent degradation** (all failures are visible)

**Guarantees:**
- Every error message includes: cause, location, fix
- No error message is generic or vague
- No failure is silent or hidden
- All failures are visible in status checks

---

### State Persistence Invariants

1. **Queue durability** (survives redeploys)
2. **In-flight reviews persist** (survive redeploys)
3. **Historical data persists** (for pattern detection)
4. **Config persists** (survives redeploys)

**Guarantees:**
- No in-flight review is lost on redeploy
- No queue message is lost on redeploy
- Historical data is retained for pattern detection
- Config changes persist across redeploys

---

### AI Degradation Invariants

1. **AI uncertainty escalates to blocking** (not permissive)
2. **AI hallucination is detected and blocked** (not trusted)
3. **AI confidence < 80% blocks PR** (requires manual review)
4. **LLM failures block PR** (not silent fallback)

**Guarantees:**
- No AI uncertainty is resolved permissively
- No AI hallucination is trusted
- No low-confidence AI output is accepted
- No LLM failure is silent

---

### Config Validation Invariants

1. **Invalid config blocks PR** (not warns)
2. **Missing config uses secure defaults** (not permissive defaults)
3. **Override requires admin approval** (not automatic)
4. **Config changes are audit logged** (for compliance)

**Guarantees:**
- No invalid config is accepted
- No missing config uses permissive defaults
- No override is automatic
- All config changes are logged

---

## Operational Invariants

### Availability Invariants

1. **Health checks exist** (for monitoring)
2. **Kill switches exist** (for emergency stops)
3. **Graceful degradation is explicit** (not silent)
4. **Service failures block PR** (not silent)

**Guarantees:**
- System health is monitorable
- System can be stopped in emergency
- Degradation is visible, not silent
- Service failures are explicit

---

### Cost Invariants

1. **AI spend guards exist** (prevent runaway costs)
2. **Rate limits exist** (prevent API abuse)
3. **Cost tracking exists** (for visibility)
4. **Budget limits are enforced** (not advisory)

**Guarantees:**
- No runaway AI costs
- No API abuse
- Cost is visible
- Budget limits are enforced

---

## Compliance Invariants

### Audit Logging Invariants

1. **All blocks are logged** (who, what, when, why)
2. **All overrides are logged** (admin approvals, config changes)
3. **All failures are logged** (system errors, LLM failures, parse errors)
4. **Logs are immutable** (for compliance)

**Guarantees:**
- Complete audit trail exists
- All actions are traceable
- Compliance requirements are met
- Logs cannot be modified

---

## Why These Invariants Matter

### For Users

1. **Predictable behavior:** Invariants guarantee consistent behavior
2. **Explicit failures:** Users know exactly what went wrong and how to fix it
3. **Enforcement guarantees:** Users know what will be blocked and why
4. **Security guarantees:** Users know critical issues will always be blocked

### For Operators

1. **Operational clarity:** Invariants make system behavior predictable
2. **Failure visibility:** All failures are explicit and visible
3. **Cost control:** AI spend guards prevent runaway costs
4. **Compliance:** Audit logging ensures compliance requirements are met

### For Competitors

1. **Irreducible complexity:** Invariants create complexity that's hard to replicate
2. **Enforcement guarantees:** Competitors cannot easily replicate enforcement guarantees
3. **Operational gravity:** Invariants create dependencies that are hard to remove
4. **Historical context:** Invariants create value that competitors cannot recreate

---

## Conclusion

These invariants guarantee that ReadyLayer:
- **Enforces behavior** (not just suggests)
- **Fails secure** (not permissive)
- **Fails explicit** (not silent)
- **Provides guarantees** (not best-effort)

**Result:** ReadyLayer is **dangerous to remove, safe to trust, annoying to live without**.
