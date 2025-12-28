# ReadyLayer — Events and Security Model

## Event Model

ReadyLayer is event-driven. Events flow from external systems (GitHub, GitLab) through integration adapters, are normalized to internal events, and trigger service actions.

---

## Event Types

### 1. PR Opened (`pr.opened`)

**Trigger:** New pull request created

**Source:** GitHub/GitLab/Bitbucket webhook

**Payload:**
```typescript
{
  event: "pr.opened",
  timestamp: "2024-01-15T10:30:00Z",
  repo: {
    id: "repo_123",
    name: "myapp",
    owner: "acme",
    provider: "github"
  },
  pr: {
    id: "pr_456",
    number: 42,
    title: "Add user authentication",
    author: "developer@acme.com",
    base: "main",
    head: "feature/auth",
    diff_url: "https://github.com/acme/myapp/pull/42.diff"
  },
  files: [
    {
      path: "src/auth.ts",
      status: "added",
      additions: 150,
      deletions: 0
    }
  ],
  metadata: {
    ai_generated: true, // Detected via commit message, author, or analysis
    ai_tool: "copilot" // Optional: copilot, cursor, claude
  }
}
```

**Consumers:**
- **Review Guard Service:** Start review analysis
- **Test Engine Service:** Check for AI-touched files, generate tests if needed

**Actions:**
1. Review Guard analyzes diff for risks
2. Test Engine detects AI-touched files
3. If tests missing, generate tests
4. Post PR comments with findings

---

### 2. PR Updated (`pr.updated`)

**Trigger:** Pull request updated (new commits, force push, etc.)

**Source:** GitHub/GitLab/Bitbucket webhook

**Payload:**
```typescript
{
  event: "pr.updated",
  timestamp: "2024-01-15T11:00:00Z",
  repo: {
    id: "repo_123",
    name: "myapp",
    owner: "acme",
    provider: "github"
  },
  pr: {
    id: "pr_456",
    number: 42,
    base: "main",
    head: "feature/auth",
    diff_url: "https://github.com/acme/myapp/pull/42.diff"
  },
  changes: {
    new_commits: 2,
    files_changed: ["src/auth.ts", "src/utils.ts"]
  }
}
```

**Consumers:**
- **Review Guard Service:** Re-analyze updated diff
- **Test Engine Service:** Re-check test coverage for new changes

**Actions:**
1. Review Guard re-analyzes new diff
2. Test Engine checks if new files need tests
3. Update PR comments (remove stale, add new)

---

### 3. CI Completed (`ci.completed`)

**Trigger:** CI pipeline completes (success or failure)

**Source:** GitHub Actions / GitLab CI webhook (or polling)

**Payload:**
```typescript
{
  event: "ci.completed",
  timestamp: "2024-01-15T11:30:00Z",
  repo: {
    id: "repo_123",
    name: "myapp",
    owner: "acme",
    provider: "github"
  },
  pr: {
    id: "pr_456",
    number: 42
  },
  ci: {
    pipeline_id: "pipeline_789",
    status: "success", // success, failure, cancelled
    workflow: "test.yml",
    duration_seconds: 120,
    test_results: {
      total: 50,
      passed: 48,
      failed: 2,
      coverage: 0.85
    }
  }
}
```

**Consumers:**
- **Test Engine Service:** Validate coverage, enforce thresholds

**Actions:**
1. Test Engine checks coverage against threshold
2. If below threshold, fail CI status check
3. Post PR comment with coverage report

---

### 4. Merge Completed (`merge.completed`)

**Trigger:** Pull request merged to main/master

**Source:** GitHub/GitLab/Bitbucket webhook

**Payload:**
```typescript
{
  event: "merge.completed",
  timestamp: "2024-01-15T12:00:00Z",
  repo: {
    id: "repo_123",
    name: "myapp",
    owner: "acme",
    provider: "github"
  },
  pr: {
    id: "pr_456",
    number: 42,
    merged_by: "reviewer@acme.com",
    merge_commit: "abc123def456"
  },
  files: [
    {
      path: "src/auth.ts",
      status: "added"
    }
  ]
}
```

**Consumers:**
- **Doc Sync Service:** Generate/update documentation

**Actions:**
1. Doc Sync parses merged code for API changes
2. Generates/updates OpenAPI spec
3. Updates documentation
4. Publishes artifacts (if configured)
5. Checks for doc drift

---

## Event Flow Sequence

