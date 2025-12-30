import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';

/**
 * GET /api/v1/repos/:repoId
 * Get repository details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
      include: {
        organization: true,
        configs: true,
      },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${params.repoId} not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      provider: repo.provider,
      url: repo.url,
      enabled: repo.enabled,
      config: repo.configs[0]?.config || {},
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    });
  } catch (error) {
    log.error('Failed to get repository', error);
    return NextResponse.json(
      {
        error: {
          code: 'GET_REPO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/repos/:repoId
 * Update repository config
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, repoId: params.repoId });

  try {
    const body = await request.json();
    const { config } = body;

    // Validate config
    if (config && typeof config !== 'object') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Config must be an object',
          },
        },
        { status: 400 }
      );
    }

    // Update or create config
    const repo = await prisma.repository.findUnique({
      where: { id: params.repoId },
    });

    if (!repo) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Repository ${params.repoId} not found`,
          },
        },
        { status: 404 }
      );
    }

    await prisma.repositoryConfig.upsert({
      where: { repositoryId: params.repoId },
      update: {
        config,
        version: { increment: 1 },
      },
      create: {
        repositoryId: params.repoId,
        config,
      },
    });

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
          code: 'UPDATE_REPO_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
