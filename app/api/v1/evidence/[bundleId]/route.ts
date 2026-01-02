/**
 * Evidence Bundle Detail API
 * 
 * GET    /api/v1/evidence/:bundleId - Get evidence bundle
 * GET    /api/v1/evidence/:bundleId/export - Export evidence JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';

/**
 * GET /api/v1/evidence/:bundleId
 * Get evidence bundle details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bundleId: string } }
) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, bundleId: params.bundleId });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bundle = await prisma.evidenceBundle.findUnique({
      where: { id: params.bundleId },
      include: {
        review: {
          select: {
            id: true,
            repositoryId: true,
            prNumber: true,
            prSha: true,
            repository: {
              select: {
                organizationId: true,
              },
            },
          },
        },
        test: {
          select: {
            id: true,
            repositoryId: true,
            repository: {
              select: {
                organizationId: true,
              },
            },
          },
        },
        doc: {
          select: {
            id: true,
            repositoryId: true,
            repository: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!bundle) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Evidence bundle not found',
          },
        },
        { status: 404 }
      );
    }

    // Determine organization ID from associated resource
    let organizationId: string | null = null;
    if (bundle.review?.repository?.organizationId) {
      organizationId = bundle.review.repository.organizationId;
    } else if (bundle.test?.repository?.organizationId) {
      organizationId = bundle.test.repository.organizationId;
    } else if (bundle.doc?.repository?.organizationId) {
      organizationId = bundle.doc.repository.organizationId;
    }

    if (!organizationId) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Could not determine organization for evidence bundle',
          },
        },
        { status: 404 }
      );
    }

    // Verify user belongs to organization (tenant isolation)
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
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to evidence bundle',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: bundle.id,
      reviewId: bundle.reviewId,
      testId: bundle.testId,
      docId: bundle.docId,
      inputsMetadata: bundle.inputsMetadata,
      rulesFired: bundle.rulesFired,
      deterministicScore: Number(bundle.deterministicScore),
      artifacts: bundle.artifacts,
      policyChecksum: bundle.policyChecksum,
      toolVersions: bundle.toolVersions,
      timings: bundle.timings,
      createdAt: bundle.createdAt,
    });
  } catch (error) {
    log.error(error, 'Failed to get evidence bundle');
    return NextResponse.json(
      {
        error: {
          code: 'GET_EVIDENCE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

