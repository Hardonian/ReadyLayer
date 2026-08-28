/**
 * Jobs Module
 *
 * Server-side job management with tenant isolation.
 * Provides enqueue, status polling, and result retrieval.
 */

import { prisma } from './prisma';
import { queueService } from '@/queue';
import { logger } from '@/observability/logging';

/**
 * Job status types
 */
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'dead' | 'canceled';

/**
 * Job data returned by API
 */
export interface JobData {
  id: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  organizationId?: string;
  repositoryId?: string;
  userId?: string;
  idempotencyKey?: string;
}

/**
 * Enqueue a new job
 *
 * @param params - Job parameters
 * @returns Job ID
 */
export async function enqueueJob({
  tenantId,
  type,
  payload,
  idempotencyKey,
  userId,
  repositoryId,
  maxRetries = 3,
}: {
  tenantId: string;
  type: string;
  payload: unknown;
  idempotencyKey?: string;
  userId?: string;
  repositoryId?: string;
  maxRetries?: number;
}): Promise<string> {
  const traceId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  logger.info({
    msg: 'Enqueueing job',
    traceId,
    tenantId,
    type,
    idempotencyKey,
    userId,
  });

  try {
    // Check idempotency - if key exists, return existing job
    if (idempotencyKey) {
      const existing = await prisma.job.findFirst({
        where: {
          idempotencyKey: idempotencyKey as string,
          organizationId: tenantId as string,
        } as Record<string, unknown>,
        select: { id: true, status: true },
      });

      if (existing) {
        logger.info({
          msg: 'Job already exists with idempotency key',
          traceId,
          existingJobId: existing.id,
          status: existing.status,
        });
        return existing.id;
      }
    }

    // Enqueue via queue service (handles both Redis + DB persistence)
    const jobId = await queueService.enqueue(type, {
      type,
      data: payload,
      idempotencyKey,
      organizationId: tenantId,
      userId,
      maxRetries,
    });

    // Update with repository if provided
    if (repositoryId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { repositoryId: repositoryId as string } as Record<string, unknown>,
      });
    }

    logger.info({
      msg: 'Job enqueued successfully',
      traceId,
      jobId,
      tenantId,
      type,
    });

    return jobId;
  } catch (error) {
    logger.error({
      msg: 'Failed to enqueue job',
      traceId,
      tenantId,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get a single job by ID
 *
 * @param jobId - Job ID
 * @returns Job data or null
 */
export async function getJob(jobId: string): Promise<JobData | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    type: job.type,
    status: job.status as JobStatus,
    payload: job.payload,
    result: job.result ?? undefined,
    error: job.error ?? undefined,
    retryCount: job.retryCount,
    maxRetries: job.maxRetries,
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
    organizationId: (job as Record<string, unknown>).organizationId as string | undefined,
    repositoryId: job.repositoryId ?? undefined,
    userId: job.userId ?? undefined,
    idempotencyKey: (job as Record<string, unknown>).idempotencyKey as string | undefined,
  };
}

/**
 * List jobs for a tenant
 *
 * @param params - Filter parameters
 * @returns Array of jobs
 */
export async function listJobs({
  tenantId,
  type,
  status,
  limit = 20,
  offset = 0,
}: {
  tenantId: string;
  type?: string;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: JobData[]; total: number }> {
  const where: Record<string, unknown> = {
    organizationId: tenantId,
  };

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: where as Record<string, unknown>,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.count({ where: where as Record<string, unknown> }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      type: job.type,
      status: job.status as JobStatus,
      payload: job.payload,
      result: job.result ?? undefined,
      error: job.error ?? undefined,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
      organizationId: (job as Record<string, unknown>).organizationId as string | undefined,
      repositoryId: job.repositoryId ?? undefined,
      userId: job.userId ?? undefined,
      idempotencyKey: (job as Record<string, unknown>).idempotencyKey as string | undefined,
    })),
    total,
  };
}

/**
 * Get job result
 *
 * @param jobId - Job ID
 * @returns Result data or null if not completed
 */
export async function getJobResult(jobId: string): Promise<{
  result?: unknown;
  error?: string;
  status: JobStatus;
  completedAt?: Date;
} | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      result: true,
      error: true,
      completedAt: true,
    },
  });

  if (!job) {
    return null;
  }

  return {
    status: job.status as JobStatus,
    result: job.result ?? undefined,
    error: job.error ?? undefined,
    completedAt: job.completedAt ?? undefined,
  };
}

/**
 * Cancel a queued or running job
 *
 * @param jobId - Job ID
 * @param tenantId - Tenant ID for verification
 * @returns Success status
 */
export async function cancelJob(
  jobId: string,
  tenantId: string
): Promise<boolean> {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      organizationId: tenantId as string,
    } as Record<string, unknown>,
  });

  if (!job) {
    return false;
  }

  // Can only cancel queued or running jobs
  if (!['queued', 'running'].includes(job.status)) {
    return false;
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'canceled',
      completedAt: new Date(),
    },
  });

  logger.info({
    msg: 'Job canceled',
    jobId,
    tenantId,
  });

  return true;
}

/**
 * Transform job data for API response
 */
export function transformJobForApi(job: JobData): Record<string, unknown> {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: {
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
    },
    timestamps: {
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    },
    // Only include payload summary, not full payload
    payload: typeof job.payload === 'object' && job.payload !== null
      ? { type: (job.payload as Record<string, unknown>)?.type || job.type }
      : { type: job.type },
    tenantId: job.organizationId,
    repositoryId: job.repositoryId,
  };
}

interface TransformedJobResult {
  status: JobStatus;
  completed: boolean;
  result: unknown | undefined;
  error: string | undefined;
  completedAt: string | undefined;
}

/**
 * Transform job result for API response
 */
export function transformJobResultForApi(result: {
  result?: unknown;
  error?: string;
  status: JobStatus;
  completedAt?: Date;
}): TransformedJobResult {
  return {
    status: result.status,
    completed: result.status === 'succeeded' || result.status === 'failed' || result.status === 'dead',
    result: result.result,
    error: result.error,
    completedAt: result.completedAt?.toISOString(),
  };
}
