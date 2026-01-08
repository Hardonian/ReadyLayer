/**
 * Evidence Bundle Export API
 *
 * GET /api/v1/evidence/:bundleId/export
 *
 * SECURITY:
 * - Requires authentication + read scope
 * - Enforces tenant isolation by verifying org membership from the linked repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { bundleId: string } }
) {
  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) return authzResponse;

    const { bundleId } = params;

    const bundle = await prisma.evidenceBundle.findUnique({
      where: { id: bundleId },
      include: {
        review: {
          include: {
            repository: { select: { organizationId: true } },
          },
        },
        test: {
          include: {
            repository: { select: { organizationId: true } },
          },
        },
        doc: {
          include: {
            repository: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!bundle) {
      return NextResponse.json({ error: 'Evidence bundle not found' }, { status: 404 });
    }

    const organizationId =
      bundle.review?.repository?.organizationId ||
      bundle.test?.repository?.organizationId ||
      bundle.doc?.repository?.organizationId ||
      null;

    if (!organizationId) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Could not determine organization for evidence bundle' } },
        { status: 404 }
      );
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to evidence bundle' } },
        { status: 403 }
      );
    }

    // Fetch related audit logs
    // Note: We use the creation time window to find relevant logs if runId is not present,
    // but ideally we should link by runId.
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        OR: [
          { resourceId: bundle.reviewId || undefined },
          { resourceId: bundle.testId || undefined },
          { resourceId: bundle.docId || undefined },
          { resourceId: bundle.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Create the canonical evidence pack structure
    const evidencePack = {
      meta: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        bundleId: bundle.id,
      },
      bundle,
      auditTrail: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        timestamp: log.createdAt,
        hash: log.hash,
        previousHash: log.previousHash,
        signature: log.signature,
      })),
      integrity: {
        // Calculate a hash of the bundle content to prove it hasn't changed since export
        contentHash: createHash('sha256').update(JSON.stringify(bundle)).digest('hex'),
      },
    };

    return new NextResponse(JSON.stringify(evidencePack, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="readylayer-evidence-${bundleId}.json"`,
      },
    });

  } catch (error) {
    console.error('Failed to export evidence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
