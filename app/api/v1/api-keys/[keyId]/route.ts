import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';

/**
 * DELETE /api/v1/api-keys/:keyId
 * Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, keyId: params.keyId });

  try {
    // Require authentication
    const user = await requireAuth(request);

    // Verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: params.keyId },
    });

    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { status: 404 }
      );
    }

    if (apiKey.userId !== user.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        },
        { status: 403 }
      );
    }

    // Revoke key
    await prisma.apiKey.update({
      where: { id: params.keyId },
      data: { isActive: false },
    });

    log.info({ keyId: params.keyId }, 'API key revoked');

    return NextResponse.json({ revoked: true });
  } catch (error) {
    log.error(error, 'Failed to revoke API key');
    return NextResponse.json(
      {
        error: {
          code: 'REVOKE_API_KEY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
