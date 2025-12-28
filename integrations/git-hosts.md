# ReadyLayer — Git Host Integrations (GitLab, Bitbucket, Azure DevOps)

## Overview

ReadyLayer supports multiple git hosts beyond GitHub. Each host has similar functionality but different APIs and webhook formats. This document covers GitLab, Bitbucket, and Azure DevOps integrations.

---

## GitLab Integration

### Core Use Cases
- PR review automation (Merge Requests)
- Test generation for AI-touched files
- Documentation sync on merge
- CI status checks (GitLab CI)

### Required Scopes / Permissions

#### GitLab OAuth Scopes
- `api` (full API access)
- `read_repository` (read repo contents)
- `write_repository` (write comments, status)

**Recommended (Least Privilege):**
```
read_repository
write_repository
```

### Event Flows

#### Flow 1: Merge Request Opened → Review + Test Generation
```
1. Developer opens Merge Request
   ↓
2. GitLab sends webhook: merge_request
   POST /webhooks/gitlab
   {
     "object_kind": "merge_request",
     "event_type": "merge_request",
     "object_attributes": {
       "action": "open",
       "iid": 42,
       "title": "Add user authentication",
       "source_branch": "feature/auth",
       "target_branch": "main"
     }
   }
   ↓
3. ReadyLayer validates webhook (token-based)
   ↓
4. ReadyLayer normalizes to internal event
   Event: pr.opened
   ↓
5. ReadyLayer publishes to event bus
   ↓
6. Review Guard + Test Engine process event
   ↓
7. ReadyLayer posts MR comments via GitLab API
   POST /projects/{project_id}/merge_requests/{mr_iid}/notes
   ↓
8. ReadyLayer updates pipeline status
   POST /projects/{project_id}/statuses/{sha}
```

**Failure Modes:**
- **Webhook validation fails:** Return 401, log error
- **GitLab API rate limit:** Queue event, retry with exponential backoff
- **Review/test generation fails:** Post error comment, don't block MR

#### Flow 2: Pipeline Completed → Coverage Check
```
1. GitLab CI pipeline completes
   ↓
2. GitLab sends webhook: pipeline
   POST /webhooks/gitlab
   {
     "object_kind": "pipeline",
     "object_attributes": {
       "status": "success",
       "id": 123456
     }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: ci.completed
   ↓
4. ReadyLayer publishes to event bus
   ↓
5. Test Engine Service consumes event
   - Fetches pipeline job logs
   - Parses test results
   - Calculates coverage
   ↓
6. ReadyLayer updates pipeline status
   POST /projects/{project_id}/statuses/{sha}
```

### API Integration

#### Get MR Diff
```typescript
GET /projects/{project_id}/merge_requests/{mr_iid}
Headers: {
  "PRIVATE-TOKEN": "{token}"
}
```

#### Post MR Comment
```typescript
POST /projects/{project_id}/merge_requests/{mr_iid}/notes
Body: {
  "body": "Security issue: potential SQL injection",
  "position": {
    "base_sha": "abc123",
    "start_sha": "def456",
    "head_sha": "ghi789",
    "old_path": "src/auth.ts",
    "new_path": "src/auth.ts",
    "position_type": "text",
    "new_line": 42
  }
}
```

#### Update Pipeline Status
```typescript
POST /projects/{project_id}/statuses/{sha}
Body: {
  "state": "success", // success, failed, pending, canceled
  "ref": "main",
  "name": "readylayer/review",
  "target_url": "https://readylayer.com/reviews/{review_id}",
  "description": "Review completed, 3 issues found"
}
```

### Rate Limiting
- **Authenticated:** 2,000 requests/hour (GitLab.com)
- **Self-hosted:** Configurable
- **Strategy:** Token rotation, request queuing, exponential backoff

### Webhook Configuration
- **Events:** `merge_request`, `pipeline`, `push`
- **Endpoint:** `POST https://api.readylayer.com/webhooks/gitlab`
- **Security:** Token-based validation (webhook secret)

