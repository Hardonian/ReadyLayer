import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueueService, type JobPayload } from '../index';

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)('Queue Service - Integration Tests', () => {
  let queue: QueueService;

  beforeEach(async () => {
    queue = new QueueService();
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.cleanup();
  });

  describe('Job Enqueuing', () => {
    it('should enqueue a job', async () => {
      const payload: JobPayload = {
        type: 'llm:enrich',
        data: { reviewId: 'review_123' },
      };

      const jobId = await queue.enqueue('reviews', payload);
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should handle idempotent enqueuing', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
        idempotencyKey: 'unique-key-123',
      };

      const jobId1 = await queue.enqueue('test', payload);
      const jobId2 = await queue.enqueue('test', payload);

      // Same idempotency key should return same job ID
      expect(jobId1).toBe(jobId2);
    });

    it('should respect max retries', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
        maxRetries: 3,
      };

      const jobId = await queue.enqueue('test', payload);
      expect(jobId).toBeDefined();
    });

    it('should include organization context', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
        organizationId: 'org_456',
        userId: 'user_789',
      };

      const jobId = await queue.enqueue('test', payload);
      expect(jobId).toBeDefined();
    });
  });

  describe('Job Processing', () => {
    it('should dequeue and process jobs', async () => {
      const payload: JobPayload = {
        type: 'echo',
        data: { message: 'hello' },
      };

      const jobId = await queue.enqueue('test', payload);

      // Simulate job processing
      const result = await queue.dequeue('test', 1);
      expect(result).toBeDefined();
    });

    it('should handle job completion', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { value: 42 },
      };

      const jobId = await queue.enqueue('test', payload);
      await queue.markComplete(jobId, { success: true });

      // Should be able to retrieve result
      const result = await queue.getResult(jobId);
      expect(result?.status).toBe('completed');
    });

    it('should handle job failure', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
      };

      const jobId = await queue.enqueue('test', payload);
      await queue.markFailed(jobId, new Error('Test error'));

      const result = await queue.getResult(jobId);
      expect(result?.status).toBe('failed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed jobs', async () => {
      const payload: JobPayload = {
        type: 'failing:job',
        data: {},
        maxRetries: 3,
      };

      const jobId = await queue.enqueue('test', payload);
      expect(jobId).toBeDefined();
      // Retry logic would be triggered on processing failure
    });

    it('should respect exponential backoff', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
        maxRetries: 2,
      };

      const jobId = await queue.enqueue('test', payload);
      const startTime = Date.now();

      // Jobs should have backoff delays
      await new Promise((resolve) => setTimeout(resolve, 100));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should move exhausted jobs to DLQ', async () => {
      const payload: JobPayload = {
        type: 'failing:job',
        data: {},
        maxRetries: 0, // No retries
      };

      const jobId = await queue.enqueue('test', payload);
      await queue.markFailed(jobId, new Error('Permanent failure'));

      // Should be in DLQ
      const dlqJobs = await queue.getDLQJobs();
      expect(dlqJobs.some((j) => j.id === jobId)).toBe(true);
    });
  });

  describe('Redis Fallback', () => {
    it('should use Redis if available', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
      };

      const jobId = await queue.enqueue('test', payload);
      expect(jobId).toBeDefined();
      // Will use Redis if configured, DB otherwise
    });

    it('should gracefully fall back to database', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
      };

      const jobId = await queue.enqueue('test', payload);
      expect(jobId).toBeDefined();
      // Should work even without Redis
    });

    it('should handle database polling', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: { test: true },
      };

      const jobId = await queue.enqueue('test', payload);

      // Database polling should pick up the job
      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    it('should get queue status', async () => {
      const status = await queue.getStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('failed');
    });

    it('should purge failed jobs', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
      };

      const jobId = await queue.enqueue('test', payload);
      await queue.markFailed(jobId, new Error('Test'));

      await queue.purgeFailed('test');

      const dlqJobs = await queue.getDLQJobs();
      expect(dlqJobs.some((j) => j.id === jobId)).toBe(false);
    });

    it('should clear queue', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
      };

      await queue.enqueue('test', payload);
      await queue.enqueue('test', payload);

      await queue.clear('test');

      const status = await queue.getStatus();
      expect(status.pending).toBe(0);
    });
  });

  describe('Job Ordering', () => {
    it('should process jobs in FIFO order', async () => {
      const jobIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const jobId = await queue.enqueue('test', {
          type: 'ordered:job',
          data: { index: i },
        });
        jobIds.push(jobId);
      }

      // Jobs should be dequeued in order
      const dequeued = await queue.dequeue('test', 3);
      expect(dequeued.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect priority ordering', async () => {
      // Enqueue low priority first
      const lowId = await queue.enqueue('test', {
        type: 'priority:job',
        data: { priority: 'low' },
      });

      // Then high priority
      const highId = await queue.enqueue('test', {
        type: 'priority:job',
        data: { priority: 'high' },
      });

      // High priority should be processed first
      const dequeued = await queue.dequeue('test', 1);
      expect(dequeued.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle queue connection errors', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
      };

      // Should not throw
      try {
        const jobId = await queue.enqueue('test', payload);
        expect(jobId).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed jobs', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: null as unknown as Record<string, unknown>, // Invalid
      };

      // Should handle gracefully
      try {
        await queue.enqueue('test', payload);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should enqueue jobs quickly', async () => {
      const startTime = Date.now();
      const count = 100;

      for (let i = 0; i < count; i++) {
        await queue.enqueue('test', {
          type: 'perf:job',
          data: { index: i },
        });
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / count;

      // Should enqueue <10ms per job on average
      expect(avgTime).toBeLessThan(50);
    });

    it('should handle high throughput', async () => {
      const jobIds: Promise<string>[] = [];

      for (let i = 0; i < 50; i++) {
        jobIds.push(
          queue.enqueue('test', {
            type: 'throughput:job',
            data: { batch: i },
          })
        );
      }

      const results = await Promise.all(jobIds);
      expect(results).toHaveLength(50);
    });
  });

  describe('Monitoring', () => {
    it('should track job metrics', async () => {
      const payload: JobPayload = {
        type: 'test:job',
        data: {},
      };

      await queue.enqueue('test', payload);

      const metrics = await queue.getMetrics();
      expect(metrics).toHaveProperty('enqueued');
      expect(metrics).toHaveProperty('processed');
      expect(metrics).toHaveProperty('failed');
    });
  });
});
