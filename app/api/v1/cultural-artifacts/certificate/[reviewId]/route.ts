/**
 * Merge Confidence Certificate API
 * 
 * GET /api/v1/cultural-artifacts/certificate/[reviewId] - Get certificate for a review
 */

import { NextRequest, NextResponse } from 'next/server';
import { culturalArtifactsService } from '../../../../../../services/cultural-artifacts';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, reviewId: params.reviewId });

  try {
    await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const reviewId = params.reviewId;

    try {
      const certificate = await culturalArtifactsService.generateMergeConfidenceCertificate(reviewId);

      log.info({ reviewId, certificateId: certificate.certificateId }, 'Certificate generated');

      return NextResponse.json({ data: certificate });
    } catch (error) {
      log.error(error, 'Failed to generate certificate');
      return NextResponse.json(
        {
          error: {
            code: 'CERTIFICATE_GENERATION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error(error, 'Request failed');
    return NextResponse.json(
      {
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
