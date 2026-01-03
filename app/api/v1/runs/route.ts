/**
 * Runs API Routes
 * 
 * POST /api/v1/runs - Create and execute a new run
 * GET /api/v1/runs - List runs (tenant-isolated)
 */

import { NextRequest } from 'next/server';
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
        requireFeature: 'runPipeline',
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
    const { limit, offset } = parsePagination(request);

    // Build where clause with tenant isolation
    const where: {
      repository?: { organizationId: { in: string[] } };
      repositoryId?: string;
      sandboxId?: string;
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

    return paginatedResponse(
      runs.map((r) => ({
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
      total,
      limit,
      offset
    );
  },
  { authz: { requiredScopes: ['read'] } }
);
