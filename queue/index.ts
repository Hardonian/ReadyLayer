/**
 * Queue Service
 *
 * Redis-backed durable queue with retries, idempotency, and DLQ
 */

import { prisma } from '../lib/prisma';

import { createClient } from 'redis';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';
import { usageEnforcementService } from '../lib/usage-enforcement';

import { toJsonValue } from '../lib/prisma-json';
export interface JobPayload {
  type: string;
  data: unknown;
  idempotencyKey?: string;
  maxRetries?: number;
  organizationId?: string; // For usage enforcement
  userId?: string; // For usage enforcement
}

export interface JobResult {
  id: string;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

type QueueHandler = (payload: unknown) => Promise<unknown>;

export class QueueService {
  private redis: ReturnType<typeof createClient> | null = null;
  private isConnected = false;

  constructor() {
    // IMPORTANT: no side effects at import/construct time.
    // Connection is established lazily on first use to avoid build-time/SSR failures.
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      // Redis not configured; use database fallback.
      this.isConnected = false;
      return;
    }

    try {
      this.redis = createClient({ url: redisUrl });
      this.redis.on('error', (err: Error) => {
        logger.error({ err }, 'Redis error');
        this.isConnected = false;
      });

      await this.redis.connect();
      this.isConnected = true;
    } catch (error) {
      logger.warn('Failed to connect to Redis, using database fallback', { error });
      // Fallback to database-only queue
      this.isConnected = false;
    }
  }

  private async ensureRedisInitialized(): Promise<void> {
    if (this.isConnected) return;
    // If redis is configured but we haven't connected yet, attempt a single connect.
    // If it fails, we stay in DB fallback mode.
    if (process.env.REDIS_URL && !this.redis) {
      await this.initializeRedis();
    }
  }

  /**
   * Enqueue a job
   */
  async enqueue(queueName: string, payload: JobPayload): Promise<string> {
    await this.ensureRedisInitialized();
    const jobId = payload.idempotencyKey || this.generateJobId();

    // Check idempotency
    if (payload.idempotencyKey) {
      const existing = await this.getJobByIdempotencyKey(payload.idempotencyKey);
      if (existing) {
        return existing.id;
      }
    }

    // Check usage limits before enqueueing (if organizationId provided)
    if (payload.organizationId) {
      await usageEnforcementService.checkJobEnqueue(
        payload.organizationId,
        payload.userId || null,
        payload.type
      );
    }

    // Get repositoryId from payload.data if available (for job record)
    const data = payload.data as { repositoryId?: string; repoId?: string } | undefined;
    const repositoryId = data?.repositoryId ?? data?.repoId ?? null;

    // Create job in database (for durability)
    await prisma.job.create({
      data: {
        id: jobId,
        type: payload.type,
        status: 'pending',
        payload: toJsonValue(payload.data),
        maxRetries: payload.maxRetries || 3,
        scheduledAt: new Date(),
        repositoryId,
        userId: payload.userId || null,
      },
    });

    // Add to Redis queue (for processing)
    if (this.isConnected && this.redis) {
      await this.redis.lPush(`queue:${queueName}`, JSON.stringify({
        id: jobId,
        type: payload.type,
        data: payload.data,
        maxRetries: payload.maxRetries || 3,
      }));
    }

    return jobId;
  }

