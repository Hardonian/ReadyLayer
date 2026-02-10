import { z } from 'zod';
import { createRouteHandler, errorResponse, parseJsonBody, RouteContext, successResponse } from '@/lib/api-route-helpers';
import { prisma } from '@/lib/prisma';
import { canIngestExternal, getApiKeyScopesFromRequest, getMembershipRole } from '@/lib/provenance-auth';
import { ingestProvenance } from '@/lib/provenance-service';

const bodySchema = z.object({
  repository: z.object({
    provider: z.string().min(1),
    fullName: z.string().min(1),
    providerId: z.string().optional(),
  }).optional(),
  run: z.object({
    correlationId: z.string().optional(),
    runId: z.string().optional(),
    prNumber: z.number().int().optional(),
    prSha: z.string().optional(),
  }).optional(),
  sourceSystem: z.enum(['readylayer', 'checkpoints', 'custom']),
  agent: z.object({ name: z.string().optional(), version: z.string().optional(), provider: z.string().optional() }).passthrough(),
  redactionLevel: z.enum(['none', 'safe', 'strict']).optional(),
  payload: z.object({
    prompts: z.array(z.string()).optional(),
    transcript: z.string().optional(),
    toolCalls: z.array(z.object({ tool: z.string().optional(), durationMs: z.number().optional() })).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tokenUsage: z.object({ input: z.number().optional(), output: z.number().optional(), total: z.number().optional() }).optional(),
  }),
  attachments: z.array(z.object({ kind: z.string(), mimeType: z.string(), content: z.string().optional(), json: z.unknown().optional() })).optional(),
});

export const POST = createRouteHandler(async (context: RouteContext) => {
  const bodyResult = await parseJsonBody(context.request);
  if (!bodyResult.success) return bodyResult.response;

  const parsed = bodySchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400, { errors: parsed.error.issues });
  }

  const { repository, run, sourceSystem, agent, redactionLevel, payload, attachments } = parsed.data;

  let repositoryRecord: { id: string; organizationId: string } | null = null;
  if (repository) {
    repositoryRecord = await prisma.repository.findFirst({
      where: {
        provider: repository.provider,
        fullName: repository.fullName,
      },
      select: { id: true, organizationId: true },
    });
  }

  const runRecord = run?.runId ? await prisma.readyLayerRun.findUnique({
    where: { id: run.runId },
    select: { id: true, correlationId: true, repositoryId: true, repository: { select: { organizationId: true } } },
  }) : null;

  const organizationId = repositoryRecord?.organizationId || runRecord?.repository?.organizationId;
  if (!organizationId) {
    return errorResponse('VALIDATION_ERROR', 'Unable to resolve organization from repository or run context', 400);
  }

  const role = await getMembershipRole(context.user.id, organizationId);
  if (!role) {
    return errorResponse('FORBIDDEN', 'Access denied to organization', 403);
  }

  const scopes = await getApiKeyScopesFromRequest(context.request);
  if (sourceSystem !== 'readylayer' && !canIngestExternal(role, scopes)) {
    return errorResponse('FORBIDDEN', 'External provenance ingestion requires admin/owner or provenance:write scope', 403);
  }

  const result = await ingestProvenance({
    organizationId,
    repositoryId: repositoryRecord?.id || runRecord?.repositoryId || undefined,
    runId: runRecord?.id,
    correlationId: run?.correlationId || runRecord?.correlationId,
    prNumber: run?.prNumber,
    prSha: run?.prSha,
    source: sourceSystem === 'readylayer' ? 'internal' : 'external',
    sourceSystem,
    redactionLevel: redactionLevel || 'safe',
    payload,
    attachments,
    agent,
  });

  return successResponse(result, 201);
}, { authz: { requiredScopes: ['write'] } });
