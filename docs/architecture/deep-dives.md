# ReadyLayer Architecture Deep-Dives

Comprehensive technical documentation for ReadyLayer's core systems.

## Table of Contents

1. [Policy Engine](#policy-engine)
2. [Async LLM Processing](#async-llm-processing)
3. [Queue & Worker System](#queue--worker-system)
4. [Webhook Handling](#webhook-handling)
5. [Caching Strategy](#caching-strategy)

---

## Policy Engine

### Overview

The Policy Engine is ReadyLayer's deterministic rule evaluation system. It provides persona-specific policy templates and enables organizations to define custom rules.

**Key Properties:**
- Fully deterministic (same input = same output)
- Thread-safe and stateless
- Supports inheritance (founder rules ⊆ enterprise rules)
- Real-time rule registration and configuration

### Architecture

```
Input Code
    ↓
Parser (JavaScript/TypeScript AST)
    ↓
Rule Evaluation
├── Founder Rules (base set)
├── Enterprise Rules (inherited)
├── Custom Rules (org-specific)
└── Disabled Rules (skipped)
    ↓
Violation Collection
├── Group by severity
├── Add line numbers
└── Calculate confidence
    ↓
Output: Violations[]
```

### Rule System

**Rule Structure:**
```typescript
interface Rule {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  category: 'security'|'quality'|'ai';
  severity: 'critical'|'high'|'medium'|'low';
  enabled: boolean;
  pattern?: RegExp;              // Simple pattern matching
  evaluate?: (code) => Violation[]; // Custom evaluator
}
```

**Rule Categories:**

| Category | Purpose | Founders | Enterprise | Startup |
|----------|---------|----------|-----------|---------|
| Security | Prevent vulnerabilities | ✓ | ✓ | ✓ |
| Quality | Code style, patterns | ✓ | ✓ | ✓ |
| AI | AI-specific checks | ✓ | ✓ | ✓ |
| Compliance | Regulatory requirements | ✗ | ✓ | ✗ |

### Determinism Guarantees

The Policy Engine ensures determinism through:

1. **No Random Elements**: No randomization in rule execution
2. **Consistent Ordering**: Rules evaluated in consistent order
3. **Immutable Input**: Code content treated as immutable
4. **Cached State**: Rule state never changes mid-evaluation
5. **Isolation**: No side effects (no file I/O, network calls, etc.)

**Testing:**
```typescript
const code = 'SELECT * FROM users;';
const result1 = await policyEngine.evaluate(code);
const result2 = await policyEngine.evaluate(code);
expect(result1).toEqual(result2); // Always passes
```

### Performance

- Evaluation time: O(n) where n = file size
- Typical time: <100ms for 1000-line file
- Memory: O(violations) - linear with issue count

**Optimization:** Results are cached per (fileHash, ruleSet) pair.

### Customization

Organizations can create policies by:

1. **Template Selection**: Choose persona (founder, enterprise, etc.)
2. **Rule Override**: Enable/disable specific rules
3. **Severity Remapping**: Change rule severity per org
4. **Rule Addition**: Custom rules via plugins (enterprise)

---

## Async LLM Processing

### Overview

The Async LLM Processing system handles long-running AI analysis operations without blocking HTTP responses. Critical for production reliability.

**Design Goals:**
- Non-blocking HTTP responses (return immediately)
- Reliable job processing (retries, idempotency)
- Cost tracking per organization
- Secret redaction before LLM calls

### Architecture

```
HTTP Request (Review)
    ↓
Static Analysis (synchronous)
├── Policy rules
├── Pattern matching
└── Type checking
    ↓
Enqueue LLM Job
├── Create job with idempotency key
├── Return review_id (status: pending-enrichment)
└── HTTP 202 Accepted
    ↓
Background Queue
    ↓
LLM Processor Worker
├── Fetch job
├── Redact secrets
├── Call LLM API
├── Track cost
├── Store results
└── Mark complete
    ↓
Client polls /reviews/:id
    ↓
Full results available
```

### Job Structure

```typescript
interface LLMJob {
  id: string;
  reviewId: string;
  organizationId: string;
  content: string;      // Redacted code
  model: 'gpt-4' | 'claude';
  temperature: number;
  maxTokens: number;

  // Tracking
  status: 'pending'|'processing'|'completed'|'failed';
  attempts: number;
  maxRetries: number;

  // Results
  result?: string;
  costTokens?: number;
  completedAt?: Date;
  error?: string;
}
```

### Secret Redaction

Before sending code to LLMs, we redact:

1. **API Keys**: `sk-`, `AKIA`, `pk_live_`
2. **Tokens**: JWTs, OAuth tokens, session IDs
3. **Passwords**: `password=`, `pwd`, `secret`
4. **PII**: Email patterns, phone numbers

**Pattern Examples:**
```typescript
const patterns = [
  /sk-[A-Za-z0-9]{20,}/,        // OpenAI keys
  /AKIA[0-9A-Z]{16}/,           // AWS keys
  /(?:password|pwd)\s*=\s*['"](.+?)['"]/i,
];
```

**Redaction Strategy:**
- Replace with `[REDACTED_<TYPE>]`
- Track redaction in logs
- Maintain mapping for post-processing

### Cost Tracking

Costs are tracked per organization and model:

```typescript
async recordLLMCost(
  organizationId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const pricing = PRICING[model];
  const cost =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;

  await costAttributionService.recordLLMCost(
    organizationId,
    model,
    inputTokens,
    outputTokens
  );
}
```

### Retry Strategy

Failed jobs retry with exponential backoff:

```
Attempt 1: immediately
Attempt 2: wait 2 seconds
Attempt 3: wait 4 seconds
Attempt 4: wait 8 seconds (max 3 retries)
After max retries → DLQ
```

### Monitoring

Track LLM processing health via:

- **Queue depth**: Jobs waiting
- **Processing time**: P50, P95, P99 latency
- **Success rate**: % of jobs completed
- **Cost per review**: Average cost per review
- **Token usage**: Input vs output ratio

---

## Queue & Worker System

### Overview

The Queue system ensures reliable job processing with retries, idempotency, and both Redis and database backends.

**Guarantees:**
- At-least-once delivery (with idempotency keys)
- Ordered processing (FIFO within queue)
- Automatic retries with exponential backoff
- Dead Letter Queue (DLQ) for exhausted jobs

### Architecture

```
Job Enqueue
├── Check Redis availability
├── If Redis: LPUSH to list
└── If unavailable: Prisma Job table
    ↓
Job Dequeue
├── Redis: BRPOP (blocking)
└── Fallback: DB polling (1 sec interval)
    ↓
Job Processing
├── Execute handler
├── Track cost/usage
└── Mark result
    ↓
Completion
├── Success: Update job status
└── Failure: Retry or DLQ
```

### Redis vs Database Fallback

**Redis (Primary):**
- Blocking pop (efficient waiting)
- Atomic operations
- Low latency (<5ms)
- In-memory (fast)

**Database (Fallback):**
- Polling every 1 second
- Eventual consistency
- Higher latency (~100ms)
- Durable (survives restarts)

**Configuration:**
```typescript
// Automatically detects Redis
const queue = new QueueService();
// Uses Redis if REDIS_URL set
// Falls back to DB if unavailable
```

### Job Payload

```typescript
interface JobPayload {
  type: string;           // 'llm:enrich', 'webhook:github', etc.
  data: unknown;          // Job-specific data
  idempotencyKey?: string; // Prevent duplicates
  maxRetries?: number;    // Default: 3
  organizationId?: string; // For cost tracking
  userId?: string;        // For audit logs
}
```

### Idempotency

Same `idempotencyKey` returns same job:

```typescript
// Call 1
const jobId1 = await queue.enqueue('reviews', {
  type: 'llm:enrich',
  data: { reviewId: 'r_123' },
  idempotencyKey: 'review-r_123-v1'
});

// Call 2 (same key)
const jobId2 = await queue.enqueue('reviews', {
  type: 'llm:enrich',
  data: { reviewId: 'r_123' },
  idempotencyKey: 'review-r_123-v1'
});

// jobId1 === jobId2 ✓
```

### Dead Letter Queue

Jobs exhausted after max retries go to DLQ:

```
Job fails 4 times (max 3 retries)
    ↓
Moved to DLQ
├── Still queryable via API
├── Can be manually retried
├── Alerted to ops
└── Never auto-reprocessed
```

**DLQ Monitoring:**
```typescript
const dlqJobs = await queue.getDLQJobs();
dlqJobs.forEach(job => {
  logger.error('Job in DLQ', { jobId: job.id, error: job.error });
  alertOps(`Job ${job.id} failed after all retries`);
});
```

### Performance Characteristics

| Operation | Redis | Database |
|-----------|-------|----------|
| Enqueue | <5ms | 10-20ms |
| Dequeue | <5ms | 1000ms (polling) |
| Get Status | <5ms | 20-30ms |
| Throughput | 10K/sec | 100/sec |

---

## Webhook Handling

### Overview

Webhook processing is event-driven, async, and resilient. Supports GitHub, GitLab, and Bitbucket.

**Key Features:**
- Signature validation (HMAC)
- Idempotent processing (via delivery ID)
- Automatic retries (GitHub/GitLab backends)
- Real-time PR status updates

### Flow

```
Incoming Webhook (GitHub/GitLab/Bitbucket)
    ↓
Signature Validation
├── Extract signature
├── Compute HMAC
└── Compare (constant-time)
    ↓
Event Type Detection
├── pull_request/merge_request
├── push
└── Issue comment
    ↓
Enqueue Processing
├── Set delivery_id as idempotency key
├── Queue async job
└── Return 202 Accepted
    ↓
Background Processing
├── Fetch PR diff from provider
├── Run policy engine
├── Enqueue LLM if needed
├── Post results to PR
└── Update status checks
```

### Provider APIs Used

**GitHub:**
- Get PR details: `GET /repos/:owner/:repo/pulls/:pr_number`
- Get diff: `GET /repos/:owner/:repo/pulls/:pr_number/files`
- Comment: `POST /repos/:owner/:repo/issues/:issue_number/comments`
- Status check: `POST /repos/:owner/:repo/statuses/:sha`

**GitLab:**
- Get MR details: `GET /projects/:id/merge_requests/:mr_iid`
- Get diff: `GET /projects/:id/merge_requests/:mr_iid/changes`
- Comment: `POST /projects/:id/merge_requests/:mr_iid/notes`
- Status: `POST /projects/:id/statuses/:sha`

**Bitbucket:**
- Get PR: `GET /repositories/:user/:repo/pullrequests/:pr_id`
- Get diff: `GET /repositories/:user/:repo/pullrequests/:pr_id/diff`
- Comment: `POST /repositories/:user/:repo/pullrequests/:pr_id/comments`

### Signature Validation

```typescript
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison (prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

### Idempotency

GitHub/GitLab/Bitbucket all provide delivery IDs:

```typescript
const deliveryId = headers['x-github-delivery']; // GitHub
const deliveryId = headers['x-gitlab-event-uuid']; // GitLab
const deliveryId = event.deliveryUuid; // Bitbucket

// Use as idempotency key
const jobId = await queue.enqueue('webhooks', {
  type: 'webhook:github',
  data: event,
  idempotencyKey: deliveryId
});
```

### Error Handling

**Provider Retries:**
- GitHub: Retries 3 times over 3 hours
- GitLab: Retries on 5xx errors
- Bitbucket: Retries on network errors

**Our Handling:**
- Accept webhook immediately (202)
- Process async
- If processing fails, let provider retry
- DLQ after 3 failed attempts

### Filtering

ReadyLayer only processes relevant events:

```
Ignored Events:
- PR closed
- PR labeled
- Push to non-main branches (configurable)
- External contributor updates (optional)

Processed Events:
- PR/MR opened
- PR/MR synchronized (new commits)
- Push to main/protected branches
```

---

## Caching Strategy

### Overview

ReadyLayer uses multi-layer caching to optimize performance and reduce costs.

**Cache Layers:**
1. **HTTP Layer**: Browser caching (public, immutable)
2. **Redis Layer**: Cross-instance cache (24 hours)
3. **In-Memory Layer**: Process-local cache (5 minutes)
4. **Database Layer**: Persistent storage

### RAG Cache

Caches semantic search results to avoid redundant embedding calls:

```
Query → Hash → Check Redis → Check Memory → Compute
                       ↓
                   Return cached
```

**Cache Key:**
```
hash(
  organizationId +
  repositoryId +
  queryText +
  topK +
  filters
)
```

**TTL Strategy:**
- Redis: 24 hours (cross-instance)
- Memory: 5 minutes (process-local)
- Database: Never (source of truth)

### Query Result Caching

Results are tagged and invalidated on:

```
PR Updated
    ↓
Cache Tags: (org_id, repo_id, pr_id)
    ↓
XDEL tags from cache
```

### Cost Optimization

Caching reduces:
- LLM API calls: 40-60% reduction
- Embedding API calls: 50-70% reduction
- Database queries: 30-40% reduction

**Example:**
```
Without cache:
- 100 PRs, 10 files each
- 1000 LLM calls
- Cost: $15

With cache:
- 100 PRs, 10 files each
- 300-600 LLM calls (60-70% hit rate)
- Cost: $5-7
```

---

## Summary

| System | Key Feature | Guarantee |
|--------|-------------|-----------|
| Policy Engine | Deterministic | Same input = same output |
| LLM Processing | Async, non-blocking | Return in <1 second |
| Queue | Reliable delivery | At-least-once (idempotent) |
| Webhooks | Event-driven | Process within 5 minutes |
| Caching | Cost optimization | 40-60% LLM call reduction |

For questions or clarifications, see [Support](https://ready-layer.com/support).
