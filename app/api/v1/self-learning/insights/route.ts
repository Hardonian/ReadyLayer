/**
 * Self-Learning Insights API
 * 
 * GET /api/v1/self-learning/insights - Get aggregated insights and predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { selfLearningService } from '../../../../../services/self-learning';
import { predictiveDetectionService } from '../../../../../services/predictive-detection';

/**
 * GET /api/v1/self-learning/insights
 * Get aggregated insights and predictions
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const organizationId = searchParams.get('organizationId');
    const insightType = searchParams.get('insightType') as
      | 'pattern'
      | 'anomaly'
      | 'optimization'
      | 'prediction'
      | undefined;

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        insights: [],
        predictions: [],
        modelPerformance: [],
      });
    }

    // Determine target organization
    let targetOrganizationId: string;
    if (organizationId && userOrgIds.includes(organizationId)) {
      targetOrganizationId = organizationId;
    } else {
      targetOrganizationId = userOrgIds[0];
    }

    // Verify repository access if specified
    if (repositoryId) {
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { organizationId: true },
      });

      if (!repo || !userOrgIds.includes(repo.organizationId)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied' } },
          { status: 403 }
        );
      }
    }

    // Get aggregated insights
    const insights = await selfLearningService.generateInsights(
      targetOrganizationId,
      insightType
    );

    // Get predictive alerts
    const predictions = await predictiveDetectionService.predictIssues({
      repositoryId: repositoryId || undefined,
      organizationId: targetOrganizationId,
    });

    // Get model performance metrics
    const modelPerformance = await selfLearningService.getModelPerformance(
      targetOrganizationId
    );

    return NextResponse.json({
      insights: insights.map((i) => ({
        id: i.id,
        type: i.insightType,
        confidence: Number(i.confidence),
        trustLevel: Number(i.trustLevel),
        dataPoints: i.dataPoints,
        firstSeen: i.firstSeen,
        lastSeen: i.lastSeen,
        trend: i.trend,
        metadata: i.metadata,
      })),
      predictions: predictions.map((p) => ({
        id: p.id,
        type: p.type,
        severity: p.severity,
        confidence: {
          finalConfidence: p.confidence.finalConfidence,
          trustLevel: p.confidence.trustLevel,
        },
        prediction: p.prediction,
        rationale: p.rationale,
        suggestedAction: p.suggestedAction,
        estimatedLikelihood: p.estimatedLikelihood,
        historicalAccuracy: p.historicalAccuracy,
        dataPoints: p.dataPoints,
      })),
      modelPerformance: modelPerformance.map((m) => ({
        modelId: m.modelId,
        provider: m.provider,
        totalRequests: m.totalRequests,
        successRate: m.successfulRequests / m.totalRequests,
        averageResponseTime: m.averageResponseTime,
        averageTokensUsed: m.averageTokensUsed,
        averageCost: m.averageCost,
        accuracyScore: m.accuracyScore,
        confidenceScore: m.confidenceScore,
        trustScore: m.trustScore,
        lastUpdated: m.lastUpdated,
      })),
    });
  } catch (error) {
    log.error(error, 'Failed to get self-learning insights');
    return NextResponse.json(
      {
        error: {
          code: 'INSIGHTS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
