import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyAuditChain } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/v1/audit/verify
 * 
 * Verifies cryptographic SHA-256 hash chaining of audit logs
 * for tenant isolation and compliance assurance.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      // Find first organization user belongs to
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      organizationId = membership?.organizationId || null;
    } else {
      // Verify user has access to this organization
      const isMember = await prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId,
        },
      });
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'User does not belong to any organization' },
        { status: 400 }
      );
    }

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 5000) : 1000;

    const result = await verifyAuditChain(organizationId, limit);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
