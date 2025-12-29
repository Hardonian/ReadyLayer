# ReadyLayer — Doc Sync Specification (HARDENED)

## ENFORCEMENT-FIRST PRINCIPLES

**This is a hardened specification that enforces documentation sync by default.**

### Core Invariants
1. **Sync > Convenience:** Documentation must stay in sync, not optional
2. **Block > Auto-Update:** Drift blocks merge by default, not auto-updated
3. **Explicit > Silent:** All failures are explicit, no silent degradation
4. **Validation > Trust:** All generated docs are validated, not trusted

---

## Hardened Drift Prevention

### Drift Prevention Actions (BLOCK BY DEFAULT)
**Previous (PERMISSIVE):**
```yaml
drift_prevention:
  action: "auto_update"  # Default: auto-update, not blocking
```

**Hardened (ENFORCEMENT-FIRST):**
```yaml
drift_prevention:
  action: "block"  # REQUIRED: Default is block, not auto-update
  check_on: "pr"  # Required: pr, merge, or both
  enabled: true  # Required: Cannot be disabled
```

### Drift Detection (MUST BLOCK IF DRIFT DETECTED)
**Previous (PERMISSIVE):**
- "Auto-Update: Automatically update docs to match code"
- "Alert Only: Detect drift, alert team"

**Hardened (ENFORCEMENT-FIRST):**
- **Drift detection MUST block PR** by default:
  ```
  ⚠️ ReadyLayer Doc Sync: Drift Detected
  
  Cause: Code and documentation are out of sync
  Impact: API documentation does not match code changes
  
  Missing Endpoints:
  - GET /api/users/{id} (in code, not in docs)
  - POST /api/users (in code, not in docs)
  
  Changed Endpoints:
  - PUT /api/users/{id} (parameters changed in code, docs outdated)
  
  Required Action:
  1. Update documentation to match code changes
  2. Or regenerate docs by pushing a new commit
  3. ReadyLayer will re-check
  
  This PR is BLOCKED until documentation is in sync.
  ```
- **No silent auto-update** (must be explicit)
- **Status check:** "failure" if drift detected (not "success with warning")

### Drift Prevention Guarantees
1. **Drift detection:** Always enabled, cannot disable
2. **Drift action:** Default is "block", not "auto-update"
3. **Status check:** "failure" if drift detected (not "success with warning")
4. **PR merge:** Blocked if drift detected (enforced, not advisory)

---

## Hardened Documentation Generation

### Generation Failures (MUST BE EXPLICIT)
**Previous (PERMISSIVE):**
- "Generation failures: Log error, alert ops team"

**Hardened (ENFORCEMENT-FIRST):**
- **Generation failures MUST block PR** with explicit error:
  ```
  ⚠️ ReadyLayer Doc Sync Failed
  
  Cause: Cannot generate documentation
  Reason: Code parser failed to extract API endpoints
  Impact: Cannot ensure documentation stays in sync
  
  Files Affected:
  - src/api/users.ts (Parse error at line 42)
  
  Required Action:
  1. Fix parse error in code
  2. Or contact support@readylayer.com if issue persists
  
  This PR is BLOCKED until documentation can be generated.
  ```
- **No silent fallback** (cannot merge without docs)
- **Status check:** "failure" (not "success with warning")

### Validation Failures (MUST BLOCK PR)
- **OpenAPI validation errors:** Block PR with explicit error (file, line, reason)
- **Schema validation errors:** Block PR with explicit error (schema, reason)
- **Documentation format errors:** Block PR with explicit error (format, reason)

---

## Hardened Update Strategy

### Update Strategy (EXPLICIT, NOT SILENT)
**Previous (PERMISSIVE):**
- "Direct Commit: Commit docs directly to main branch"
- "PR Creation: Create PR with doc updates"

**Hardened (ENFORCEMENT-FIRST):**
- **Update strategy MUST be explicit:**
  ```yaml
  docs:
    update_strategy: "pr"  # Required: "commit" or "pr"
    branch: "main"  # Required: Target branch
    require_review: true  # Default: true for "pr" strategy
  ```
- **Direct commit:** Requires explicit approval (not default)
- **PR creation:** Default for safety (requires review)

### Update Failures (MUST BLOCK PR)
- **Commit failures:** Block PR with explicit error (reason, fix)
- **PR creation failures:** Block PR with explicit error (reason, fix)
- **Merge conflicts:** Block PR with explicit error (conflict files, fix)

---

## Hardened Configuration

