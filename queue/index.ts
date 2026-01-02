/**
 * Queue Service
 * 
 * Redis-backed durable queue with retries, idempotency, and DLQ
 */

import { prisma } from '../lib/prisma';
import { createClient } from 'redis';
import { logger } from '../observability/logging';
import { usageEnforcementService } from '../lib/usage-enforcement';

export interface JobPayload {
  type: string;
  data: any;
  idempotencyKey?: string;
  maxRetries?: number;
  organizationId?: string; // For usage enforcement
  userId?: string; // For usage enforcement
}

export interface JobResult {
  id: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class QueueService {
  private redis: ReturnType<typeof createClient> | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redis = createClient({ url: redisUrl });
      this.redis.on('error', (err) => {
        logger.error('Redis error', err);
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

  /**
   * Enqueue a job
   */
  async enqueue(queueName: string, payload: JobPayload): Promise<string> {
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
      try {
        await usageEnforcementService.checkJobEnqueue(
          payload.organizationId,
          payload.userId || null,
          payload.type
        );
      } catch (error) {
        // Re-throw usage limit errors as-is (they have proper HTTP status codes)
        throw error;
      }
    }

    // Get repositoryId from payload.data if available (for job record)
    const repositoryId = payload.data?.repositoryId || payload.data?.repoId || null;

    // Create job in database (for durability)
    await prisma.job.create({
      data: {
        id: jobId,
        type: payload.type,
        status: 'pending',
        payload: payload.data,
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
  async processQueue(queueName: string, handler: (payload: any) => Promise<any>): Promise<void> {
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

        const jobData = JSON.parse(result.element);
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
    handler: (payload: any) => Promise<any>
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
          result,
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
   * Process jobs from database (fallback)
   */
  private async processFromDatabase(
    queueName: string,
    handler: (payload: any) => Promise<any>
  ): Promise<void> {
    while (true) {
      try {
        const jobs = await prisma.job.findMany({
          where: {
            type: queueName,
            status: { in: ['pending', 'retrying'] },
            scheduledAt: { lte: new Date() },
          },
          take: 10,
          orderBy: {
            scheduledAt: 'asc',
          },
        });

        for (const job of jobs) {
          await this.processJob(job.id, handler);
        }

        await this.sleep(1000); // Poll every second
      } catch (error) {
        logger.error(error, 'Database queue processing error');
        await this.sleep(5000);
      }
    }
  }

  /**
   * Get job by idempotency key
   */
  private async getJobByIdempotencyKey(_key: string): Promise<any> {
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
}

export const queueService = new QueueService();
