# ReadyLayer — GitHub Integration

## Overview

GitHub is the primary integration for ReadyLayer. The GitHub integration enables PR reviews, test generation, documentation sync, and CI/CD integration through GitHub Apps and webhooks.

---

## Core Use Cases

### 1. PR Review Automation
**Use Case:** Automatically review AI-generated code in pull requests

**Flow:**
1. Developer opens PR with AI-generated code
2. ReadyLayer detects PR via webhook
3. Review Guard analyzes code for risks
4. ReadyLayer posts inline comments and summary
5. Developer addresses issues or merges

**Value:** Catch security and quality issues before merge

---

### 2. Test Generation
**Use Case:** Automatically generate tests for AI-touched files

**Flow:**
1. PR opened with AI-generated code
2. ReadyLayer detects AI-touched files
3. Test Engine generates tests using repo's test framework
4. ReadyLayer posts PR comment with generated tests
5. Developer reviews and commits tests

**Value:** Ensure AI-generated code has test coverage

---

### 3. Documentation Sync
**Use Case:** Automatically update API docs on merge

**Flow:**
1. PR merged to main
2. ReadyLayer detects merge via webhook
3. Doc Sync parses code for API changes
4. ReadyLayer generates/updates OpenAPI spec
5. ReadyLayer commits docs to repo (or creates PR)

**Value:** Keep documentation in sync with code

---

### 4. CI Status Checks
**Use Case:** Enforce quality gates in CI/CD

**Flow:**
1. PR updated, CI runs
2. ReadyLayer checks test coverage
3. ReadyLayer updates GitHub status check
4. If coverage below threshold, status = failure
5. PR blocked from merge until fixed

**Value:** Enforce quality standards automatically

---

## Required Scopes / Permissions

### GitHub App Permissions

#### Repository Permissions
- **Contents:** Read (required to read file contents, diffs)
- **Metadata:** Read (required, always granted)
- **Pull requests:** Read & Write (required to read PRs, post comments)
- **Checks:** Write (required to update status checks)

#### Organization Permissions
- **Members:** Read (optional, for RBAC)
- **Administration:** Read (optional, for org-level config)

#### Account Permissions
- **Email addresses:** Read (optional, for user identification)

### Recommended Scopes (Least Privilege)
```
contents:read
pull_requests:read
pull_requests:write
checks:write
```

**Note:** We request minimum scopes. Users can grant additional permissions if needed.

---

## Event Flows

### Flow 1: PR Opened → Review + Test Generation

```
1. Developer opens PR
   ↓
2. GitHub sends webhook: pull_request.opened
   POST /webhooks/github
   {
     "action": "opened",
     "pull_request": { ... },
     "repository": { ... }
   }
   ↓
3. ReadyLayer validates webhook (HMAC signature)
   ↓
4. ReadyLayer normalizes event to internal format
   Event: pr.opened
   ↓
5. ReadyLayer publishes event to event bus
   ↓
6. Review Guard Service consumes event
   - Fetches PR diff via GitHub API
   - Analyzes code for risks
   - Generates review comments
   ↓
7. Test Engine Service consumes event
   - Detects AI-touched files
   - Checks for existing tests
   - Generates tests if missing
   ↓
8. ReadyLayer posts PR comments via GitHub API
   POST /repos/{owner}/{repo}/pulls/{pr_number}/comments
   ↓
9. ReadyLayer updates status check
   POST /repos/{owner}/{repo}/statuses/{sha}
   {
     "state": "success",
     "description": "Review completed, 3 issues found"
   }
```

**Failure Modes:**
- **Webhook validation fails:** Return 401, log error, don't process
- **GitHub API rate limit:** Queue event, retry with exponential backoff
- **Review analysis fails:** Post error comment, don't block PR
- **Test generation fails:** Post warning comment, don't block PR

---

### Flow 2: PR Updated → Re-review

```
1. Developer pushes new commits to PR
   ↓
2. GitHub sends webhook: pull_request.synchronize
   POST /webhooks/github
   {
     "action": "synchronize",
     "pull_request": { ... }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: pr.updated
   ↓
4. ReadyLayer publishes event to event bus
   ↓
5. Review Guard Service consumes event
   - Fetches updated diff
   - Re-analyzes new changes
   - Updates PR comments (remove stale, add new)
   ↓
6. Test Engine Service consumes event
   - Checks new files for tests
   - Generates tests if needed
   ↓
7. ReadyLayer updates PR comments and status check
```