---

## Bitbucket Integration

### Core Use Cases
- PR review automation (Pull Requests)
- Test generation for AI-touched files
- Documentation sync on merge
- CI status checks (Bitbucket Pipelines)

### Required Scopes / Permissions

#### Bitbucket OAuth Scopes
- `repository` (read/write repo)
- `pullrequest` (read/write PRs)

**Recommended (Least Privilege):**
```
repository
pullrequest
```

### Event Flows

#### Flow 1: Pull Request Opened → Review + Test Generation
```
1. Developer opens Pull Request
   ↓
2. Bitbucket sends webhook: pullrequest:created
   POST /webhooks/bitbucket
   {
     "eventKey": "pr:opened",
     "pullRequest": {
       "id": 42,
       "title": "Add user authentication",
       "fromRef": {
         "displayId": "feature/auth"
       },
       "toRef": {
         "displayId": "main"
       }
     },
     "repository": {
       "slug": "myapp",
       "project": {
         "key": "ACME"
       }
     }
   }
   ↓
3. ReadyLayer validates webhook (HMAC signature)
   ↓
4. ReadyLayer normalizes to internal event
   Event: pr.opened
   ↓
5. ReadyLayer publishes to event bus
   ↓
6. Review Guard + Test Engine process event
   ↓
7. ReadyLayer posts PR comments via Bitbucket API
   POST /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments
   ↓
8. ReadyLayer updates build status
   POST /2.0/repositories/{workspace}/{repo_slug}/commit/{sha}/statuses/build
```

**Failure Modes:**
- **Webhook validation fails:** Return 401, log error
- **Bitbucket API rate limit:** Queue event, retry with exponential backoff
- **Review/test generation fails:** Post error comment, don't block PR

#### Flow 2: Build Completed → Coverage Check
```
1. Bitbucket Pipelines build completes
   ↓
2. Bitbucket sends webhook: build:status
   POST /webhooks/bitbucket
   {
     "eventKey": "build:status",
     "buildStatus": {
       "state": "SUCCESSFUL",
       "key": "CI",
       "url": "..."
     }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: ci.completed
   ↓
4. ReadyLayer publishes to event bus
   ↓
5. Test Engine Service consumes event
   - Fetches build logs
   - Parses test results
   - Calculates coverage
   ↓
6. ReadyLayer updates build status
   POST /2.0/repositories/{workspace}/{repo_slug}/commit/{sha}/statuses/build
```

### API Integration

#### Get PR Diff
```typescript
GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff
Headers: {
  "Authorization": "Bearer {token}"
}
```

#### Post PR Comment
```typescript
POST /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments
Body: {
  "content": {
    "raw": "Security issue: potential SQL injection"
  },
  "inline": {
    "path": "src/auth.ts",
    "to": 42
  }
}
```

#### Update Build Status
```typescript
POST /2.0/repositories/{workspace}/{repo_slug}/commit/{sha}/statuses/build
Body: {
  "state": "SUCCESSFUL", // SUCCESSFUL, FAILED, INPROGRESS, STOPPED
  "key": "readylayer/review",
  "name": "ReadyLayer Review",
  "url": "https://readylayer.com/reviews/{review_id}",
  "description": "Review completed, 3 issues found"
}
```

### Rate Limiting
- **Authenticated:** 1,000 requests/hour (Bitbucket Cloud)
- **Self-hosted:** Configurable
- **Strategy:** Token rotation, request queuing, exponential backoff

### Webhook Configuration
- **Events:** `pullrequest:created`, `pullrequest:updated`, `pullrequest:fulfilled`, `build:status`
- **Endpoint:** `POST https://api.readylayer.com/webhooks/bitbucket`
- **Security:** HMAC-SHA256 signature validation

---

## Azure DevOps Integration

