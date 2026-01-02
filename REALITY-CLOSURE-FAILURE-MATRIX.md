# ReadyLayer — Failure & Edge-Case Matrix

**Purpose:** This document enumerates all failure modes and their graceful handling strategies.

**Last Updated:** Generated during Reality Closure Pass

---

## FAILURE MODES BY COMPONENT

### 1. Webhook Processing Failures

#### Missing Webhook Signature
- **Trigger:** `x-hub-signature-256` header missing or invalid
- **Detection:** `githubWebhookHandler.validateSignature()` returns false
- **Handling:** Return 401 immediately, no processing
- **User Impact:** None (invalid webhook rejected)
- **Logging:** Error logged with request ID

#### Missing Installation Token
- **Trigger:** Installation not found or token decryption fails
- **Detection:** `getInstallationWithDecryptedToken()` returns null
- **Handling:** Error thrown, check run created with "Review failed" status
- **User Impact:** PR not blocked (graceful degradation)
- **Logging:** Error logged with installation ID

#### Invalid PR Data
- **Trigger:** PR number, SHA, or repository data missing
- **Detection:** Validation in `normalizeEvent()`
- **Handling:** Error thrown, webhook processing stops
- **User Impact:** None (invalid event rejected)
- **Logging:** Warning logged

---

### 2. Review Guard Failures

#### Billing Limit Exceeded
- **Trigger:** `checkBillingLimits()` returns error response
- **Detection:** Before review processing starts
- **Handling:** 
  - Check run created with "Billing limit exceeded" message
  - Error thrown, processing stops
  - User sees actionable upgrade message
- **User Impact:** PR blocked until upgrade or limit reset
- **Logging:** Info logged with organization ID and limit type

#### LLM API Failure
- **Trigger:** `llmService.complete()` throws (network, timeout, API error)
- **Detection:** Exception caught in `analyzeWithAI()`
- **Handling:**
  - If `UsageLimitExceededError`: Re-thrown with upgrade message
  - If other error: PR blocked with "LLM analysis failed" message
  - Review record created with `status: 'failed'`, `isBlocked: true`
- **User Impact:** PR blocked until LLM available
- **Logging:** Error logged with file path and error details

#### File Parse Failure
- **Trigger:** Code parsing fails (syntax error, unsupported language)
- **Detection:** Exception in file analysis loop
- **Handling:**
  - PR blocked with "Failed to analyze {file}" message
  - Review record created with `status: 'failed'`
- **User Impact:** PR blocked until file can be parsed
- **Logging:** Error logged with file path

#### Policy Load Failure
- **Trigger:** Policy pack not found or invalid
- **Detection:** `policyEngineService.loadEffectivePolicy()` throws
- **Handling:**
  - Default policy used (conservative: critical blocks, high warns)
  - Warning logged, processing continues
- **User Impact:** None (default policy applied)
- **Logging:** Warning logged with organization ID

#### Database Failure
- **Trigger:** Prisma operation fails (connection, constraint violation)
- **Detection:** Exception in database operation
- **Handling:**
  - Error logged, check run created with error status
  - PR blocked (fail-secure)
- **User Impact:** PR blocked until database available
- **Logging:** Error logged with operation and error details

#### Check Run Creation Failure
- **Trigger:** GitHub API call fails (rate limit, network error)
- **Detection:** Exception in `prAdapter.createOrUpdateCheckRun()`
- **Handling:**
  - Error logged, review record still saved
  - PR comment posted as fallback (if possible)
- **User Impact:** Review result saved but not visible in GitHub UI
- **Logging:** Error logged with repository and PR number

---

### 3. Test Engine Failures

#### Billing Limit Exceeded
- **Trigger:** `checkBillingLimitsOrThrow()` throws `UsageLimitExceededError`
- **Detection:** Before test generation starts
- **Handling:**
  - Error thrown, test generation skipped
  - PR not blocked (test generation is optional)
- **User Impact:** Tests not generated, PR continues
- **Logging:** Warning logged with organization ID

#### LLM Failure
- **Trigger:** `llmService.complete()` throws
- **Detection:** Exception in `generateTests()`
- **Handling:**
  - Error logged, test record created with `status: 'failed'`
  - PR not blocked (test generation is advisory)
- **User Impact:** Tests not generated, PR continues
- **Logging:** Error logged with file path

#### Parse Failure
- **Trigger:** Code parsing fails
- **Detection:** Exception in `codeParserService.parse()`
- **Handling:**
  - Error logged, test generation skipped
  - PR continues
- **User Impact:** Tests not generated for that file, PR continues
- **Logging:** Warning logged with file path

#### Validation Failure
- **Trigger:** Generated test invalid (syntax error, wrong framework)
- **Detection:** `validateTestSyntax()` throws
- **Handling:**
  - Error thrown, test record created with `status: 'failed'`
  - PR not blocked (fail-open for test generation)
- **User Impact:** Tests not generated, PR continues
- **Logging:** Error logged with test content preview

---

### 4. Doc Sync Failures

#### Framework Detection Failure
- **Trigger:** Framework detection fails
- **Detection:** Exception in `detectFramework()`
- **Handling:**
  - Defaults to 'express', continues
- **User Impact:** None (default framework used)
- **Logging:** Warning logged

#### Endpoint Extraction Failure
- **Trigger:** Endpoint extraction fails (code not parseable)
- **Detection:** Exception in `extractEndpoints()`
- **Handling:**
  - Returns empty array, generates minimal docs
- **User Impact:** Docs generated but incomplete
- **Logging:** Warning logged with repository ID

#### LLM Enhancement Failure
- **Trigger:** LLM enhancement fails
- **Detection:** Exception in `generateOpenAPI()` LLM call
- **Handling:**
  - Uses basic spec, continues (graceful degradation)
