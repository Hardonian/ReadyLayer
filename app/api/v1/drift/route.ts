/**
 * Feature Drift Detection API Route
 * 
 * POST /api/v1/drift - Detect statistical feature distribution drift
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureDriftDetector, type FeatureDistribution, type FeatureDriftConfig } from '@/services/feature-drift-detection';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';
import { logger } from '@/observability/logging';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'feature-drift' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json() as {
      distributions?: FeatureDistribution[];
      config?: FeatureDriftConfig;
    };

    if (!body.distributions || !Array.isArray(body.distributions) || body.distributions.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'distributions array is required' } },
        { status: 400 }
      );
    }

    const results = featureDriftDetector.detectDrift(body.distributions);
    const summary = featureDriftDetector.getDriftSummary(results);

    log.info({
      userId: user.id,
      featuresCount: body.distributions.length,
      overallHealth: summary.overallHealth,
      driftCount: summary.driftDetectedCount,
    }, 'Feature drift detection executed');

    return NextResponse.json({
      data: {
        results,
        summary,
        evaluatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Feature drift evaluation failed');
    return NextResponse.json(
      {
        error: {
          code: 'DRIFT_EVALUATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
