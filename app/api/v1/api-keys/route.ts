export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, generateApiKey } from '../../../../lib/auth';
import { logger } from '../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../lib/authz';

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Check authorization (requires write scope for API key creation)
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json();
    const { name, scopes, expiresAt } = body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: name, scopes',
          },
        },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, id } = await generateApiKey(
      user.id,
      name,
      scopes,
      expiresAt ? new Date(expiresAt) : undefined
    );

    log.info({ userId: user.id, keyId: id }, 'API key created');

    // Return key only once (would store securely in production)
    return NextResponse.json(
      {
        id,
        name,
        scopes,
        key, // Only returned on creation
        expiresAt: expiresAt || null,
        createdAt: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    log.error(error, 'Failed to create API key');
    return NextResponse.json(
      {
        error: {
          code: 'CREATE_API_KEY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/api-keys
 * List API keys for authenticated user
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    const { prisma } = await import('../../../../lib/prisma');
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        // Never return keyHash or actual key
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    log.error(error, 'Failed to list API keys');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_API_KEYS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