### Sequence 1: PR Review Flow
```
GitHub Webhook (PR Opened)
  → GitHub Adapter (validate, normalize)
  → Event Bus (publish pr.opened)
  → Review Guard Service (consume event)
    → Code Parser Service (parse diff)
    → LLM Service (analyze code)
    → Static Analysis Service (security scan)
  → Review Guard Service (aggregate results)
  → GitHub Adapter (post PR comments)
```

### Sequence 2: Test Generation Flow
```
GitHub Webhook (PR Opened)
  → GitHub Adapter (validate, normalize)
  → Event Bus (publish pr.opened)
  → Test Engine Service (consume event)
    → Detect AI-touched files
    → Check existing tests
    → If missing, LLM Service (generate tests)
    → Validate test syntax
    → Place tests in repo structure
  → GitHub Adapter (post PR comment, update CI status)
```

### Sequence 3: Doc Sync Flow
```
GitHub Webhook (Merge Completed)
  → GitHub Adapter (validate, normalize)
  → Event Bus (publish merge.completed)
  → Doc Sync Service (consume event)
    → Code Parser Service (extract API endpoints)
    → LLM Service (generate descriptions)
    → Generate OpenAPI spec
    → Update documentation
    → Publish artifacts
  → GitHub Adapter (commit docs, create release)
```

---

## Event Processing Guarantees

### At-Least-Once Delivery
- Events are retried on failure (exponential backoff)
- Idempotent handlers (same event processed multiple times = same result)
- Event deduplication by event ID

### Ordering
- Events per PR are processed in order (per-repo queue)
- Events per repo are processed sequentially (prevent race conditions)

### Failure Handling
- **Transient failures:** Retry with exponential backoff (max 3 retries)
- **Permanent failures:** Dead letter queue, alert ops team
- **Partial failures:** Graceful degradation (e.g., review fails, but test generation succeeds)

---

## Security Model

### Authentication

#### OAuth 2.0 (Git Hosts)
**Flow:**
1. User installs ReadyLayer app (GitHub, GitLab, Bitbucket)
2. OAuth callback with authorization code
3. Exchange code for access token
4. Store token encrypted in database
5. Use token for API calls (refresh as needed)

**Scopes (Least Privilege):**
- **GitHub:** `repo`, `pull_requests`, `contents`, `checks`
- **GitLab:** `api`, `read_repository`, `write_repository`
- **Bitbucket:** `repository`, `pullrequest`

**Token Storage:**
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- Stored in PostgreSQL (encrypted column)
- Rotated every 90 days (or on revocation)

#### JWT (Internal Service Auth)
**Flow:**
1. Service authenticates with API Service (service key)
2. API Service issues JWT (short-lived, 15 minutes)
3. Service uses JWT for internal API calls
4. JWT validated on each request

**Claims:**
```typescript
{
  sub: "service:review-guard",
  iss: "readylayer-api",
  exp: 1234567890,
  iat: 1234567800
}
```

#### API Keys (Enterprise)
**Flow:**
1. Enterprise customer generates API key (dashboard)
2. API key used for programmatic access
3. Rate limited per key
4. Revocable, auditable

**Storage:**
- Hashed (bcrypt) in database
- Never returned in API responses
- Rotated every 90 days (or on demand)

---

### Authorization

#### Role-Based Access Control (RBAC)

**Roles:**
- **Owner:** Full access (org/repo config, billing, users)
- **Admin:** Config access (org/repo config, rules)
- **Member:** Read access (view results, configs)
- **Viewer:** Read-only (view results only)

**Resource Hierarchy:**
```
Organization
  └─ Repository
      └─ Configuration
      └─ Rules
      └─ Results
```

**Permissions:**
- **Owner:** All permissions
- **Admin:** Read/Write configs, rules; Read results
- **Member:** Read configs, rules, results
- **Viewer:** Read results only

#### Scope-Based Authorization (OAuth)
- **Repo-level:** Access to specific repos only
- **Org-level:** Access to all repos in org
- **Least privilege:** Request minimum scopes needed

---

### Secret Management

#### Secrets Stored
- **OAuth tokens:** Encrypted in database
- **API keys:** Hashed in database
- **LLM API keys:** Encrypted in database (per-org)
- **Webhook secrets:** Encrypted in database

#### Secret Rotation
- **OAuth tokens:** Auto-refresh on expiry, manual revocation
- **API keys:** 90-day rotation (configurable)
- **LLM API keys:** Manual rotation (customer-managed)
- **Webhook secrets:** Generated on install, rotatable

