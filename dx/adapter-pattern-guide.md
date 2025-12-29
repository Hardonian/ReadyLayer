# ReadyLayer — Adapter Pattern Developer Guide

## Quick Reference

This guide helps developers understand and use ReadyLayer's adapter pattern for platform integrations.

---

## Core Concepts

### 1. Platform Adapter Interface

All platform integrations implement the `PlatformAdapter` interface:

```typescript
import { PlatformAdapter, NormalizedPR, NormalizedComment } from '@readylayer/core';

// Get adapter for platform
const adapter = await adapterRegistry.getAdapter('github', {
  platform: 'github',
  credentials: { token: '...' }
});

// Use normalized interfaces (works for all platforms)
const pr = await adapter.getPR('owner/repo#123');
const comment = await adapter.postPRComment('owner/repo#123', {
  body: 'Review comment',
  position: { path: 'src/file.ts', line: 42, side: 'right' }
});
```

### 2. Normalized Types

All adapters use the same normalized types:

```typescript
// Works for GitHub PR, GitLab MR, Bitbucket PR, Azure DevOps PR
interface NormalizedPR {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  source_branch: string;
  target_branch: string;
  head_sha: string;
  base_sha: string;
  platform: Platform; // 'github' | 'gitlab' | 'bitbucket' | 'azure-devops'
  // ... other fields
}
```

### 3. Event Normalization

All webhooks are normalized to common event types:

```typescript
// GitHub: pull_request.opened → pr.opened
// GitLab: merge_request → pr.opened
// Bitbucket: pullrequest:created → pr.opened
// Azure DevOps: git.pullrequest.created → pr.opened

type NormalizedEventType = 
  | 'pr.opened'
  | 'pr.updated'
  | 'pr.closed'
  | 'pr.merged'
  | 'ci.completed'
  | 'merge.completed';
```

---

## Usage Examples

### Example 1: Post Comment to Any Platform

```typescript
import { adapterRegistry } from '@readylayer/core';

async function postReviewComment(
  platform: Platform,
  prId: string,
  issue: Issue
) {
  const adapter = await adapterRegistry.getAdapter(platform, {
    platform,
    credentials: getUserCredentials(platform)
  });
  
  const comment: NormalizedComment = {
    id: '',
    body: formatIssueComment(issue),
    author: { id: 'readylayer', username: 'readylayer', name: 'ReadyLayer' },
    created_at: new Date().toISOString(),
    position: {
      path: issue.file,
      line: issue.line,
      side: 'right'
    }
  };
  
  // Works for GitHub, GitLab, Bitbucket, Azure DevOps
  return await adapter.postPRComment(prId, comment);
}
```

### Example 2: Handle Webhook from Any Platform

```typescript
import { webhookHandler } from '@readylayer/core';

app.post('/webhooks/:platform', async (req, res) => {
  const platform = req.params.platform as Platform;
  
  try {
    // Normalizes webhook to common format
    await webhookHandler.handleWebhook(
      platform,
      req.body,
      req.headers as Record<string, string>
    );
    
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Example 3: Subscribe to Real-Time Updates

```typescript
import { wsService } from '@readylayer/core';

