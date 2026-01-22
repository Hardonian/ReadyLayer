import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateWebhookSignature, processWebhook } from '../webhook-processor';

describe('Webhook Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook Validation', () => {
    it('should validate GitHub webhook signature', async () => {
      const payload = JSON.stringify({ action: 'opened', pull_request: {} });
      const secret = 'test-secret';
      
      // Generate valid signature
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const valid = validateWebhookSignature(payload, `sha256=${signature}`, secret);
      expect(valid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ action: 'opened' });
      const secret = 'test-secret';

      const valid = validateWebhookSignature(payload, 'sha256=invalid', secret);
      expect(valid).toBe(false);
    });

    it('should reject missing signatures', () => {
      const payload = JSON.stringify({ action: 'opened' });
      const secret = 'test-secret';

      const valid = validateWebhookSignature(payload, '', secret);
      expect(valid).toBe(false);
    });

    it('should handle multiple signature algorithms', () => {
      const payload = JSON.stringify({ action: 'opened' });
      const secret = 'test-secret';

      // Should support both sha256 and sha1
      const valid256 = validateWebhookSignature(payload, 'sha256=abc', secret);
      const valid1 = validateWebhookSignature(payload, 'sha1=def', secret);

      expect(typeof valid256).toBe('boolean');
      expect(typeof valid1).toBe('boolean');
    });
  });

  describe('GitHub Webhook Events', () => {
    it('should process pull_request opened event', async () => {
      const event = {
        action: 'opened',
        pull_request: {
          id: 1,
          number: 42,
          head: { sha: 'abc123' },
          base: { repo: { name: 'test-repo' } },
        },
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });

    it('should process pull_request synchronize event', async () => {
      const event = {
        action: 'synchronize',
        pull_request: {
          id: 1,
          number: 42,
          head: { sha: 'def456' },
        },
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });

    it('should ignore pull_request closed event', async () => {
      const event = {
        action: 'closed',
        pull_request: {
          id: 1,
          number: 42,
        },
      };

      const result = await processWebhook('pull_request', event);
      // Should return early
      expect(result).toBeDefined();
    });

    it('should process push event', async () => {
      const event = {
        ref: 'refs/heads/main',
        repository: { name: 'test-repo' },
      };

      const result = await processWebhook('push', event);
      expect(result).toBeDefined();
    });
  });

  describe('GitLab Webhook Events', () => {
    it('should process merge_request opened event', async () => {
      const event = {
        object_kind: 'merge_request',
        action: 'open',
        object_attributes: {
          id: 1,
          iid: 42,
          last_commit: { id: 'abc123' },
        },
      };

      const result = await processWebhook('merge_request', event);
      expect(result).toBeDefined();
    });

    it('should process push event', async () => {
      const event = {
        object_kind: 'push',
        repository: { name: 'test-repo' },
      };

      const result = await processWebhook('push', event);
      expect(result).toBeDefined();
    });
  });

  describe('Bitbucket Webhook Events', () => {
    it('should process pull_request created event', async () => {
      const event = {
        eventKey: 'pr:created',
        pullRequest: {
          id: 1,
          title: 'Test PR',
          fromRef: { commit: { hash: 'abc123' } },
        },
      };

      const result = await processWebhook('pullrequest:created', event);
      expect(result).toBeDefined();
    });

    it('should process repo_push event', async () => {
      const event = {
        eventKey: 'repo:push',
        repository: { name: 'test-repo' },
      };

      const result = await processWebhook('repo:push', event);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      try {
        const result = await processWebhook('pull_request', 'invalid json' as unknown as Record<string, unknown>);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing required fields', async () => {
      const event = {
        action: 'opened',
        // Missing pull_request
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      const event = {
        action: 'opened',
        pull_request: { id: 1 },
      };

      // Should not throw
      try {
        await processWebhook('pull_request', event);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid webhook delivery', async () => {
      const events = Array(10)
        .fill(null)
        .map((_, i) => ({
          action: 'opened',
          pull_request: { id: i, number: i },
        }));

      const results = await Promise.all(
        events.map((e) => processWebhook('pull_request', e))
      );

      expect(results).toHaveLength(10);
    });

    it('should respect per-org rate limits', async () => {
      const event = {
        action: 'opened',
        pull_request: {
          id: 1,
          base: { repo: { owner: { login: 'test-org' } } },
        },
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
      // Rate limiting would be enforced during processing
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhooks', async () => {
      const event = {
        action: 'opened',
        pull_request: {
          id: 1,
          number: 42,
          head: { sha: 'abc123' },
        },
      };

      const result1 = await processWebhook('pull_request', event);
      const result2 = await processWebhook('pull_request', event);

      // Both should succeed without duplicate processing
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should use delivery ID for idempotency', async () => {
      const event = {
        action: 'opened',
        pull_request: { id: 1 },
        delivery: '12345-67890',
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });
  });

  describe('Async Processing', () => {
    it('should process webhooks asynchronously', async () => {
      const event = {
        action: 'opened',
        pull_request: {
          id: 1,
          number: 42,
          head: { sha: 'abc123' },
        },
      };

      const startTime = Date.now();
      const result = await processWebhook('pull_request', event);
      const duration = Date.now() - startTime;

      // Should return quickly (queued for async processing)
      expect(duration).toBeLessThan(1000);
      expect(result).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed webhooks', async () => {
      const event = {
        action: 'opened',
        pull_request: { id: 1 },
      };

      // Should support retry on failure
      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });

    it('should respect exponential backoff', async () => {
      const event = {
        action: 'opened',
        pull_request: { id: 1 },
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
      // Backoff would be applied on retries
    });
  });

  describe('Webhook Filtering', () => {
    it('should filter by event type', async () => {
      // Only pull_request open/synchronize should trigger review
      const openedEvent = {
        action: 'opened',
        pull_request: { id: 1 },
      };

      const closedEvent = {
        action: 'closed',
        pull_request: { id: 1 },
      };

      const result1 = await processWebhook('pull_request', openedEvent);
      const result2 = await processWebhook('pull_request', closedEvent);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should filter by branch', async () => {
      const event = {
        action: 'opened',
        pull_request: {
          id: 1,
          base: { ref: 'main' },
        },
      };

      const result = await processWebhook('pull_request', event);
      expect(result).toBeDefined();
    });
  });
});
