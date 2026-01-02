/**
 * Evidence Bundle List API
 * 
 * GET /api/v1/evidence - List evidence bundles (filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';

/**
 * GET /api/v1/evidence
 * List evidence bundles (tenant-isolated)
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

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const repositoryId = searchParams.get('repositoryId');
    const reviewId = searchParams.get('reviewId');
    const testId = searchParams.get('testId');
    const docId = searchParams.get('docId');
    const policyChecksum = searchParams.get('policyChecksum');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's organization memberships for tenant isolation
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        evidence: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // Build where clause with tenant isolation
    // We need to filter by organization through related resources
    const where: Record<string, unknown> = {};

    if (reviewId) {
      where.reviewId = reviewId;
    }
    if (testId) {
      where.testId = testId;
    }
    if (docId) {
      where.docId = docId;
    }
    if (policyChecksum) {
      where.policyChecksum = policyChecksum;
    }

    // Get bundles and filter by organization access
    const bundles = await prisma.evidenceBundle.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        review: {
          select: {
            repositoryId: true,
            repository: {
              select: {
                organizationId: true,
              },
            },
          },
        },
        test: {
          select: {
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
            repositoryId: true,
            repository: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by organization access
    const filteredBundles = bundles.filter((bundle) => {
      let bundleOrgId: string | null = null;
      if (bundle.review?.repository?.organizationId) {
        bundleOrgId = bundle.review.repository.organizationId;
      } else if (bundle.test?.repository?.organizationId) {
        bundleOrgId = bundle.test.repository.organizationId;
      } else if (bundle.doc?.repository?.organizationId) {
        bundleOrgId = bundle.doc.repository.organizationId;
      }

      if (!bundleOrgId) {
        return false;
      }

      if (organizationId) {
        return bundleOrgId === organizationId && userOrgIds.includes(bundleOrgId);
      }

      if (repositoryId) {
        const bundleRepoId =
          bundle.review?.repositoryId ||
          bundle.test?.repositoryId ||
          bundle.doc?.repositoryId;
        return bundleRepoId === repositoryId && userOrgIds.includes(bundleOrgId);
      }

      return userOrgIds.includes(bundleOrgId);
    });

    // Get total count (approximate, filtered)
    const total = filteredBundles.length;

    return NextResponse.json({
      evidence: filteredBundles.slice(0, limit).map((bundle) => ({
        id: bundle.id,
        reviewId: bundle.reviewId,
        testId: bundle.testId,
        docId: bundle.docId,
        inputsMetadata: bundle.inputsMetadata,
        rulesFired: bundle.rulesFired,
        deterministicScore: Number(bundle.deterministicScore),
        policyChecksum: bundle.policyChecksum,
        createdAt: bundle.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to list evidence bundles');
    return NextResponse.json(
      {
        error: {
          code: 'LIST_EVIDENCE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