### Core Use Cases
- PR review automation (Pull Requests)
- Test generation for AI-touched files
- Documentation sync on merge
- CI status checks (Azure Pipelines)

### Required Scopes / Permissions

#### Azure DevOps OAuth Scopes
- `vso.code` (read/write code)
- `vso.build` (read build status)

**Recommended (Least Privilege):**
```
vso.code
vso.build_read
```

### Event Flows

#### Flow 1: Pull Request Opened → Review + Test Generation
```
1. Developer opens Pull Request
   ↓
2. Azure DevOps sends webhook: git.pullrequest.created
   POST /webhooks/azure-devops
   {
     "eventType": "git.pullrequest.created",
     "resource": {
       "pullRequestId": 42,
       "title": "Add user authentication",
       "sourceRefName": "refs/heads/feature/auth",
       "targetRefName": "refs/heads/main"
     },
     "resourceContainers": {
       "collection": {
         "id": "org-id"
       },
       "project": {
         "id": "project-id"
       }
     }
   }
   ↓
3. ReadyLayer validates webhook (basic auth or secret)
   ↓
4. ReadyLayer normalizes to internal event
   Event: pr.opened
   ↓
5. ReadyLayer publishes to event bus
   ↓
6. Review Guard + Test Engine process event
   ↓
7. ReadyLayer posts PR comments via Azure DevOps API
   POST /{org}/{project}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}/threads
   ↓
8. ReadyLayer updates build status
   POST /{org}/{project}/_apis/build/status/{build_id}
```

**Failure Modes:**
- **Webhook validation fails:** Return 401, log error
- **Azure DevOps API rate limit:** Queue event, retry with exponential backoff
- **Review/test generation fails:** Post error comment, don't block PR

#### Flow 2: Build Completed → Coverage Check
```
1. Azure Pipelines build completes
   ↓
2. Azure DevOps sends webhook: build.complete
   POST /webhooks/azure-devops
   {
     "eventType": "build.complete",
     "resource": {
       "status": "completed",
       "result": "succeeded",
       "id": 123456
     }
   }
   ↓
3. ReadyLayer validates and normalizes event
   Event: ci.completed
   ↓
4. ReadyLayer publishes to event bus
   ↓
5. Test Engine Service consumes event
   - Fetches build logs
   - Parses test results
   - Calculates coverage
   ↓
6. ReadyLayer updates build status
   POST /{org}/{project}/_apis/build/status/{build_id}
```

### API Integration

#### Get PR Diff
```typescript
GET /{org}/{project}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}
Headers: {
  "Authorization": "Basic {base64_token}"
}
```

#### Post PR Comment
```typescript
POST /{org}/{project}/_apis/git/repositories/{repo_id}/pullRequests/{pr_id}/threads
Body: {
  "comments": [
    {
      "parentCommentId": 0,
      "content": "Security issue: potential SQL injection",
      "commentType": 1 // Text
    }
  ],
  "status": 1, // Active
  "threadContext": {
    "filePath": "src/auth.ts",
    "leftFileStart": {
      "line": 42,
      "offset": 1
    },
    "rightFileStart": {
      "line": 42,
      "offset": 1
    }
  }
}
```

#### Update Build Status
```typescript
POST /{org}/{project}/_apis/build/status/{build_id}
Body: {
  "state": "succeeded", // succeeded, failed, inProgress, canceled
  "description": "Review completed, 3 issues found",
  "context": {
    "name": "readylayer/review",
    "genre": "continuous-integration"
  },
  "targetUrl": "https://readylayer.com/reviews/{review_id}"
}
```

### Rate Limiting
- **Authenticated:** 30,000 requests/hour (Azure DevOps)
- **Strategy:** Token rotation, request queuing, exponential backoff

### Webhook Configuration
- **Events:** `git.pullrequest.created`, `git.pullrequest.updated`, `git.pullrequest.merged`, `build.complete`
- **Endpoint:** `POST https://api.readylayer.com/webhooks/azure-devops`
- **Security:** Basic auth or webhook secret

