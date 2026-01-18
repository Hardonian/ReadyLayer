import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
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
    // Note: We use the creation time window to find relevant logs if runId is not present,
    // but ideally we should link by runId.
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
