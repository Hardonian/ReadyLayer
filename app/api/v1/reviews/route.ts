/**
 * Reviews API Routes
 * 
 * POST /api/v1/reviews - Create a new review
 * GET /api/v1/reviews - List reviews (tenant-isolated)
 */

import { reviewGuardService, ReviewConfig } from '../../../../services/review-guard';
import { metrics } from '../../../../observability/metrics';
import { prisma } from '../../../../lib/prisma';
import { UsageLimitExceededError } from '../../../../lib/usage-enforcement';
import {
  createRouteHandler,
  parseJsonBody,
  errorResponse,
  successResponse,
  parsePagination,
  paginatedResponse,
  RouteContext,
} from '../../../../lib/api-route-helpers';
import { promiseAllWithTimeout } from '../../../../lib/db-timeout';
import { z } from 'zod';

// Validation schemas
const reviewFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  beforeContent: z.string().nullable().optional(),
});

const reviewConfigSchema = z.object({
  failOnCritical: z.boolean().optional(),
  failOnHigh: z.boolean().optional(),
  failOnMedium: z.boolean().optional(),
  failOnLow: z.boolean().optional(),
  enabledRules: z.array(z.string()).optional(),
  disabledRules: z.array(z.string()).optional(),
  excludedPaths: z.array(z.string()).optional(),
});

// P3-FIX: API response field filtering schema
const reviewFieldsSchema = z.enum([
  'id',
  'repositoryId',
  'prNumber',
  'prSha',
  'prTitle',
  'status',
  'isBlocked',
  'blockedReason',
  'result',
  'issuesFound',
  'summary',
  'startedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
  'repository',
]);

const createReviewSchema = z.object({
  repositoryId: z.string().min(1),
  prNumber: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'number' ? val : parseInt(String(val), 10)
  ),
  prSha: z.string().min(1),
  prTitle: z.string().optional(),
  diff: z.string().optional(),
  files: z.array(reviewFileSchema).min(1),
  config: reviewConfigSchema.optional(),
});

/**
 * POST /api/v1/reviews
 * Create a new review (tenant-isolated)
 */
export const POST = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;

    // Parse and validate body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validationResult = createReviewSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: validationResult.error.issues }
      );
    }

    const { repositoryId, prNumber, prSha, prTitle, diff, files, config } = validationResult.data;

    // Get repository and verify tenant isolation
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repo) {
      const { ErrorMessages } = await import('../../../../lib/errors');
      const errorInfo = ErrorMessages.NOT_FOUND('Repository', repositoryId);
      return errorResponse(
        'NOT_FOUND',
        errorInfo.message,
        404,
        {
          ...errorInfo.context,
          fix: errorInfo.fix,
        }
      );
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
      const { ErrorMessages } = await import('../../../../lib/errors');
      const errorInfo = ErrorMessages.FORBIDDEN;
      return errorResponse(
        'FORBIDDEN',
        errorInfo.message,
        403,
        {
          repositoryId,
          organizationId: repo.organizationId,
          fix: errorInfo.fix,
        }
      );
    }

    // Check billing limits
    try {
      const { checkBillingLimitsOrThrow } = await import('../../../../lib/billing-middleware');
      await checkBillingLimitsOrThrow(repo.organizationId, {
        requireFeature: 'reviewGuard',
        checkLLMBudget: true,
      });
    } catch (_error) {
      if (_error instanceof UsageLimitExceededError) {
        // Audit log billing limit exceeded
        try {
          const { createAuditLog, AuditActions } = await import('../../../../lib/audit');
          await createAuditLog({
            organizationId: repo.organizationId,
            userId: user.id,
            action: AuditActions.BILLING_LIMIT_EXCEEDED,
            resourceType: 'review',
            details: {
              repositoryId,
              prNumber,
              limitType: 'llm_budget',
            },
          });
        } catch {
          // Don't fail on audit log errors
        }

        // Return 402 Payment Required for budget exceeded, 403 for feature access
        return errorResponse(
          'BILLING_LIMIT_EXCEEDED',
          _error.message,
          _error.httpStatus || 403,
          {
            limitType: _error.limitType,
            currentUsage: _error.currentUsage,
            limit: _error.limit,
          }
        );
      }
      throw _error;
    }

    log.info({ repositoryId, prNumber, userId: user.id }, 'Starting review - billing check passed');

    // Transform config to ReviewConfig format
    const validatedConfig: ReviewConfig | undefined = config ? {
      failOnCritical: config.failOnCritical ?? true,
      failOnHigh: config.failOnHigh ?? true,
      failOnMedium: config.failOnMedium ?? false,
      failOnLow: config.failOnLow ?? false,
      enabledRules: config.enabledRules,
      disabledRules: config.disabledRules,
      excludedPaths: config.excludedPaths,
    } : undefined;

    // Perform review
    const result = await reviewGuardService.review({
      repositoryId,
      prNumber,
      prSha,
      prTitle,
      diff,
      files,
      config: validatedConfig,
    });

    metrics.increment('reviews.completed', { status: result.status });
    if (result.summary.critical > 0) {
      metrics.increment('reviews.issues_found', { severity: 'critical' });
    }
    if (result.summary.high > 0) {
      metrics.increment('reviews.issues_found', { severity: 'high' });
    }

    log.info({
      repositoryId,
      prNumber,
      reviewId: result.id,
      issuesFound: result.summary.total,
      isBlocked: result.isBlocked,
    }, 'Review completed');

    return successResponse(result, 201);
  },
  { authz: { requiredScopes: ['write'] } }
);

