/**
 * Runs API Routes
 * 
 * POST /api/v1/runs - Create and execute a new run
 * GET /api/v1/runs - List runs (tenant-isolated)
 */

import { runPipelineService, RunRequest } from '../../../../services/run-pipeline';
import { prisma } from '../../../../lib/prisma';
import { checkBillingLimits } from '../../../../lib/billing-middleware';
import {
  createRouteHandler,
  parseJsonBody,
  errorResponse,
  successResponse,
  parsePagination,
  paginatedResponse,
  RouteContext,
} from '../../../../lib/api-route-helpers';
import { z } from 'zod';

// Validation schemas
const runFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  beforeContent: z.string().nullable().optional(),
});

const createRunSchema = z.object({
  repositoryId: z.string().optional(),
  sandboxId: z.string().optional(),
  trigger: z.enum(['webhook', 'manual', 'sandbox']),
  triggerMetadata: z.object({
    prNumber: z.number().optional(),
    prSha: z.string().optional(),
    prTitle: z.string().optional(),
    userId: z.string().optional(),
    diff: z.string().optional(),
    files: z.array(runFileSchema).optional(),
  }).optional(),
  config: z.object({
    skipReviewGuard: z.boolean().optional(),
    skipTestEngine: z.boolean().optional(),
    skipDocSync: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/v1/runs
 * Create and execute a new run
 */
export const POST = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;

    // Parse and validate body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validationResult = createRunSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.errors }
      );
    }

    const { repositoryId, sandboxId, trigger, triggerMetadata, config } = validationResult.data;

    // For sandbox runs, no authz needed
    if (trigger !== 'sandbox' && repositoryId) {
      // Get repository and verify tenant isolation
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo) {
        return errorResponse('NOT_FOUND', 'Repository not found', 404);
      }

      // Verify user belongs to repository's organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: repo.organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
      }

      // Check billing limits
      const billingCheck = await checkBillingLimits(repo.organizationId, {
        requireFeature: 'reviewGuard', // Runs use review guard feature
        checkLLMBudget: true,
      });
      if (billingCheck) {
        return billingCheck;
      }
    }

    log.info({ repositoryId, sandboxId, trigger }, 'Creating run');

    // Build run request
    const runRequest: RunRequest = {
      repositoryId,
      sandboxId,
      trigger,
      triggerMetadata: triggerMetadata ? {
        ...triggerMetadata,
        userId: user.id,
      } : { userId: user.id },
      config,
    };

    // Execute run (async - returns immediately with run ID)
    try {
      const result = await runPipelineService.executeRun(runRequest);

      return successResponse(result, 201);
    } catch (error) {
      log.error(error, 'Run execution failed');
      return errorResponse(
        'RUN_EXECUTION_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  },
  { authz: { requiredScopes: ['write'] } }
);

/**
 * GET /api/v1/runs
 * List runs (tenant-isolated)
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user } = context;
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const sandboxId = searchParams.get('sandboxId');
    const status = searchParams.get('status');
    const conclusion = searchParams.get('conclusion');
    const trigger = searchParams.get('trigger');
    const stage = searchParams.get('stage'); // review_guard, test_engine, doc_sync
    const branch = searchParams.get('branch');
    const author = searchParams.get('author');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const { limit, offset } = parsePagination(request);

    // Build where clause with tenant isolation
    const where: {
      repository?: { organizationId: { in: string[] } };
      repositoryId?: string;
      sandboxId?: string;
      status?: string;
      conclusion?: string;
      trigger?: string;
      reviewGuardStatus?: string;
      testEngineStatus?: string;
      docSyncStatus?: string;
      createdAt?: { gte?: Date; lte?: Date };
      triggerMetadata?: any;
    } = {};

    if (sandboxId) {
      // Sandbox runs are public (for demo)
      where.sandboxId = sandboxId;
    } else if (repositoryId) {
      // Get user's organization memberships for tenant isolation
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      const userOrgIds = memberships.map((m) => m.organizationId);

      if (userOrgIds.length === 0) {
        return paginatedResponse([], 0, limit, offset);
      }

      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || !userOrgIds.includes(repo.organizationId)) {
        return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
      }

      where.repositoryId = repositoryId;
    } else {
      // List all runs for user's organizations
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      const userOrgIds = memberships.map((m) => m.organizationId);

      if (userOrgIds.length === 0) {
        return paginatedResponse([], 0, limit, offset);
      }

      where.repository = {
        organizationId: { in: userOrgIds },
      };
    }

    // Apply filters
    if (status) {
      where.status = status;
    }
    if (conclusion) {
      where.conclusion = conclusion;
    }
    if (trigger) {
      where.trigger = trigger as 'webhook' | 'manual' | 'sandbox';
    }
    if (stage) {
      if (stage === 'review_guard') {
        where.reviewGuardStatus = searchParams.get('stageStatus') || undefined;
      } else if (stage === 'test_engine') {
        where.testEngineStatus = searchParams.get('stageStatus') || undefined;
      } else if (stage === 'doc_sync') {
        where.docSyncStatus = searchParams.get('stageStatus') || undefined;
      }
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    if (branch || author) {
      // Filter by triggerMetadata (would need JSON filtering)
      // For now, we'll filter in memory after fetching
    }

    const [runs, total] = await Promise.all([
      prisma.readyLayerRun.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.readyLayerRun.count({ where }),
    ]);

    // Filter by branch/author if specified (in-memory filtering for JSON fields)
    let filteredRuns = runs;
    if (branch || author) {
      filteredRuns = runs.filter((r) => {
        const metadata = r.triggerMetadata as any;
        if (branch && metadata?.prSha) {
          // Would need to fetch branch from PR, skip for now
        }
        if (author && metadata?.userId !== author) {
          return false;
        }
        return true;
      });
    }

    return paginatedResponse(
      filteredRuns.map((r) => ({
        id: r.id,
        correlationId: r.correlationId,
        repositoryId: r.repositoryId,
        sandboxId: r.sandboxId,
        trigger: r.trigger,
        status: r.status,
        conclusion: r.conclusion,
        reviewGuardStatus: r.reviewGuardStatus,
        testEngineStatus: r.testEngineStatus,
        docSyncStatus: r.docSyncStatus,
        reviewGuardResult: r.reviewGuardResult,
        testEngineResult: r.testEngineResult,
        docSyncResult: r.docSyncResult,
        aiTouchedDetected: r.aiTouchedDetected,
        aiTouchedFiles: r.aiTouchedFiles,
        gatesPassed: r.gatesPassed,
        gatesFailed: r.gatesFailed,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        reviewGuardStartedAt: r.reviewGuardStartedAt,
        reviewGuardCompletedAt: r.reviewGuardCompletedAt,
        testEngineStartedAt: r.testEngineStartedAt,
        testEngineCompletedAt: r.testEngineCompletedAt,
        docSyncStartedAt: r.docSyncStartedAt,
        docSyncCompletedAt: r.docSyncCompletedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        repository: r.repository,
      })),
      branch || author ? filteredRuns.length : total,
      limit,
      offset
    );
  },
  { authz: { requiredScopes: ['read'] } }
);
