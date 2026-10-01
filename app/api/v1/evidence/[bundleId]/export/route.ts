import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
): Promise<NextResponse> {
  const { bundleId } = await params;

  try {
    const bundle = await prisma.evidenceBundle.findUnique({
      where: { id: bundleId },
      include: {
        review: true,
        test: true,
        doc: true,
      },
    });

    if (!bundle) {
      return NextResponse.json({ error: 'Evidence bundle not found' }, { status: 404 });
    }

    // Fetch related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceId: bundle.reviewId || undefined },
          { resourceId: bundle.testId || undefined },
          { resourceId: bundle.docId || undefined },
          { resourceId: bundle.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const auditTrail = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      hash: log.hash,
      previousHash: log.previousHash,
      signature: log.signature,
    }));

    const rawBundleJson = JSON.stringify(bundle);
    const rawAuditJson = JSON.stringify(auditTrail);

    const bundleHash = createHash('sha256').update(rawBundleJson).digest('hex');
    const auditTrailHash = createHash('sha256').update(rawAuditJson).digest('hex');
    const manifestHash = createHash('sha256')
      .update(`${bundle.id}:${bundleHash}:${auditTrailHash}:${bundle.policyChecksum}`)
      .digest('hex');

    // Create the canonical tamper-evident evidence pack structure
    const evidencePack = {
      specVersion: 'readylayer-evidence-v1',
      meta: {
        generatedAt: new Date().toISOString(),
        bundleId: bundle.id,
        policyChecksum: bundle.policyChecksum,
        deterministicScore: bundle.deterministicScore,
      },
      manifest: {
        bundleHash,
        auditTrailHash,
        manifestHash,
        algorithm: 'SHA-256',
      },
      bundle,
      auditTrail,
      integrity: {
        signedStatement: `VERIFIED_BY_READYLAYER_SHA256:${manifestHash}`,
      },
    };

    return new NextResponse(JSON.stringify(evidencePack, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="readylayer-evidence-${bundleId}.json"`,
        'X-Evidence-Manifest-Hash': manifestHash,
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
