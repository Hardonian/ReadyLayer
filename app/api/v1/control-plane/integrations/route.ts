import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { errorResponse, successResponse, validateBody, parsePagination } from '../../../../../lib/api-route-helpers';

const integrationSchema = z.object({
  type: z.enum(['cli', 'cursor', 'vscode', 'tabnine', 'jetbrains']),
  name: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/v1/control-plane/integrations
 * List all integrations for the user/organization
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

    // Get user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    // For now, return mock integrations (would be stored in DB)
    // In production, you'd have an Integration model
    const integrations = [
      {
        id: 'cli-1',
        type: 'cli',
        name: 'ReadyLayer CLI',
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'cursor-1',
        type: 'cursor',
        name: 'Cursor Integration',
        enabled: true,
        createdAt: new Date(),
      },
    ];

    return successResponse({ integrations });
  } catch (error) {
    log.error(error, 'Failed to list integrations');
    return errorResponse(
      'LIST_INTEGRATIONS_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

/**
 * POST /api/v1/control-plane/integrations
 * Register a new integration
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bodyResult = await validateBody(
      await request.json().catch(() => null),
      integrationSchema
    );
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const { type, name, config, enabled } = bodyResult.data;

    // In production, create Integration record in DB
    const integration = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      config: config || {},
      enabled,
      userId: user.id,
      createdAt: new Date(),
    };

    log.info({ integrationId: integration.id, type }, 'Integration registered');

    return successResponse(integration, 201);
  } catch (error) {
    log.error(error, 'Failed to register integration');
    return errorResponse(
      'REGISTER_INTEGRATION_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
