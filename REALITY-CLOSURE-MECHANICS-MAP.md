# ReadyLayer — Reality Closure Mechanics Map

**Purpose:** This document maps the exact deterministic flows for each ReadyLayer pillar. Every step is traced from trigger to output to storage to failure handling.

**Last Updated:** Generated during Reality Closure Pass

---

## PHASE 1: MECHANICS TRUTH AUDIT

### Review Guard — Complete Flow Map

#### Trigger
- **Source:** GitHub webhook `pull_request.opened` or `pull_request.synchronize`
- **Entry Point:** `POST /api/webhooks/github`
- **Validation:** HMAC signature verification via `githubWebhookHandler.validateSignature()`
- **Normalization:** Event normalized to `{ type: 'pr.opened' | 'pr.updated', repository, pr }`
- **Queue:** Event enqueued via `queueService.enqueue('webhook', payload)`

#### Data Entry
1. **Webhook Payload:** Raw GitHub event JSON
2. **Repository Lookup:** `getOrCreateRepository()` finds or creates `Repository` record
3. **Installation Token:** Decrypted via `getInstallationWithDecryptedToken()` (encrypted at rest)
4. **PR Diff:** Fetched via `prAdapter.getPRDiff(repository.fullName, pr.number, accessToken)`
5. **File Contents:** Fetched via `prAdapter.getFileContent()` for each changed file
6. **Repository Config:** Loaded from `RepositoryConfig` table (`.readylayer.yml` parsed)

#### Deterministic Steps
1. **Billing Check:** `checkBillingLimits(organizationId, { requireFeature: 'reviewGuard', checkLLMBudget: true })`
   - Returns `NextResponse` if limit exceeded (403)
   - Creates GitHub check run with "Billing limit exceeded" message
   - Throws error to stop processing
2. **File Filtering:** Files filtered by `config.excludedPaths` (glob pattern matching)
3. **Static Analysis:** `staticAnalysisService.analyze(file.path, file.content)` for each file
   - Returns `Issue[]` with deterministic rule-based findings
   - Includes founder-specific rules (auth patterns, large refactors, type erosion)
4. **Diff Analysis:** `analyzeDiffForLargeRefactors()` detects >30% file changes
5. **Schema Reconciliation:** If migration files detected, `schemaReconciliationService.reconcile()` runs
6. **AI Analysis:** `analyzeWithAI()` called for each file
   - RAG evidence query (if enabled) via `queryEvidence()`
   - LLM prompt built with file content + evidence
   - LLM call via `llmService.complete()` (gated by usage enforcement)
   - Response parsed as JSON `Issue[]`
   - Validated: must have `ruleId`, `severity`, `message`, `line > 0`
7. **Policy Evaluation:** `policyEngineService.loadEffectivePolicy()` loads policy pack
   - Checks `PolicyPack` table (org-level or repo-level)
   - Applies waivers from `Waiver` table
   - Evaluates findings via `policyEngineService.evaluate(findings, policy)`
   - Returns `{ blocked, blockingReason, nonWaivedFindings, waivedFindings, score }`
8. **Summary Calculation:** Counts by severity from `nonWaivedFindings`
9. **Blocking Decision:** `isBlocked = evaluationResult.blocked` (policy-driven)

#### Output Production
1. **Review Record:** Created in `Review` table
   - `status`: 'blocked' | 'completed' | 'failed'
   - `isBlocked`: boolean
   - `blockedReason`: string (if blocked)
   - `issuesFound`: JSON array of `Issue[]`
   - `summary`: JSON `{ total, critical, high, medium, low }`
   - `result`: JSON with full evaluation result
2. **Evidence Bundle:** `policyEngineService.produceEvidence()` creates `EvidenceBundle`
   - `diffHash`: SHA-256 of diff content
   - `fileListHash`: SHA-256 of file list
   - `rulesFired`: Array of rule IDs evaluated
   - `deterministicScore`: 0-100 score
   - `policyChecksum`: SHA-256 of policy pack source
3. **Violation Tracking:** `trackViolations()` creates `Violation` records for pattern detection
4. **Token Usage:** `recordTokenUsage()` creates `TokenUsage` record
   - Tracks `inputTokens`, `outputTokens`, `cost`, `wastePercentage`
