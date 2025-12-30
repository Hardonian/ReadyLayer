import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../observability/logging';

const prisma = new PrismaClient();

/**
 * GET /api/v1/repos
 * List repositories
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [repos, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          organization: true,
        },
      }),
      prisma.repository.count({ where }),
    ]);

    return NextResponse.json({
      repositories: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        provider: repo.provider,
        url: repo.url,
        enabled: repo.enabled,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error('Failed to list repositories', error);
    return NextResponse.json(
      {
        error: {
          code: 'LIST_REPOS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
