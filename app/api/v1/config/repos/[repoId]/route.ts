import { NextRequest, NextResponse } from 'next/server';
import { configService } from '../../../../../../services/config';
import { logger } from '../../../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

/**
 * GET /api/v1/config/repos/:repoId
 * Get repository configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    // Check authorization
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const config = await configService.getRepositoryConfig(params.repoId);

    return NextResponse.json({ config });
  } catch (error) {
    log.error('Failed to get repository config', error);
    return NextResponse.json(
      {
        error: {
          code: 'GET_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/config/repos/:repoId
 * Update repository configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    // Check authorization (requires write scope)
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json();
    const { config, rawConfig } = body;

    // Validate and update config
    await configService.updateRepositoryConfig(params.repoId, config, rawConfig);

    log.info('Repository config updated', { repoId: params.repoId });

    return NextResponse.json({
      id: params.repoId,
      config,
      updatedAt: new Date(),
    });
  } catch (error) {
    log.error('Failed to update repository config', error);
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 400 }
    );
  }
}