---

## Common Patterns Across Git Hosts

### Event Normalization
All git host events are normalized to internal events:
- `pr.opened` (GitHub PR, GitLab MR, Bitbucket PR, Azure DevOps PR)
- `pr.updated` (synchronize, update events)
- `pr.closed` (closed, merged events)
- `ci.completed` (check_run, pipeline, build status)
- `merge.completed` (merged, fulfilled events)

### API Abstraction Layer
ReadyLayer uses an abstraction layer to handle differences:
```typescript
interface GitHostAdapter {
  getPRDiff(repo: Repo, prId: number): Promise<Diff>;
  postComment(repo: Repo, prId: number, comment: Comment): Promise<void>;
  updateStatus(repo: Repo, sha: string, status: Status): Promise<void>;
  getFileContents(repo: Repo, path: string, ref: string): Promise<string>;
}
```

### Failure Handling
- **Transient failures:** Retry with exponential backoff (max 3 retries)
- **Permanent failures:** Log error, alert user
- **Partial failures:** Graceful degradation, don't block PRs

### Rate Limiting
- **Per-host limits:** Respect each host's rate limits
- **Token rotation:** Rotate tokens to avoid limits
- **Request queuing:** Queue requests when approaching limits

---

## Installation Flows

### GitLab Installation
1. User clicks "Install ReadyLayer" (GitLab Marketplace or ReadyLayer dashboard)
2. GitLab OAuth flow (similar to GitHub)
3. ReadyLayer stores installation and configures webhooks
4. ReadyLayer sends welcome email

### Bitbucket Installation
1. User clicks "Install ReadyLayer" (Bitbucket Marketplace or ReadyLayer dashboard)
2. Bitbucket OAuth flow (similar to GitHub)
3. ReadyLayer stores installation and configures webhooks
4. ReadyLayer sends welcome email

### Azure DevOps Installation
1. User clicks "Install ReadyLayer" (Azure Marketplace or ReadyLayer dashboard)
2. Azure DevOps OAuth flow (similar to GitHub)
3. ReadyLayer stores installation and configures webhooks
4. ReadyLayer sends welcome email

---

## Security Considerations

### Token Storage
- **Encryption:** AES-256 encryption at rest
- **Rotation:** Tokens refreshed automatically
- **Access:** Tokens only decrypted in-memory, never logged

### Webhook Security
- **GitLab:** Token-based validation
- **Bitbucket:** HMAC-SHA256 signature validation
- **Azure DevOps:** Basic auth or webhook secret

### Least Privilege
- **Minimum scopes:** Request only what's needed
- **Repo-level access:** Only access selected repos
- **Audit logging:** All API calls logged

---

## Monitoring and Observability

### Metrics
- **Webhook delivery rate:** Events received per minute (per host)
- **API call rate:** API calls per minute (per host)
- **Error rate:** Failed API calls, webhook validation failures
- **Latency:** Time to process webhook, API call duration

### Alerts
- **High error rate:** >5% API call failures (per host)
- **Rate limit approaching:** >80% of rate limit used (per host)
- **Webhook validation failures:** Any validation failure
- **Token expiration:** Token refresh failures

### Logging
- **All API calls:** Logged with correlation ID, host identifier
- **Webhook events:** Logged with event ID, host identifier
- **Errors:** Detailed error logs with stack traces
- **Secrets:** Never logged (masked in logs)

---

## Best Practices

1. **Idempotency:** All operations idempotent (safe to retry)
2. **Rate limiting:** Respect each host's rate limits
3. **Error handling:** Graceful degradation, don't block PRs on failures
4. **Monitoring:** Track all API calls, alert on anomalies
5. **Security:** Validate webhooks, encrypt tokens, audit logs
6. **Abstraction:** Use adapter pattern to handle host differences
