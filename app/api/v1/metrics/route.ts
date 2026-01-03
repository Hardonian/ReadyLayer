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

      const where: any = {
        repository: {
          organizationId,
        },
        createdAt: { gte: thirtyDaysAgo },
      };

      if (repositoryId) {
        where.repositoryId = repositoryId;
      }

      const runs = await prisma.readyLayerRun.findMany({
        where,
        include: {
          review: true,
        },
      });

      // Calculate metrics
      const aiTouchedPercentage =
        runs.length > 0
          ? runs.filter((r) => r.aiTouchedDetected).length / runs.length
          : 0;

      const gatePassRate =
        runs.length > 0
          ? runs.filter((r) => r.gatesPassed).length / runs.length
          : 1;

      // Coverage delta (would calculate from test engine results)
      const coverageDelta = 0; // Placeholder

      // Doc drift incidents
      const docDriftIncidents = runs.filter(
        (r) => (r.docSyncResult as any)?.driftDetected
      ).length;

      // Mean time to safe merge (would calculate from timestamps)
      const meanTimeToSafeMerge = 45; // Placeholder (minutes)

      // Risk score trend (would calculate from historical data)
      const riskScoreTrend = 0; // Placeholder (-1 to 1)

      const metrics = {
        aiTouchedPercentage,
        riskScoreTrend,
        gatePassRate,
        coverageDelta,
        docDriftIncidents,
        meanTimeToSafeMerge,
      };

      log.info({ organizationId, repositoryId: repositoryId || undefined }, 'Metrics calculated');

      return successResponse({ metrics });
    } catch (error) {
      log.error(error, 'Failed to calculate metrics');
      return errorResponse(
        'METRICS_CALCULATION_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  },
  { authz: { requiredScopes: ['read'] } }
);