#### Secret Access
- **Application:** Secrets decrypted at runtime (in-memory only)
- **Database:** Encrypted columns (application-level encryption)
- **Logs:** Secrets never logged (masked in logs)

---

### Data Security

#### Encryption
- **At Rest:** AES-256 encryption (database, backups)
- **In Transit:** TLS 1.3 (all API calls, webhooks)
- **Application-Level:** Encrypt sensitive fields before DB write

#### Data Retention
- **Code:** Ephemeral (not stored by default, TTL 1 hour if cached)
- **Configs:** Retained indefinitely (until deletion)
- **Audit Logs:** 90 days (configurable, enterprise: 1 year)
- **Results:** 30 days (configurable, enterprise: 1 year)
- **Cost Data:** 1 year (for billing, analytics)

#### Data Residency
- **Default:** US region (AWS us-east-1)
- **Enterprise:** Configurable (EU, Asia-Pacific)
- **Compliance:** SOC2, GDPR-ready

#### No Code Retention (Default)
- **Principle:** Code is ephemeral, not stored
- **Exception:** Cached for 1 hour (performance), then deleted
- **Enterprise:** Optional code retention (for audit, configurable)

---

### Audit Logging

#### Logged Actions
- **Authentication:** Login, logout, token refresh
- **Authorization:** Permission checks, role changes
- **Configuration:** Config changes, rule updates
- **Operations:** PR reviews, test generations, doc updates
- **Admin:** User management, org management, billing

#### Log Format
```typescript
{
  timestamp: "2024-01-15T10:30:00Z",
  user_id: "user_123",
  org_id: "org_456",
  repo_id: "repo_789",
  action: "pr.review.completed",
  resource: "pr_42",
  result: "success",
  metadata: {
    rules_evaluated: 15,
    issues_found: 3,
    duration_ms: 2500
  },
  ip_address: "192.168.1.1",
  user_agent: "ReadyLayer/1.0"
}
```

#### Log Storage
- **Database:** PostgreSQL (audit_logs table)
- **Retention:** 90 days (default), 1 year (enterprise)
- **Query:** Indexed by user_id, org_id, timestamp, action
- **Export:** CSV/JSON export for compliance

#### SOC2 Compliance
- **Audit Trail:** All actions logged, immutable
- **Access Control:** RBAC, least privilege
- **Data Protection:** Encryption, retention policies
- **Monitoring:** Alert on suspicious activity

---

### Webhook Security

#### Validation
- **GitHub:** HMAC-SHA256 signature validation
- **GitLab:** Token-based validation
- **Bitbucket:** HMAC-SHA256 signature validation

#### Replay Protection
- **Idempotency:** Event IDs, deduplication
- **Timestamp:** Reject events >5 minutes old
- **Nonce:** One-time use tokens (future)

#### Rate Limiting
- **Per-repo:** 100 events/minute
- **Per-org:** 1000 events/minute
- **Global:** 10,000 events/minute

---

### API Security

#### Rate Limiting
- **Per-user:** 1000 requests/hour
- **Per-org:** 10,000 requests/hour
- **Per-IP:** 100 requests/minute (DDoS protection)

#### Input Validation
- **Schema validation:** JSON schema, OpenAPI spec
- **Sanitization:** SQL injection, XSS prevention
- **Size limits:** Max payload 10MB, max file 100MB

#### CORS
- **Allowed origins:** Configured per org (dashboard)
- **Default:** None (no CORS by default)
- **Credentials:** Supported (with origin whitelist)

---

### Vulnerability Management

#### Dependency Scanning
- **Frequency:** Weekly (automated)
- **Action:** Alert on critical vulnerabilities
- **Remediation:** Patch within 7 days (SLA)

#### Penetration Testing
- **Frequency:** Quarterly (external firm)
- **Scope:** API, webhooks, authentication
- **Remediation:** 30-day SLA for critical findings

#### Bug Bounty
- **Program:** HackerOne (future)
- **Scope:** API, webhooks, authentication
- **Rewards:** $100-$10,000 (severity-based)

---

## Security Principles (Non-Negotiable)

1. **Least Privilege:** Minimum scopes, minimum permissions
2. **Defense in Depth:** Multiple layers of security
3. **Encryption Everywhere:** At rest, in transit, in logs
4. **No Code Retention:** Code is ephemeral (by default)
5. **Audit Everything:** All actions logged, immutable
6. **Fail Secure:** Deny by default, explicit allow
7. **Regular Updates:** Dependencies, security patches
8. **Compliance Ready:** SOC2, GDPR, enterprise-ready