**Failure Modes:**
- **Same as Flow 1**
- **Stale comments:** Delete old comments before posting new ones

---

### Flow 3: CI Completed → Coverage Check

```
1. GitHub Actions completes
   ↓
2. GitHub sends webhook: check_run.completed
   POST /webhooks/github
   {
     "action": "completed",
     "check_run": {
       "name": "Tests",
       "conclusion": "success",
       "output": { ... }
     }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: ci.completed
   ↓
4. ReadyLayer publishes event to event bus
   ↓
5. Test Engine Service consumes event
   - Parses test results from CI output
   - Calculates coverage
   - Compares to threshold
   ↓
6. ReadyLayer updates status check
   POST /repos/{owner}/{repo}/statuses/{sha}
   {
     "state": "failure", // if coverage below threshold
     "description": "Coverage 75% (threshold: 80%)"
   }
```

**Failure Modes:**
- **CI output parsing fails:** Log error, don't fail status check
- **Coverage calculation fails:** Post warning comment, don't block PR

---

### Flow 4: Merge Completed → Doc Sync

```
1. PR merged to main
   ↓
2. GitHub sends webhook: pull_request.closed
   POST /webhooks/github
   {
     "action": "closed",
     "pull_request": {
       "merged": true,
       "merge_commit_sha": "abc123"
     }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: merge.completed
   ↓
4. ReadyLayer publishes event to event bus
   ↓
5. Doc Sync Service consumes event
   - Fetches merged code
   - Parses for API endpoints
   - Generates OpenAPI spec
   - Updates documentation
   ↓
6. ReadyLayer commits docs to repo
   POST /repos/{owner}/{repo}/contents/{path}
   {
     "message": "docs: update API spec",
     "content": "...",
     "branch": "main"
   }
   OR creates PR for doc updates (if configured)
```

**Failure Modes:**
- **Doc generation fails:** Log error, alert ops team
- **Commit fails:** Retry with exponential backoff, max 3 retries
- **Merge conflict:** Create PR for manual resolution

---

## Webhook Configuration

### Webhook Events Subscribed
- `pull_request` (opened, synchronize, closed)
- `check_run` (completed)
- `push` (for merge detection, optional)

### Webhook Endpoint
```
POST https://api.readylayer.com/webhooks/github
```

### Webhook Security
- **HMAC Signature:** GitHub signs webhooks with secret
- **Validation:** ReadyLayer validates signature on every request
- **Replay Protection:** Event IDs, timestamp validation

### Webhook Payload Example
```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "id": 123456,
    "number": 42,
    "title": "Add user authentication",
    "body": "AI-generated code",
    "state": "open",
    "merged": false,
    "head": {
      "ref": "feature/auth",
      "sha": "abc123def456"
    },
    "base": {
      "ref": "main",
      "sha": "xyz789ghi012"
    }
  },
  "repository": {
    "id": 789012,
    "name": "myapp",
    "full_name": "acme/myapp",
    "private": true,
    "owner": {
      "login": "acme",
      "type": "Organization"
    }
  }
}
```

---

## API Integration

### GitHub REST API Usage

#### Get PR Diff
```typescript
GET /repos/{owner}/{repo}/pulls/{pr_number}
Headers: {
  "Accept": "application/vnd.github.v3.diff"
}
```

#### Post PR Comment
```typescript
POST /repos/{owner}/{repo}/pulls/{pr_number}/comments
Body: {
  "body": "Security issue: potential SQL injection",
  "path": "src/auth.ts",
  "line": 42,
  "side": "RIGHT"
}
```

#### Update Status Check
```typescript
POST /repos/{owner}/{repo}/statuses/{sha}
Body: {
  "state": "success", // success, failure, pending, error
  "target_url": "https://readylayer.com/reviews/{review_id}",
  "description": "Review completed, 3 issues found",
  "context": "readylayer/review"
}
```

#### Get File Contents
```typescript
GET /repos/{owner}/{repo}/contents/{path}
Query: {
  "ref": "main" // branch or commit SHA
}
```

#### Create File (for doc updates)
```typescript
PUT /repos/{owner}/{repo}/contents/{path}
Body: {
  "message": "docs: update API spec",
  "content": "base64_encoded_content",
  "branch": "main"
}
```