5. **GitHub Check Run:** `prAdapter.createOrUpdateCheckRun()` creates/updates check run
   - `conclusion`: 'failure' if blocked, 'success' if not
   - `annotations`: Up to 50 `CheckRunAnnotation[]` (GitHub API limit)
   - `output.summary`: Policy check summary with score
6. **PR Comment:** Posted if `isBlocked && issues.length > 0`
   - Formatted via `formatPolicyComment()`
   - Includes non-waived findings, score, blocking reason

#### Storage
- **Review:** `Review` table (primary record)
- **Evidence Bundle:** `EvidenceBundle` table (linked via `reviewId`)
- **Violations:** `Violation` table (for pattern detection)
- **Token Usage:** `TokenUsage` table (for cost tracking)
- **Audit Log:** `AuditLog` table (enforcement decisions)
- **RAG Index:** If enabled, review result ingested via `ingestDocument()`

#### Failure Handling
1. **Missing Token:** Installation token decryption fails
   - Error logged, check run created with "Review failed" status
   - PR not blocked (graceful degradation)
2. **Invalid Webhook:** Signature validation fails
   - Returns 401 immediately (no processing)
3. **Billing Limit Exceeded:** `checkBillingLimits()` returns error response
   - Check run created with "Billing limit exceeded" message
   - Error thrown, processing stops
   - User sees actionable upgrade message
4. **LLM Failure:** `llmService.complete()` throws
   - If `UsageLimitExceededError`: Wrapped with upgrade message, PR blocked
   - If other error: PR blocked with "LLM analysis failed" message
   - Review record created with `status: 'failed'`, `isBlocked: true`
5. **Parse Error:** File parsing fails
   - PR blocked with "Failed to analyze {file}" message
   - Review record created with `status: 'failed'`
6. **Policy Load Failure:** Policy pack not found or invalid
   - Default policy used (conservative: critical blocks, high warns)
   - Logged as warning, processing continues
7. **Check Run Creation Failure:** GitHub API call fails
   - Error logged, review record still saved
   - PR comment posted as fallback (if possible)
8. **Database Failure:** Prisma operation fails
   - Error logged, check run created with error status
   - PR blocked (fail-secure)

---

### Test Engine — Complete Flow Map

#### Trigger
- **Source:** GitHub webhook `pull_request.opened` or `pull_request.synchronize` (after Review Guard)
- **Entry Point:** `processPREvent()` in `webhook-processor.ts`
- **Condition:** Runs after Review Guard completes (success or failure)
- **Alternative:** Direct API call `POST /api/v1/test-runs` (not yet implemented)

#### Data Entry
1. **AI-Touched Detection:** `testEngineService.detectAITouchedFiles(repositoryId, files)`
   - Checks commit message for AI keywords
   - Checks author for AI patterns
   - Checks file content for AI patterns
   - Returns `Array<{ path, confidence, methods }>` where `confidence >= 0.5`
2. **File Content:** Already fetched during Review Guard processing
3. **Repository Config:** Loaded from `RepositoryConfig` table
   - `test.coverage.threshold`: Minimum 80% (enforced)
   - `test.framework`: Auto-detected if not specified

#### Deterministic Steps
1. **Billing Check:** `checkBillingLimits(organizationId, { requireFeature: 'testEngine', checkLLMBudget: true })`
   - Returns error response if limit exceeded
   - Test generation skipped (not blocked, just skipped)
2. **Framework Detection:** `detectFramework(repositoryId)` or use `config.framework`
   - Checks `package.json` for test framework (jest, mocha, pytest, etc.)
   - Defaults to 'jest' for TypeScript/JavaScript
3. **Code Parsing:** `codeParserService.parse(filePath, fileContent)`
   - Extracts functions, classes, exports
   - Returns parse tree for test generation
4. **Test Generation:** `generateTests({ repositoryId, prNumber, prSha, filePath, fileContent, framework })`
   - RAG evidence query (if enabled) for similar test patterns
   - LLM prompt built with code + parse result + evidence
   - LLM call via `llmService.complete()` (gated by usage enforcement)
   - Test code extracted from response (code block or raw)
5. **Test Validation:** `validateTestSyntax(testContent, framework)`
   - Checks test is not empty
   - Validates framework-specific syntax (jest: `describe`/`test`, pytest: `def test_`)
