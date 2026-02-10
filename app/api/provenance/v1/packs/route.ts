import { createRouteHandler, errorResponse, RouteContext, successResponse } from '@/lib/api-route-helpers';
import { prisma } from '@/lib/prisma';

export const GET = createRouteHandler(async (context: RouteContext) => {
  const { searchParams } = new URL(context.request.url);
  const runId = searchParams.get('runId');
  const correlationId = searchParams.get('correlationId');
  const repo = searchParams.get('repo');
  const prNumber = searchParams.get('prNumber');

  const memberships = await prisma.organizationMember.findMany({ where: { userId: context.user.id }, select: { organizationId: true } });
  const orgIds = memberships.map((m) => m.organizationId);
  if (!orgIds.length) return successResponse({ packs: [] });

  const where: {
    organizationId: { in: string[] };
    runId?: string;
    correlationId?: string;
    repository?: { fullName: string };
    prNumber?: number;
  } = {
    organizationId: { in: orgIds },
  };

  if (runId) where.runId = runId;
  if (correlationId) where.correlationId = correlationId;
  if (repo) where.repository = { fullName: repo };
  if (prNumber) where.prNumber = Number(prNumber);

  const packs = await prisma.provenancePack.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      artifacts: {
        select: { id: true, kind: true, mimeType: true, contentHash: true, createdAt: true },
      },
    },
  });

  return successResponse({
    packs: packs.map((pack) => ({
      id: pack.id,
      runId: pack.runId,
      correlationId: pack.correlationId,
      source: pack.source,
      sourceSystem: pack.sourceSystem,
      redactionLevel: pack.redactionLevel,
      payloadHash: pack.payloadHash,
      safeSummary: pack.safeSummary,
      createdAt: pack.createdAt,
      artifacts: pack.artifacts,
    })),
  });
}, { authz: { requiredScopes: ['read'] } });

export const POST = createRouteHandler(async () => {
  return errorResponse('METHOD_NOT_ALLOWED', 'Use /api/provenance/v1/ingest for provenance ingestion', 405);
});
