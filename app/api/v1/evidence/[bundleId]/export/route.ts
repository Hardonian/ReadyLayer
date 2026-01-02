/**
 * Evidence Bundle Export API
 * 
 * GET /api/v1/evidence/:bundleId/export - Export evidence JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { logger } from '../../../../../../observability/logging';
import { requireAuth } from '../../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../../lib/authz';
import { policyEngineService } from '../../../../../../services/policy-engine';

/**
 * GET /api/v1/evidence/:bundleId/export
 * Export evidence bundle in stable JSON format
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

    // Determine organization ID
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

    // Verify user belongs to organization
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

    // Load policy pack for export
    const policyPack = await prisma.policyPack.findFirst({
      where: { checksum: bundle.policyChecksum },
      include: { rules: true },
    });

    if (!policyPack) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Policy pack not found for evidence bundle',
          },
        },
        { status: 404 }
      );
    }

    // Build effective policy
    const policy = await policyEngineService.loadEffectivePolicy(
      policyPack.organizationId,
      policyPack.repositoryId,
      undefined,
      undefined
    );

    // Export evidence
    const evidenceBundle = {
      id: bundle.id,
      reviewId: bundle.reviewId || undefined,
      testId: bundle.testId || undefined,
      docId: bundle.docId || undefined,
      inputsMetadata: bundle.inputsMetadata as Record<string, unknown>,
      rulesFired: bundle.rulesFired as string[],
      deterministicScore: Number(bundle.deterministicScore),
      artifacts: bundle.artifacts as Record<string, string> | undefined,
      policyChecksum: bundle.policyChecksum,
      toolVersions: bundle.toolVersions as Record<string, string> | undefined,
      timings: bundle.timings as Record<string, number> | undefined,
      createdAt: bundle.createdAt,
    };

    const exportData = policyEngineService.exportEvidence(
      evidenceBundle,
      policy,
      bundle.inputsMetadata as Record<string, unknown>,
      {
        findings: [],
        evaluationResult: {
          blocked: false,
          score: Number(bundle.deterministicScore),
          rulesFired: bundle.rulesFired as string[],
          waivedFindings: [],
          nonWaivedFindings: [],
        },
      }
    );

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="evidence-${params.bundleId}.json"`,
      },
    });
  } catch (error) {
    log.error(error, 'Failed to export evidence bundle');
    return NextResponse.json(
      {
        error: {
          code: 'EXPORT_EVIDENCE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