6. **Placement Determination:** `determinePlacement(filePath, config.placement, config.testDir)`
   - 'co-located': Next to source file (`file.test.ts`)
   - 'separate': In test directory
   - 'mirror': Mirror directory structure
7. **Policy Evaluation:** `policyEngineService.loadEffectivePolicy()` loads policy
   - Evaluates AI-touched finding (severity: high)
   - Returns `{ blocked, blockingReason }`
8. **Coverage Check:** `checkCoverage()` called when CI completes
   - Parses coverage data (lcov or JSON)
   - Compares against threshold (minimum 80%)
   - Creates finding if below threshold
   - Policy evaluation determines if blocks

#### Output Production
1. **Test Record:** Created in `Test` table
   - `status`: 'generated' | 'blocked' | 'failed'
   - `testContent`: Generated test code
   - `framework`: Detected/given framework
   - `placement`: Where test should be placed
   - `coverage`: JSON coverage metrics (if available)
2. **Evidence Bundle:** `policyEngineService.produceEvidence()` creates `EvidenceBundle`
   - `fileHash`: SHA-256 of source file
   - `aiTouched`: boolean
   - `testGenerated`: boolean
3. **RAG Ingestion:** Test precedent ingested via `ingestDocument()`
   - `sourceType`: 'test_precedent'
   - Used for future test generation

#### Storage
- **Test:** `Test` table (primary record)
- **Evidence Bundle:** `EvidenceBundle` table (linked via `testId`)
- **RAG Index:** Test precedent ingested (if enabled)

#### Failure Handling
1. **Billing Limit Exceeded:** Test generation skipped (not blocked)
   - Logged as warning
   - PR continues (test generation is optional)
2. **LLM Failure:** Test generation fails
   - Error logged, test record created with `status: 'failed'`
   - PR not blocked (test generation is advisory)
3. **Parse Failure:** Code parsing fails
   - Error logged, test generation skipped
   - PR continues
4. **Validation Failure:** Generated test invalid
   - Error thrown, test record created with `status: 'failed'`
   - PR not blocked (fail-open for test generation)

---

### Doc Sync — Complete Flow Map

#### Trigger
- **Source:** GitHub webhook `pull_request.closed` with `merged: true`
- **Entry Point:** `processMergeEvent()` in `webhook-processor.ts`
- **Condition:** PR merged to main branch
- **Alternative:** Direct API call (not yet implemented)

#### Data Entry
1. **Repository:** Repository ID from webhook
2. **Ref:** Merge commit SHA (`pr.merge_commit_sha`)
3. **Format:** 'openapi' or 'markdown' (from config or default 'openapi')
4. **Repository Config:** Loaded from `RepositoryConfig` table
   - `docs.drift_prevention.enabled`: Always true (enforced)
   - `docs.drift_prevention.action`: 'block' (default) | 'auto_update' | 'alert'

#### Deterministic Steps
1. **Framework Detection:** `detectFramework(repositoryId)`
   - Checks for Express, Fastify, Flask, Django patterns
   - Defaults to 'express'
2. **Endpoint Extraction:** `extractEndpoints(repositoryId, ref, framework)`
   - Parses route definitions from code
   - Returns `Array<{ method, path, file, line, params }>`
3. **Documentation Generation:**
   - **OpenAPI:** `generateOpenAPI(endpoints, version, enhanceWithLLM, organizationId)`
     - Builds basic OpenAPI spec from endpoints
     - If `enhanceWithLLM`: LLM enhances with descriptions, parameters, examples
     - RAG evidence query for doc conventions
   - **Markdown:** `generateMarkdown(endpoints, organizationId)`
     - Generates simple markdown API docs
4. **Validation:** `validateDocs(content, format)`
   - OpenAPI: Validates JSON structure, required fields
   - Markdown: Basic validation
5. **Drift Check:** `checkDrift(repositoryId, ref, config)`
   - Loads latest `Doc` record for repository
   - Extracts endpoints from current code
   - Compares with documented endpoints
   - Finds missing, extra, changed endpoints
6. **Policy Evaluation:** `policyEngineService.loadEffectivePolicy()` loads policy
   - Creates findings for drift (severity: high for missing, medium for changed)
   - Evaluates findings
   - Returns `{ blocked, blockingReason }`