// Works for any platform that supports WebSockets
wss.on('connection', async (ws, req) => {
  const platform = getPlatformFromRequest(req);
  const prId = getPRIdFromRequest(req);
  
  await wsService.subscribe(platform, prId, connectionId, ws);
  
  // Receive normalized events
  ws.on('message', (message) => {
    const event: NormalizedEvent = JSON.parse(message);
    // Handle event (same format for all platforms)
  });
});
```

### Example 4: Platform-Agnostic Business Logic

```typescript
class ReviewService {
  async reviewPR(pr: NormalizedPR): Promise<Review> {
    // Business logic is platform-agnostic
    const diff = await this.getDiff(pr);
    const issues = await this.analyzeCode(diff);
    
    // Use adapter to post results (works for any platform)
    const adapter = await adapterRegistry.getAdapter(pr.platform, {
      platform: pr.platform,
      credentials: {}
    });
    
    for (const issue of issues) {
      await adapter.postPRComment(pr.id, {
        id: '',
        body: formatIssue(issue),
        author: { id: 'readylayer', username: 'readylayer', name: 'ReadyLayer' },
        created_at: new Date().toISOString(),
        position: {
          path: issue.file,
          line: issue.line,
          side: 'right'
        }
      });
    }
    
    return { issues, pr };
  }
}
```

---

## Adding a New Platform Adapter

### Step 1: Implement PlatformAdapter Interface

```typescript
import { PlatformAdapter, NormalizedPR, NormalizedComment } from '@readylayer/core';

class NewPlatformAdapter implements PlatformAdapter {
  readonly platform: Platform = 'new-platform';
  readonly version: string = 'v1';
  
  async getPR(prId: string): Promise<NormalizedPR> {
    // Fetch PR from new platform API
    const pr = await this.apiClient.getPR(prId);
    
    // Normalize to common format
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: this.mapState(pr.state),
      // ... map all fields
      platform: 'new-platform'
    };
  }
  
  async postPRComment(
    prId: string,
    comment: NormalizedComment
  ): Promise<NormalizedComment> {
    // Convert normalized comment to platform format
    const platformComment = this.toPlatformComment(comment);
    
    // Post via platform API
    const created = await this.apiClient.postComment(prId, platformComment);
    
    // Normalize response
    return this.normalizeComment(created);
  }
  
  // Implement all other required methods...
}
```

### Step 2: Register Adapter Factory

```typescript
import { adapterRegistry } from '@readylayer/core';

class NewPlatformAdapterFactory implements AdapterFactory {
  async create(config: AdapterConfig): Promise<PlatformAdapter> {
    return new NewPlatformAdapter(config);
  }
}

// Register factory
adapterRegistry.registerFactory('new-platform', new NewPlatformAdapterFactory());
```

### Step 3: Add Webhook Normalization

```typescript
async normalizeWebhook(
  payload: unknown,
  headers: Record<string, string>
): Promise<NormalizedEvent> {
  const event = payload as NewPlatformWebhookPayload;
  
  return {
    id: event.id,
    type: this.mapEventType(event.type),
    platform: 'new-platform',
    timestamp: event.timestamp,
    data: this.normalizeEventData(event),
    correlation_id: event.correlation_id
  };
}
```

---

## Best Practices

### 1. Always Use Normalized Types

✅ **Good:**
```typescript
const pr: NormalizedPR = await adapter.getPR(prId);
```

❌ **Bad:**
```typescript
const pr = await adapter.getPR(prId); // Type is unknown
```

### 2. Handle Platform-Specific Features Gracefully

```typescript
const capabilities = adapter.getCapabilities();

if (capabilities.supports_inline_comments) {
  await adapter.postPRComment(prId, comment);
} else {
  // Fallback to summary comment
  await adapter.postPRComment(prId, {
    ...comment,
    position: undefined // Remove inline position
  });
}
```

### 3. Use Adapter Registry

✅ **Good:**
```typescript
const adapter = await adapterRegistry.getAdapter(platform, config);
```

❌ **Bad:**
```typescript
const adapter = new GitHubAdapter(config); // Hard-coded platform
```

### 4. Handle Errors Gracefully

```typescript
try {
  await adapter.postPRComment(prId, comment);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Retry with backoff
    await retryWithBackoff(() => adapter.postPRComment(prId, comment));
  } else {
    // Log and continue
    logger.error('Failed to post comment', { error });
  }
}
```

### 5. Check Adapter Health

```typescript
const health = await adapter.healthCheck();

