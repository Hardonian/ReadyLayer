/**
 * AI Risk Exposure Index API
 * 
 * GET /api/v1/cultural-artifacts/risk-index/[organizationId] - Get risk index
 */

import { NextRequest, NextResponse } from 'next/server';
import { culturalArtifactsService } from '../../../../../../services/cultural-artifacts';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, organizationId: params.organizationId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const organizationId = params.organizationId;

    // Verify access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const index = await culturalArtifactsService.calculateAIRiskExposureIndex(organizationId);

    log.info({ organizationId, index: index.index }, 'Risk index calculated');

    return NextResponse.json({ data: index });
  } catch (error) {
    log.error(error, 'Failed to calculate risk index');
    return NextResponse.json(
      {
        error: {
          code: 'INDEX_CALCULATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
