import { createRouteHandler, errorResponse, RouteContext, successResponse } from '@/lib/api-route-helpers';
import { canIngestExternal, getApiKeyScopesFromRequest, getMembershipRole } from '@/lib/provenance-auth';
import { prisma } from '@/lib/prisma';

export const GET = createRouteHandler(async (context: RouteContext) => {
  const id = context.request.url.split('/').slice(-1)[0].split('?')[0];
  if (!id) return errorResponse('VALIDATION_ERROR', 'Pack id is required', 400);

  const includeRaw = new URL(context.request.url).searchParams.get('raw') === 'true';

  const pack = await prisma.provenancePack.findUnique({
    where: { id },
    include: { artifacts: true },
  });

  if (!pack) return errorResponse('NOT_FOUND', 'Provenance pack not found', 404);

  const role = await getMembershipRole(context.user.id, pack.organizationId);
  if (!role) return errorResponse('FORBIDDEN', 'Access denied to provenance pack', 403);

  const scopes = await getApiKeyScopesFromRequest(context.request);
  const canViewRaw = canIngestExternal(role, scopes);

  return successResponse({
    id: pack.id,
    runId: pack.runId,
    correlationId: pack.correlationId,
    source: pack.source,
    sourceSystem: pack.sourceSystem,
    agent: pack.agent,
    redactionLevel: pack.redactionLevel,
    payloadHash: pack.payloadHash,
    promptHashes: pack.promptHashes,
    toolCallSummary: pack.toolCallSummary,
    safeSummary: pack.safeSummary,
    payload: includeRaw && canViewRaw ? pack.payload : pack.safeSummary,
    payloadAccess: includeRaw && canViewRaw ? 'raw' : 'redacted',
    artifacts: pack.artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      mimeType: artifact.mimeType,
      contentHash: artifact.contentHash,
      content: includeRaw && canViewRaw ? artifact.content : null,
      json: includeRaw && canViewRaw ? artifact.jsonContent : null,
      createdAt: artifact.createdAt,
    })),
    createdAt: pack.createdAt,
  });
}, { authz: { requiredScopes: ['read'] } });
