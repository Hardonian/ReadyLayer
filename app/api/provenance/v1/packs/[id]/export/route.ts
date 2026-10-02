import { NextResponse } from 'next/server';
import { createRouteHandler, errorResponse, RouteContext } from '@/lib/api-route-helpers';
import { canIngestExternal, getApiKeyScopesFromRequest, getMembershipRole } from '@/lib/provenance-auth';
import { prisma } from '@/lib/prisma';
import { buildDeterministicZip, deterministicManifest } from '@/lib/deterministic-zip';
import { stableStringify } from '@/lib/provenance';
import { generateCycloneDXAiBom } from '@/lib/provenance/cyclonedx';

export const GET = createRouteHandler(async (context: RouteContext) => {
  const id = context.request.url.split('/').slice(-2)[0];
  if (!id) return errorResponse('VALIDATION_ERROR', 'Pack id is required', 400);

  const url = new URL(context.request.url);
  const includeRaw = url.searchParams.get('raw') === 'true';
  const format = url.searchParams.get('format');

  const pack = await prisma.provenancePack.findUnique({
    where: { id },
    include: {
      run: {
        select: {
          id: true,
          correlationId: true,
          status: true,
          conclusion: true,
          gatesFailed: true,
          startedAt: true,
          completedAt: true,
          reviewGuardStatus: true,
          testEngineStatus: true,
          docSyncStatus: true,
          reviewGuardResult: true,
          testEngineResult: true,
          docSyncResult: true,
        },
      },
      artifacts: true,
    },
  });

  if (!pack) return errorResponse('NOT_FOUND', 'Provenance pack not found', 404);

  const role = await getMembershipRole(context.user.id, pack.organizationId);
  if (!role) return errorResponse('FORBIDDEN', 'Access denied to provenance pack', 403);
  const scopes = await getApiKeyScopesFromRequest(context.request);
  const canViewRaw = canIngestExternal(role, scopes);
  const exposeRaw = includeRaw && canViewRaw;

  const evidenceBundle = pack.runId
    ? await prisma.evidenceBundle.findFirst({
        where: { review: { run: { id: pack.runId } } },
      })
    : null;

  const policyPack = pack.repositoryId
    ? await prisma.policyPack.findFirst({ where: { repositoryId: pack.repositoryId }, select: { source: true, checksum: true } })
    : null;

  // Generate CycloneDX 1.6 AI-BOM
  const aibom = generateCycloneDXAiBom({
    organizationId: pack.organizationId,
    repositoryName: pack.repositoryId || undefined,
    commitSha: pack.prSha || undefined,
  });

  // Direct AI-BOM export if requested
  if (format === 'cyclonedx' || format === 'aibom') {
    return new NextResponse(JSON.stringify(aibom, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.cyclonedx+json',
        'Content-Disposition': `attachment; filename="readylayer-aibom-${pack.id}.json"`,
      },
    });
  }

  const files = [
    { path: 'run.json', content: stableStringify(pack.run || {}) },
    { path: 'review.json', content: stableStringify(pack.run?.reviewGuardResult || {}) },
    { path: 'tests.json', content: stableStringify(pack.run?.testEngineResult || {}) },
    { path: 'docs.json', content: stableStringify(pack.run?.docSyncResult || {}) },
    { path: 'evidence_bundle.json', content: stableStringify(evidenceBundle || {}) },
    { path: 'provenance/cyclonedx-aibom.json', content: JSON.stringify(aibom, null, 2) },
    { path: 'provenance/provenance_pack.json', content: stableStringify({ ...pack, payload: exposeRaw ? pack.payload : pack.safeSummary }) },
    { path: 'policy/effective_policy.json', content: stableStringify(policyPack ? { checksum: policyPack.checksum, source: policyPack.source } : {}) },
    ...pack.artifacts.map((artifact) => ({
      path: `provenance/attachments/${artifact.kind}-${artifact.contentHash.slice(0, 12)}.${artifact.jsonContent ? 'json' : 'txt'}`,
      content: artifact.jsonContent ? stableStringify(artifact.jsonContent) : (exposeRaw ? (artifact.content || '') : ''),
    })),
  ];

  const manifest = deterministicManifest(files);
  const withManifest = [{ path: 'manifest.json', content: stableStringify(manifest) }, ...files];

  const zip = buildDeterministicZip(withManifest);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="readylayer-evidence-${pack.correlationId || pack.id}.zip"`,
    },
  });
}, { authz: { requiredScopes: ['read'] } });