### Rate Limiting
- **Authenticated:** 5,000 requests/hour
- **Strategy:** Token rotation, request queuing, exponential backoff
- **Monitoring:** Track rate limit headers, alert at 80% usage

---

## Failure Modes and Retries

### Transient Failures (Retry)
- **GitHub API rate limit (429):** Retry with exponential backoff, max 3 retries
- **Network errors (timeout, connection refused):** Retry with exponential backoff, max 3 retries
- **GitHub API errors (500, 502, 503):** Retry with exponential backoff, max 3 retries

### Permanent Failures (No Retry)
- **Authentication errors (401, 403):** Alert user, don't retry
- **Not found (404):** Log error, don't retry
- **Validation errors (400):** Log error, don't retry

### Partial Failures (Graceful Degradation)
- **Review analysis fails:** Post error comment, don't block PR
- **Test generation fails:** Post warning comment, don't block PR
- **Doc sync fails:** Log error, alert ops team, don't block merge

### Retry Strategy
```typescript
{
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2, // exponential
  retryableStatusCodes: [429, 500, 502, 503, 504]
}
```

---

## Installation Flow

### GitHub App Installation

1. **User clicks "Install ReadyLayer"** (GitHub Marketplace or ReadyLayer dashboard)
2. **GitHub OAuth flow:**
   - Redirect to GitHub: `https://github.com/apps/readylayer/installations/new`
   - User selects org/repos
   - User grants permissions
   - GitHub redirects to callback: `https://readylayer.com/auth/github/callback?code=...`
3. **ReadyLayer exchanges code for token:**
   ```
   POST https://api.readylayer.com/auth/github/token
   Body: { code: "..." }
   ```
4. **ReadyLayer stores installation:**
   - Installation ID
   - Access token (encrypted)
   - Selected repos
   - Permissions granted
5. **ReadyLayer configures webhooks:**
   - GitHub automatically sends webhooks to ReadyLayer endpoint
6. **ReadyLayer sends welcome email** with next steps

### Installation Verification
- **Check installation:** `GET /app/installations/{installation_id}`
- **Verify webhooks:** Check webhook delivery logs in GitHub
- **Test integration:** Create test PR, verify ReadyLayer responds

---

## Multi-Repository Support

### Org-Level Installation
- **Single installation** covers all repos in org
- **Repo-level config:** Each repo can have different rules/thresholds
- **Bulk operations:** Apply configs to multiple repos

### Repo-Level Installation
- **Per-repo installation** for granular control
- **Independent config:** Each repo configured separately
- **Isolated events:** Events scoped to specific repo

---

## Security Considerations

### Token Storage
- **Encryption:** AES-256 encryption at rest
- **Rotation:** Tokens refreshed automatically (GitHub App tokens don't expire, but we rotate on suspicion)
- **Access:** Tokens only decrypted in-memory, never logged

### Webhook Security
- **HMAC validation:** Every webhook validated
- **Replay protection:** Event IDs, timestamp validation
- **Rate limiting:** Per-installation rate limits

### Least Privilege
- **Minimum scopes:** Request only what's needed
- **Repo-level access:** Only access selected repos
- **Audit logging:** All API calls logged

---

## Monitoring and Observability

### Metrics
- **Webhook delivery rate:** Events received per minute
- **API call rate:** GitHub API calls per minute
- **Error rate:** Failed API calls, webhook validation failures
- **Latency:** Time to process webhook, API call duration

### Alerts
- **High error rate:** >5% API call failures
- **Rate limit approaching:** >80% of rate limit used
- **Webhook validation failures:** Any HMAC validation failure
- **Token expiration:** Token refresh failures

### Logging
- **All API calls:** Logged with correlation ID
- **Webhook events:** Logged with event ID
- **Errors:** Detailed error logs with stack traces
- **Secrets:** Never logged (masked in logs)

---

## Best Practices

1. **Idempotency:** All operations idempotent (safe to retry)
2. **Rate limiting:** Respect GitHub rate limits, queue requests
3. **Error handling:** Graceful degradation, don't block PRs on failures
4. **Monitoring:** Track all API calls, alert on anomalies
5. **Security:** Validate webhooks, encrypt tokens, audit logs
