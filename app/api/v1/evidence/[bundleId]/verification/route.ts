import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';

const EVIDENCE_TTL_DAYS = 30;

/**
 * Customer/operator-safe verification summary.
 *
 * This is a point-in-time evidence statement, not a production-readiness
 * certification. The response deliberately includes expiry and limitations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> },
): Promise<NextResponse> {
  const { bundleId } = await params;

  try {
    const user = await requireAuth(request);
    const authzResponse = await createAuthzMiddleware({ requiredScopes: ['read'] })(request);
    if (authzResponse) return authzResponse;

    const bundle = await prisma.evidenceBundle.findUnique({
      where: { id: bundleId },
      select: {
        id: true,
        reviewId: true,
        testId: true,
        docId: true,
        inputsMetadata: true,
        rulesFired: true,
        policyChecksum: true,
        toolVersions: true,
        createdAt: true,
        review: { select: { repository: { select: { organizationId: true } } } },
        test: { select: { repository: { select: { organizationId: true } } } },
        doc: { select: { repository: { select: { organizationId: true } } } },
      },
    });

    if (!bundle) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Evidence bundle not found' } }, { status: 404 });

    const organizationId = bundle.review?.repository.organizationId
      ?? bundle.test?.repository.organizationId
      ?? bundle.doc?.repository.organizationId;
    if (!organizationId) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Evidence tenant could not be resolved' } }, { status: 404 });

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      select: { organizationId: true },
    });
    if (!membership) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied to evidence bundle' } }, { status: 403 });

    const expiresAt = new Date(bundle.createdAt.getTime() + EVIDENCE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const rules = Array.isArray(bundle.rulesFired) ? bundle.rulesFired : [];
    const status = rules.length === 0 ? 'pass' : 'review_required';

    return NextResponse.json({
      verificationVersion: '1.0.0',
      status,
      tenant: { organizationId },
      evidence: {
        bundleId: bundle.id,
        source: { reviewId: bundle.reviewId, testId: bundle.testId, docId: bundle.docId },
        capturedAt: bundle.createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        expired: now >= expiresAt,
      },
      policy: {
        status,
        checksEvaluated: rules.length,
        rulesFired: rules,
        policyChecksum: bundle.policyChecksum,
      },
      provenance: {
        inputsMetadata: bundle.inputsMetadata,
        toolVersions: bundle.toolVersions,
        policyChecksum: bundle.policyChecksum,
      },
      limitations: [
        'Point-in-time evidence only; it does not certify production readiness or ongoing compliance.',
        'Expiry is derived from the evidence capture time and must be re-verified after expiry.',
        'This summary does not replace human review, deployment controls, or independent validation.',
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication or verification failed';
    const status = message.toLowerCase().includes('auth') || message.toLowerCase().includes('session') ? 401 : 500;
    return NextResponse.json({ error: { code: status === 401 ? 'UNAUTHORIZED' : 'VERIFICATION_FAILED', message } }, { status });
  }
}