if (health.status === 'unhealthy') {
  // Use fallback or queue for later
  await queueComment(prId, comment);
} else {
  await adapter.postPRComment(prId, comment);
}
```

---

## Testing

### Mock Adapter for Testing

```typescript
class MockAdapter implements PlatformAdapter {
  readonly platform: Platform = 'mock';
  readonly version: string = 'v1';
  
  private prs: Map<string, NormalizedPR> = new Map();
  private comments: Map<string, NormalizedComment[]> = new Map();
  
  async getPR(prId: string): Promise<NormalizedPR> {
    return this.prs.get(prId)!;
  }
  
  async postPRComment(
    prId: string,
    comment: NormalizedComment
  ): Promise<NormalizedComment> {
    if (!this.comments.has(prId)) {
      this.comments.set(prId, []);
    }
    this.comments.get(prId)!.push(comment);
    return comment;
  }
  
  // Implement other methods...
}

// Use in tests
const mockAdapter = new MockAdapter();
adapterRegistry.registerFactory('mock', {
  create: async () => mockAdapter
});
```

### Integration Tests

```typescript
describe('ReviewService', () => {
  it('should work with any platform adapter', async () => {
    const platforms: Platform[] = ['github', 'gitlab', 'bitbucket'];
    
    for (const platform of platforms) {
      const adapter = await adapterRegistry.getAdapter(platform, {
        platform,
        credentials: getTestCredentials(platform)
      });
      
      const pr = await adapter.getPR('test/repo#1');
      expect(pr.platform).toBe(platform);
      expect(pr.id).toBeDefined();
      expect(pr.title).toBeDefined();
    }
  });
});
```

---

## Common Patterns

### Pattern 1: Multi-Platform Operation

```typescript
async function reviewAllPlatforms(repos: Array<{ platform: Platform; prId: string }>) {
  const results = await Promise.all(
    repos.map(async ({ platform, prId }) => {
      const adapter = await adapterRegistry.getAdapter(platform, {
        platform,
        credentials: getCredentials(platform)
      });
      
      const pr = await adapter.getPR(prId);
      return await reviewService.review(pr);
    })
  );
  
  return results;
}
```

### Pattern 2: Platform-Specific Fallback

```typescript
async function postCommentWithFallback(
  platform: Platform,
  prId: string,
  comment: NormalizedComment
) {
  const adapter = await adapterRegistry.getAdapter(platform, {
    platform,
    credentials: getCredentials(platform)
  });
  
  const capabilities = adapter.getCapabilities();
  
  if (capabilities.supports_inline_comments && comment.position) {
    try {
      return await adapter.postPRComment(prId, comment);
    } catch (error) {
      // Fallback to summary comment
      return await adapter.postPRComment(prId, {
        ...comment,
        position: undefined
      });
    }
  } else {
    // No inline support, use summary
    return await adapter.postPRComment(prId, {
      ...comment,
      position: undefined
    });
  }
}
```

### Pattern 3: Event-Driven Processing

```typescript
// Subscribe to events from any platform
eventBus.subscribe('pr.opened', async (event: NormalizedEvent) => {
  const data = event.data as PROpenedEventData;
  const pr = data.pr;
  
  // Business logic is platform-agnostic
  const review = await reviewService.review(pr);
  
  // Use adapter to post results
  const adapter = await adapterRegistry.getAdapter(pr.platform, {
    platform: pr.platform,
    credentials: {}
  });
  
  await adapter.postPRComment(pr.id, formatReview(review));
});
```

---

## Summary

The adapter pattern ensures:

- **Compatibility:** Same code works across all platforms
- **Portability:** Business logic is platform-agnostic
- **Composability:** Services can be combined in different ways

Key takeaways:
1. Always use normalized types (`NormalizedPR`, `NormalizedComment`, etc.)
2. Use adapter registry to get adapters
3. Handle platform capabilities gracefully
4. Business logic should be platform-agnostic
5. Test with mock adapters for unit tests

For detailed architecture, see `/architecture/compatibility-portability-composability.md`.