/**
 * GET /api/v1/reviews
 * List reviews (tenant-isolated)
 */
export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user } = context;
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const prNumber = searchParams.get('prNumber');
    const { limit, offset } = parsePagination(request);

    // P3-FIX: Parse field selection for response filtering
    const selectParam = searchParams.get('select');
    let selectedFields: string[] | null = null;
    if (selectParam) {
      try {
        const fields = selectParam.split(',').map((f) => f.trim());
        // Validate each field
        fields.forEach((field) => reviewFieldsSchema.parse(field));
        selectedFields = fields;
      } catch (_error) {
        return errorResponse(
          'VALIDATION_ERROR',
          `Invalid field selection. Allowed fields: ${reviewFieldsSchema.options.join(', ')}`,
          400
        );
      }
    }

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return paginatedResponse([], 0, limit, offset);
    }

    // Build where clause with tenant isolation
    const where: {
      repository: { organizationId: { in: string[] } };
      repositoryId?: string;
      prNumber?: number;
    } = {
      repository: {
        organizationId: { in: userOrgIds },
      },
    };

    if (repositoryId) {
      // Verify repository belongs to user's organization
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || !userOrgIds.includes(repo.organizationId)) {
        return errorResponse('FORBIDDEN', 'Access denied to repository', 403);
      }

      where.repositoryId = repositoryId;
    }

    if (prNumber) {
      const parsedPrNumber = parseInt(prNumber, 10);
      if (!isNaN(parsedPrNumber)) {
        where.prNumber = parsedPrNumber;
      }
    }

    const [reviews, total] = await promiseAllWithTimeout([
      prisma.review.findMany({
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
              organizationId: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ] as const, 10000, 'reviews list query');

    // P3-FIX: Filter response fields based on select parameter
    const filteredReviews = reviews.map((r) => {
      const fullReview: Record<string, unknown> = {
        id: r.id,
        repositoryId: r.repositoryId,
        prNumber: r.prNumber,
        prSha: r.prSha,
        prTitle: r.prTitle,
        status: r.status,
        isBlocked: r.isBlocked,
        blockedReason: r.blockedReason,
        result: r.result,
        issuesFound: r.issuesFound,
        summary: r.summary,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        repository: r.repository,
      };

      // If fields selected, filter to only those fields
      if (selectedFields) {
        const filtered: Record<string, unknown> = {};
        selectedFields.forEach((field) => {
          if (field in fullReview) {
            filtered[field] = fullReview[field];
          }
        });
        return filtered;
      }

      // Return minimal fields by default (backward compatible)
      return {
        id: r.id,
        repositoryId: r.repositoryId,
        prNumber: r.prNumber,
        prSha: r.prSha,
        prTitle: r.prTitle,
        status: r.status,
        isBlocked: r.isBlocked,
        blockedReason: r.blockedReason,
        summary: r.summary,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      };
    });

    return paginatedResponse(
      filteredReviews,
      total,
      limit,
      offset
    );
  },
  { authz: { requiredScopes: ['read'] } }
);
