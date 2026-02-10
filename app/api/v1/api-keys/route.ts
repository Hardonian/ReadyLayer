import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, generateApiKey } from '../../../../lib/auth';
import { logger } from '../../../../observability/logging';
import { createAuthzMiddleware } from '../../../../lib/authz';
import { parseJsonBody } from '../../../../lib/api-route-helpers';

// P2-FIX: Use Zod schema for consistent validation (matches pattern in other routes)
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  scopes: z.array(z.enum(['read', 'write', 'admin', 'provenance:write'])).min(1, 'At least one scope is required'),
  expiresAt: z.string().datetime().optional(),
});

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

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    // P2-FIX: Validate with Zod instead of manual type checking
    const validationResult = createApiKeySchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validationResult.error.issues.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { name, scopes, expiresAt } = validationResult.data;

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
