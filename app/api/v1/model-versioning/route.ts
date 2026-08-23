/**
 * Model Versioning and A/B Testing API Route
 * 
 * GET /api/v1/model-versioning - List registered models and active A/B experiments
 * POST /api/v1/model-versioning - Register model, create experiment, or route inference
 */

import { NextRequest, NextResponse } from 'next/server';
import { modelRegistry, type ModelVersion } from '@/services/model-versioning';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';
import { logger } from '@/observability/logging';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'model-versioning' });

  try {
    await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get('modelType');

    const versionManager = modelRegistry.getVersionManager();

    const versions = modelType
      ? versionManager.listVersions(modelType)
      : [];

    log.info({ modelType }, 'Fetched model versions and experiments');

    return NextResponse.json({
      data: {
        modelType,
        versions,
        totalVersions: versions.length,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to list model versions');
    return NextResponse.json(
      {
        error: {
          code: 'MODEL_VERSION_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'model-versioning' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json() as {
      action: 'register' | 'promote' | 'create_experiment' | 'route_inference';
      modelVersion?: Omit<ModelVersion, 'status'>;
      versionId?: string;
      targetEnv?: 'staging' | 'production';
      experiment?: {
        name: string;
        modelA: string;
        modelB: string;
        trafficSplit: number;
        primaryMetric: string;
        secondaryMetrics?: string[];
      };
      routing?: {
        modelType: string;
        userId?: string;
        experimentId?: string;
      };
    };

    const versionManager = modelRegistry.getVersionManager();
    const abTestManager = modelRegistry.getABTestManager();

    if (body.action === 'register') {
      if (!body.modelVersion) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'modelVersion payload is required' } },
          { status: 400 }
        );
      }
      const registered = versionManager.registerVersion(body.modelVersion);
      log.info({ versionId: registered.id, version: registered.version }, 'Registered model version');
      return NextResponse.json({ data: registered });
    }

    if (body.action === 'promote') {
      if (!body.versionId) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'versionId is required' } },
          { status: 400 }
        );
      }
      const promoted = body.targetEnv === 'staging'
        ? versionManager.promoteToStaging(body.versionId)
        : versionManager.promoteToProduction(body.versionId);
      return NextResponse.json({ data: promoted });
    }

    if (body.action === 'create_experiment') {
      if (!body.experiment) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'experiment payload is required' } },
          { status: 400 }
        );
      }
      const created = abTestManager.createExperiment({
        name: body.experiment.name,
        modelA: body.experiment.modelA,
        modelB: body.experiment.modelB,
        trafficSplit: body.experiment.trafficSplit,
        confidenceLevel: 0.95,
        minimumSampleSize: 100,
        primaryMetric: body.experiment.primaryMetric,
        secondaryMetrics: body.experiment.secondaryMetrics || [],
      });
      return NextResponse.json({ data: created });
    }

    if (body.action === 'route_inference') {
      if (!body.routing?.modelType) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'routing.modelType is required' } },
          { status: 400 }
        );
      }
      const routed = modelRegistry.getModelForInference(
        body.routing.modelType,
        body.routing.userId || user.id,
        body.routing.experimentId
      );
      return NextResponse.json({ data: routed });
    }

    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: `Unknown action: ${body.action}` } },
      { status: 400 }
    );
  } catch (error) {
    log.error({ err: error }, 'Model versioning action failed');
    return NextResponse.json(
      {
        error: {
          code: 'MODEL_VERSIONING_ACTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
