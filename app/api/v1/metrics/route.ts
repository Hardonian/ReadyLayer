/**
 * Metrics API
 * 
 * GET /api/v1/metrics - Get readiness metrics
 */

import { prisma } from '../../../../lib/prisma';
import {
  createRouteHandler,
  errorResponse,
  successResponse,
  RouteContext,
} from '../../../../lib/api-route-helpers';
import type { Prisma } from '@prisma/client';
import { calculateReadinessMetrics } from '../../../../lib/readiness-metrics';

export const GET = createRouteHandler(
  async (context: RouteContext) => {
    const { request, user, log } = context;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const repositoryId = searchParams.get('repositoryId');

    if (!organizationId) {
      return errorResponse('VALIDATION_ERROR', 'Organization ID required', 400);
    }

    // Verify access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    try {
      // Get recent runs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const where: Prisma.ReadyLayerRunWhereInput = {
        repository: {
          organizationId,
        },
        createdAt: { gte: thirtyDaysAgo },
      };

      if (repositoryId) {
        where.repositoryId = repositoryId;
      }

      const repoScope: { repositoryId?: string } = repositoryId ? { repositoryId } : {};
      const [runs, supplyChainViolations, provenancePacks] = await Promise.all([
        prisma.readyLayerRun.findMany({
          where,
          select: {
            aiTouchedDetected: true,
            gatesPassed: true,
            status: true,
            testEngineResult: true,
            docSyncResult: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
        }),
        prisma.violation.count({
          where: {
            ...repoScope,
            repository: { organizationId },
            detectedAt: { gte: thirtyDaysAgo },
            OR: [
              { ruleId: { contains: 'supply', mode: 'insensitive' } },
              { ruleId: { contains: 'dependenc', mode: 'insensitive' } },
              { ruleId: { contains: 'slopsquat', mode: 'insensitive' } },
            ],
          },
        }),
        prisma.provenancePack.count({
          where: {
            organizationId,
            ...repoScope,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      const metrics = calculateReadinessMetrics(runs, {
        supplyChainViolations,
        provenancePacks,
      });

      log.info({ organizationId, repositoryId: repositoryId || undefined }, 'Metrics calculated');

      return successResponse({ metrics });
    } catch (error) {
      log.error(error, 'Failed to calculate metrics');
      return errorResponse(
        'METRICS_CALCULATION_FAILED',
        'Readiness metrics could not be calculated. Retry the request or inspect recent runs.',
        500
      );
    }
  },
  { authz: { requiredScopes: ['read'] } }
);