- **User Impact:** Docs generated but without LLM enhancements
- **Logging:** Warning logged

#### Validation Failure
- **Trigger:** Generated docs invalid (invalid OpenAPI spec)
- **Detection:** `validateDocs()` throws
- **Handling:**
  - Error thrown, doc record created with `status: 'failed'`
  - PR not blocked (doc generation happens after merge)
- **User Impact:** Docs not generated, merge continues
- **Logging:** Error logged with doc content preview

#### Drift Check Failure
- **Trigger:** Drift check fails (database error, parse error)
- **Detection:** Exception in `checkDrift()`
- **Handling:**
  - Error logged, drift assumed false
  - Processing continues
- **User Impact:** None (drift check skipped)
- **Logging:** Warning logged

---

### 5. Infrastructure Failures

#### Database Connection Failure
- **Trigger:** Prisma connection fails (timeout, network error)
- **Detection:** Prisma operation throws connection error
- **Handling:**
  - Error logged, operation retried (if idempotent)
  - Non-idempotent operations fail gracefully
- **User Impact:** Operation fails, user sees error message
- **Logging:** Error logged with operation and retry count

#### Redis Queue Failure
- **Trigger:** Redis connection fails or queue operation fails
- **Detection:** `queueService.enqueue()` throws
- **Handling:**
  - Error logged, webhook returns 500
  - Event may be lost (non-critical)
- **User Impact:** Webhook not processed, may need retry
- **Logging:** Error logged with event type

#### Supabase Auth Failure
- **Trigger:** Supabase auth service unavailable
- **Detection:** `getEdgeAuthUser()` throws or returns null
- **Handling:**
  - For API routes: Returns 503 Service Unavailable
  - For page routes: Redirects to signin
- **User Impact:** User cannot access protected routes
- **Logging:** Warning logged with route path

---

### 6. Edge Cases

#### Empty PR (No Files Changed)
- **Trigger:** PR has no changed files
- **Detection:** `files.length === 0` in `processPREvent()`
- **Handling:**
  - Review Guard skipped (nothing to review)
  - Check run created with "No changes to review" message
- **User Impact:** None (expected behavior)
- **Logging:** Info logged

#### Very Large PR (>100 files)
- **Trigger:** PR has many changed files
- **Detection:** `files.length > 100`
- **Handling:**
  - Files processed in batches
  - Annotations limited to 50 (GitHub API limit)
  - Review may take longer
- **User Impact:** Review takes longer, some issues may not be annotated
- **Logging:** Info logged with file count

#### Concurrent PR Updates
- **Trigger:** Multiple webhooks for same PR arrive simultaneously
- **Detection:** Multiple reviews for same `(repositoryId, prNumber, prSha)`
- **Handling:**
  - Database unique constraint prevents duplicates
  - Latest review wins (based on `createdAt`)
- **User Impact:** Only latest review shown
- **Logging:** Warning logged if duplicate detected

#### Token Expiration During Processing
- **Trigger:** Installation token expires during long-running review
- **Detection:** GitHub API returns 401 Unauthorized
- **Handling:**
  - Error logged, review marked as failed
  - Token refresh attempted (if possible)
- **User Impact:** Review fails, may need retry
- **Logging:** Error logged with token expiration time

---

## GRACEFUL DEGRADATION STRATEGIES

### 1. Fail-Secure (Block PR)
- **When:** Critical security checks fail
- **Examples:** Review Guard LLM failure, file parse failure
- **Rationale:** Better to block than allow potentially unsafe code

### 2. Fail-Open (Allow PR)
- **When:** Non-critical features fail
- **Examples:** Test generation failure, doc sync failure
- **Rationale:** Don't block PRs for optional features

### 3. Fail-Soft (Degrade Feature)
- **When:** Enhancement fails but core feature works
- **Examples:** RAG evidence query failure, LLM doc enhancement failure
- **Rationale:** Provide basic functionality even if enhancements fail

### 4. Retry with Backoff
- **When:** Transient failures (network, rate limits)
- **Examples:** LLM API timeout, GitHub API rate limit
- **Rationale:** Many failures are transient and resolve on retry

---

## ERROR RESPONSE STANDARDS

### HTTP Status Codes
- **200:** Success
- **400:** Bad Request (invalid input)
- **401:** Unauthorized (missing/invalid auth)
- **403:** Forbidden (billing limit exceeded, feature not available)
- **402:** Payment Required (LLM budget exceeded)
- **404:** Not Found (resource doesn't exist)
- **429:** Too Many Requests (rate limit exceeded)
- **500:** Internal Server Error (unexpected error)
- **503:** Service Unavailable (dependency unavailable)

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "context": {
      "limitType": "llm_tokens_daily",
      "current": 100000,
      "limit": 50000,
      "remaining": -50000
    }
  }
}
```

---

## LOGGING STANDARDS

### Log Levels
- **ERROR:** System errors, failures that block operations
- **WARN:** Degraded functionality, non-critical failures
- **INFO:** Normal operations, important state changes
- **DEBUG:** Detailed debugging information (dev only)

### Log Context
All logs must include:
- `requestId`: Unique request identifier
- `organizationId`: Organization context (if available)
- `repositoryId`: Repository context (if available)
- `userId`: User context (if available)
- `error`: Error object (if error log)

---

## MONITORING & ALERTING

### Critical Alerts
- Database connection failures > 5% for 5 minutes
- LLM API failures > 10% for 5 minutes
- Billing check failures > 1% for 1 hour

### Warning Alerts
- Check run creation failures > 5% for 15 minutes
- RAG evidence query failures > 20% for 1 hour
- Test generation failures > 50% for 1 hour

### Info Metrics
- Review completion rate
- Average review duration
- PR blocking rate by severity