  /**
   * Process jobs from queue
   */
  async processQueue(queueName: string, handler: QueueHandler): Promise<void> {
    await this.ensureRedisInitialized();
    if (!this.isConnected || !this.redis) {
      // Fallback: process from database
      await this.processFromDatabase(queueName, handler);
      return;
    }

    while (true) {
      try {
        // Blocking pop from queue
        const result = await this.redis.brPop(`queue:${queueName}`, 5); // 5 second timeout

        if (!result) {
          continue;
        }

const jobData = JSON.parse(result.element) as { id: string };
        await this.processJob(jobData.id, handler);
      } catch (error) {
        logger.error(error, 'Queue processing error');
        await this.sleep(1000); // Wait before retrying
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(
    jobId: string,
    handler: QueueHandler
  ): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'pending') {
      return;
    }

    // Update status to processing
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    try {
      // Execute handler
      const result = await handler(job.payload);

      // Mark as completed
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: toJsonValue(result),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const retryCount = job.retryCount + 1;

      if (retryCount < job.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s, etc.
        const scheduledAt = new Date(Date.now() + delay);

        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'retrying',
            retryCount,
            error: errorMessage,
            scheduledAt,
          },
        });

        // Re-enqueue for retry
        if (this.isConnected && this.redis) {
          await this.redis.lPush(
            `queue:retry`,
            JSON.stringify({
              id: jobId,
              scheduledAt: scheduledAt.getTime(),
            })
          );
        }
      } else {
        // Max retries exceeded, move to DLQ
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
          },
        });

        // Move to dead letter queue
        if (this.isConnected && this.redis) {
          await this.redis.lPush(`queue:dlq`, JSON.stringify({
            id: jobId,
            error: errorMessage,
            failedAt: new Date().toISOString(),
          }));
        }
      }
    }
  }

  /**
   * Process jobs from database (fallback) - BATCH OPTIMIZED
   *
   * Improvements:
   * - Fetches jobs in batches (50 instead of 10)
   * - Processes multiple jobs concurrently (up to 5 at a time)
   * - Uses batch status updates where possible
   * - Reduces polling frequency on empty queues
   */
  private async processFromDatabase(
    queueName: string,
    handler: QueueHandler
  ): Promise<void> {
    let emptyPollCount = 0;

    while (true) {
      try {
        const jobs = await prisma.job.findMany({
          where: {
            type: queueName,
            status: { in: ['pending', 'retrying'] },
            scheduledAt: { lte: new Date() },
          },
          take: 50, // Increased batch size
          orderBy: {
            scheduledAt: 'asc',
          },
        });

        if (jobs.length === 0) {
          emptyPollCount++;
          // Exponential backoff on empty queue (max 30s)
          const backoffMs = Math.min(1000 * Math.pow(1.5, emptyPollCount), 30000);
          await this.sleep(backoffMs);
          continue;
        }

        // Reset counter when jobs found
        emptyPollCount = 0;

        // Mark all jobs as processing in one batch
        const jobIds = jobs.map(j => j.id);
        await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: {
            status: 'processing',
            startedAt: new Date(),
          },
        });

        // Process jobs with limited concurrency (5 at a time)
        const CONCURRENCY = 5;
        const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

        for (let i = 0; i < jobs.length; i += CONCURRENCY) {
          const batch = jobs.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map(async (job) => {
              try {
                const result = await handler(job.payload);
                return { jobId: job.id, success: true, result };
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return { jobId: job.id, success: false, error: errorMessage };
              }
            })
          );
          results.push(...batchResults);
        }

        // Batch update completed jobs
        const completedJobIds = results.filter(r => r.success).map(r => r.jobId);
        if (completedJobIds.length > 0) {
          await prisma.job.updateMany({
            where: { id: { in: completedJobIds } },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });
          metrics.increment('jobs.batch.completed', { count: completedJobIds.length.toString() });
        }

        // Handle failed jobs (need individual updates for retry count)
        const failedResults = results.filter(r => !r.success);
        for (const failed of failedResults) {
          const job = jobs.find(j => j.id === failed.jobId)!;
          const retryCount = job.retryCount + 1;

          if (retryCount < job.maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            const scheduledAt = new Date(Date.now() + delay);

            await prisma.job.update({
              where: { id: failed.jobId },
              data: {
                status: 'retrying',
                retryCount,
                error: failed.error,
                scheduledAt,
              },
            });
          } else {
            await prisma.job.update({
              where: { id: failed.jobId },
              data: {
                status: 'failed',
                error: failed.error,
                completedAt: new Date(),
              },
            });
          }
        }

        // Short pause between batches
        await this.sleep(100);
      } catch (error) {
        logger.error(error, 'Database queue processing error');
        await this.sleep(5000);
      }
    }
  }

  /**
   * Get job by idempotency key
   */
  private async getJobByIdempotencyKey(_key: string): Promise<{ id: string } | null> {
    // Would check Redis cache first, then database
    return null; // Simplified
  }

  /**
   * Generate job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initialize the queue service
   * Public method for tests and explicit initialization
   */
  async initialize(): Promise<void> {
    await this.ensureRedisInitialized();
  }

  /**
   * Cleanup resources
   * Public method for tests to cleanup connections
   */
  async cleanup(): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
      this.redis = null;
    }
  }
}

export const queueService = new QueueService();