#### Output Production
1. **Doc Record:** Created in `Doc` table
   - `status`: 'generated' | 'blocked' | 'failed'
   - `content`: Generated doc content
   - `spec`: Parsed OpenAPI spec (if format is 'openapi')
   - `driftDetected`: boolean
   - `driftDetails`: JSON with missing/extra/changed endpoints
   - `publishedAt`: Timestamp if `updateStrategy === 'commit'` and not blocked
2. **Evidence Bundle:** `policyEngineService.produceEvidence()` creates `EvidenceBundle`
   - `contentHash`: SHA-256 of doc content
   - `driftDetected`: boolean
3. **RAG Ingestion:** Doc convention ingested via `ingestDocument()`
   - `sourceType`: 'doc_convention'
   - Used for future doc generation

#### Storage
- **Doc:** `Doc` table (primary record)
- **Evidence Bundle:** `EvidenceBundle` table (linked via `docId`)
- **RAG Index:** Doc convention ingested (if enabled)

#### Failure Handling
1. **Framework Detection Failure:** Defaults to 'express', continues
2. **Endpoint Extraction Failure:** Returns empty array, generates minimal docs
3. **LLM Enhancement Failure:** Uses basic spec, continues (graceful degradation)
4. **Validation Failure:** Doc generation fails
   - Error thrown, doc record created with `status: 'failed'`
   - PR not blocked (doc generation happens after merge)
5. **Drift Check Failure:** Error logged, drift assumed false
   - Processing continues

---

## IDENTIFIED GAPS & PARTIAL WIRING

### Gap 1: Test Engine Coverage Enforcement Not Wired
- **Issue:** `checkCoverage()` exists but not called from webhook processor
- **Location:** `services/test-engine/index.ts:301`
- **Impact:** Coverage threshold not enforced on PRs
- **Fix Required:** Call `checkCoverage()` when CI workflow completes

### Gap 2: Doc Sync Not Triggered on PR (Only Merge)
- **Issue:** Doc Sync only runs on merge, not on PR open/update
- **Location:** `workers/webhook-processor.ts:519`
- **Impact:** Drift detection happens too late (after merge)
- **Fix Required:** Run drift check on PR open/update, generate docs on merge

### Gap 3: Usage Enforcement Not Integrated with LLM Service
- **Issue:** `llmService.complete()` doesn't check usage limits before calling
- **Location:** `services/llm/index.ts`
- **Impact:** Usage limits checked in middleware but not in service layer
- **Fix Required:** Add `usageEnforcementService.checkLLMRequest()` call in LLM service

### Gap 4: Billing Check Returns Response Instead of Throwing
- **Issue:** `checkBillingLimits()` returns `NextResponse | null` but services expect exceptions
- **Location:** `lib/billing-middleware.ts:20`
- **Impact:** Inconsistent error handling (webhook processor checks return value, services don't)
- **Fix Required:** Create `checkBillingLimitsOrThrow()` for service use

### Gap 5: Test Engine Billing Check Returns Blocked Status Instead of Throwing
- **Issue:** `testEngineService.generateTests()` returns `{ status: 'blocked' }` instead of throwing
- **Location:** `services/test-engine/index.ts:157`
- **Impact:** Caller must check status, inconsistent with Review Guard behavior
- **Fix Required:** Throw `UsageLimitExceededError` instead

### Gap 6: Missing Error Handling for Missing Installation
- **Issue:** `getInstallationWithDecryptedToken()` may return null, not handled everywhere
- **Location:** `workers/webhook-processor.ts:118`
- **Impact:** Potential null pointer exceptions
- **Fix Required:** Add null checks and graceful degradation

### Gap 7: RAG Evidence Query Failures Not Logged
- **Issue:** Evidence query failures are caught but only console.warn
- **Location:** `services/review-guard/index.ts:374`
- **Impact:** No observability for RAG failures
- **Fix Required:** Use structured logger instead of console.warn

### Gap 8: Policy Engine Default Policy Not Deterministic
- **Issue:** Default policy created dynamically based on tier, not stored
- **Location:** `services/policy-engine/index.ts:415`
- **Impact:** Same org may get different defaults if tier changes
- **Fix Required:** Store default policy in database or make deterministic

---

## NEXT STEPS

1. Fix all identified gaps (8 items)
2. Add comprehensive error handling for all failure modes
3. Add logging for all major decision points
4. Verify deterministic behavior (same inputs → same outputs)
5. Test end-to-end flows with failure injection
6. Document failure matrix in code comments