### Configuration Validation (FAIL-SECURE)
```typescript
interface DocSyncConfig {
  enabled: boolean; // Default: true
  framework: string; // Auto-detect if not specified
  
  openapi: {
    version: "3.0" | "3.1"; // Required
    output_path: string; // Required
    enhance_with_llm: boolean; // Default: true
  };
  
  markdown: {
    enabled: boolean; // Default: true
    output_path: string; // Required if enabled
    template: "default" | "custom"; // Default: "default"
  };
  
  update_strategy: "commit" | "pr"; // Required, default: "pr"
  branch: string; // Required
  
  storage: {
    type: "github_releases" | "s3" | "registry" | "webhook";
    // ... type-specific config
  };
  
  drift_prevention: {
    enabled: true; // REQUIRED: Cannot be disabled
    action: "block"; // REQUIRED: Default is "block", not "auto_update"
    check_on: "pr" | "merge" | "both"; // Required
  };
  
  excluded_paths: string[]; // Default: ["**/vendor/**", "**/node_modules/**"]
}

function validateDocSyncConfig(config: DocSyncConfig): ValidationResult {
  // Drift prevention cannot be disabled
  if (config.drift_prevention.enabled === false) {
    return {
      valid: false,
      error: "drift_prevention.enabled cannot be disabled. Documentation sync is required.",
      fix: "Remove 'drift_prevention.enabled: false' from config or set to true."
    };
  }
  
  // Drift action must be "block" by default
  if (config.drift_prevention.action !== "block" && !hasAdminRole()) {
    return {
      valid: false,
      error: "drift_prevention.action must be 'block' by default. Override requires admin approval.",
      fix: "Set drift_prevention.action to 'block' or contact org admin for override."
    };
  }
  
  // Update strategy must be explicit
  if (!config.update_strategy) {
    return {
      valid: false,
      error: "update_strategy is required. Choose 'commit' or 'pr'.",
      fix: "Set update_strategy to 'commit' or 'pr' in config."
    };
  }
  
  return { valid: true };
}
```

---

## Hardened Error Messages

### Drift Detected (EXPLICIT)
```
⚠️ ReadyLayer Doc Sync: Drift Detected

Cause: Code and documentation are out of sync
Impact: API documentation does not match code changes

Missing Endpoints:
- GET /api/users/{id} (in code, not in docs)
  File: src/api/users.ts:42
  Action: Add endpoint to OpenAPI spec

Changed Endpoints:
- PUT /api/users/{id} (parameters changed in code, docs outdated)
  File: src/api/users.ts:89
  Code: { id: number, name: string, email: string }
  Docs: { id: number, name: string }
  Action: Update OpenAPI spec to match code

Required Action:
1. Update documentation to match code changes
2. Or regenerate docs by pushing a new commit
3. ReadyLayer will re-check

This PR is BLOCKED until documentation is in sync.
```

### Generation Failure (EXPLICIT)
```
⚠️ ReadyLayer Doc Sync Failed

Cause: Cannot generate documentation
Reason: Code parser failed to extract API endpoints
Impact: Cannot ensure documentation stays in sync

Files Affected:
- src/api/users.ts (Parse error at line 42)

Error Details:
Expected '}' but found ';'

Required Action:
1. Fix parse error in code
2. Or contact support@readylayer.com if issue persists

This PR is BLOCKED until documentation can be generated.
```

### Validation Failure (EXPLICIT)
```
⚠️ ReadyLayer Doc Sync: Validation Failed

Cause: Generated OpenAPI spec is invalid
Reason: Missing required field 'info.title'

File: docs/openapi.yaml
Line: 1

Required Action:
1. Fix OpenAPI spec validation errors
2. Or regenerate docs by pushing a new commit
3. ReadyLayer will re-validate

This PR is BLOCKED until documentation is valid.
```

---

## Hardened Acceptance Criteria

### Functional Requirements
1. ✅ Drift detection ALWAYS blocks PR if drift detected (cannot disable)
2. ✅ Documentation generation failures ALWAYS block PR (cannot disable)
3. ✅ Drift action default is "block" (not "auto-update")
4. ✅ Status checks reflect blocking state (failure = blocked)
5. ✅ All failures are explicit (no silent degradation)
6. ✅ All errors include fix instructions

### Non-Functional Requirements
1. ✅ Generate docs within 5 minutes per repo (P95)
2. ✅ Support 5+ frameworks
3. ✅ Handle repos with 100+ endpoints
4. ✅ Cache results to reduce API calls
5. ✅ **Explicit failures** (no silent degradation)
6. ✅ **Audit logging** for all blocks and overrides

### Quality Requirements
1. ✅ Generated specs are valid OpenAPI (>99%)
2. ✅ Generated docs are accurate (>95% match with code)
3. ✅ Drift detection accuracy (>99%)
4. ✅ False positive rate <5% (drift detection)
5. ✅ **Enforcement reliability** (blocks are enforced, not advisory)
