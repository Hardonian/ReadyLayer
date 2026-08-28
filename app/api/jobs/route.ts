/**
 * Jobs API Routes
 *
 * POST /api/jobs - Enqueue a new job
 * GET /api/jobs - List jobs for tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  enqueueJob,
  listJobs,
  transformJobForApi,
  JobStatus
} from '@/lib/jobs';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/observability/logging';

// Validation schemas
const enqueueJobSchema = z.object({
  type: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().min(1).max(100).optional(),
  repositoryId: z.string().optional(),
  maxRetries: z.number().int().min(1).max(10).default(3),
});

const listJobsQuerySchema = z.object({
  type: z.string().optional(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'dead', 'canceled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * POST /api/jobs
 * Enqueue a new job
 */
export async function POST(request: NextRequest) {
  const requestId = `job_req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user's organization
    const organizationId = user.organizationIds[0];
    if (!organizationId) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' } },
        { status: 403 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }

    // Validate request
    const validationResult = enqueueJobSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            context: { errors: validationResult.error.issues }
          }
        },
        { status: 400 }
      );
    }

    const { type, payload, idempotencyKey, repositoryId, maxRetries } = validationResult.data;

    log.info({
      type,
      organizationId,
      userId: user.id,
      idempotencyKey
    }, 'Enqueueing job');

    // Enqueue the job
    const jobId = await enqueueJob({
      tenantId: organizationId,
      type,
      payload,
      idempotencyKey,
      userId: user.id,
      repositoryId,
      maxRetries,
    });

    log.info({ jobId }, 'Job enqueued successfully');

    return NextResponse.json(
      {
        data: {
          id: jobId,
          status: 'queued',
          message: 'Job enqueued successfully'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    log.error(error, 'Failed to enqueue job');

    // Return friendly error with trace id
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to enqueue job. Please try again later.',
          context: { traceId: requestId }
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs
 * List jobs for the user's organization
 */
export async function GET(request: NextRequest) {
  const requestId = `job_req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user's organization
    const organizationId = user.organizationIds[0];
    if (!organizationId) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User not associated with any organization' } },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = listJobsQuerySchema.safeParse({
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            context: { errors: queryResult.error.issues }
          }
        },
        { status: 400 }
      );
    }

    const { type, status, limit, offset } = queryResult.data;

    log.info({ organizationId, type, status }, 'Listing jobs');

    // Fetch jobs
    const { jobs, total } = await listJobs({
      tenantId: organizationId,
      type,
      status: status as JobStatus | undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      data: jobs.map(transformJobForApi),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    log.error(error, 'Failed to list jobs');

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list jobs. Please try again later.',
          context: { traceId: requestId }
        }
      },
      { status: 500 }
    );
  }
}
