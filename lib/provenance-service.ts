import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';
import { buildPromptHashes, redactText, RedactionLevel, sha256OfJson, sha256OfText, summarizeToolCalls } from './provenance';

export interface IngestProvenanceInput {
  organizationId: string;
  repositoryId?: string;
  runId?: string;
  correlationId?: string;
  prNumber?: number;
  prSha?: string;
  source: 'internal' | 'external';
  sourceSystem: 'readylayer' | 'checkpoints' | 'custom';
  redactionLevel: RedactionLevel;
  payload: {
    prompts?: string[];
    transcript?: string;
    toolCalls?: Array<{ tool?: string; durationMs?: number }>;
    metadata?: Record<string, unknown>;
    tokenUsage?: { input?: number; output?: number; total?: number };
  };
  attachments?: Array<{ kind: string; mimeType: string; content?: string; json?: unknown }>;
  agent: Record<string, unknown>;
  payloadEncrypted?: boolean;
}

export async function getRetentionPolicy(organizationId: string): Promise<{
  maxPayloadKB: number;
  redactionDefault: RedactionLevel;
  allowRawStorage: boolean;
  enabled: boolean;
}> {
  const policy = await prisma.dataRetentionPolicy.findUnique({
    where: { organizationId },
    select: {
      provenanceMaxPayloadKB: true,
      provenanceRedactionDefault: true,
      provenanceAllowRawStorage: true,
      provenanceEnabled: true,
    },
  });

  return {
    maxPayloadKB: policy?.provenanceMaxPayloadKB ?? 512,
    redactionDefault: (policy?.provenanceRedactionDefault as RedactionLevel | undefined) ?? 'safe',
    allowRawStorage: policy?.provenanceAllowRawStorage ?? false,
    enabled: policy?.provenanceEnabled ?? true,
  };
}

export async function ingestProvenance(input: IngestProvenanceInput): Promise<{ provenancePackId: string; payloadHash: string }> {
  const policy = await getRetentionPolicy(input.organizationId);
  if (!policy.enabled) {
    throw new Error('PROVENANCE_DISABLED');
  }

  const redactionLevel = input.redactionLevel || policy.redactionDefault;
  const storeRaw = redactionLevel === 'none' && policy.allowRawStorage;

  const sanitizedPayload = {
    ...input.payload,
    transcript: input.payload.transcript ? (storeRaw ? input.payload.transcript : redactText(input.payload.transcript, redactionLevel)) : undefined,
    prompts: input.payload.prompts?.map((p) => (storeRaw ? p : redactText(p, redactionLevel))),
  };

  const payloadSize = Buffer.byteLength(JSON.stringify(sanitizedPayload), 'utf8');
  if (payloadSize > policy.maxPayloadKB * 1024) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  const promptHashes = buildPromptHashes(input.payload.prompts);
  const toolCallSummary = summarizeToolCalls(input.payload.toolCalls);
  const payloadHash = sha256OfJson(sanitizedPayload);

  const pack = await prisma.provenancePack.create({
    data: {
      organizationId: input.organizationId,
      repositoryId: input.repositoryId || null,
      runId: input.runId || null,
      correlationId: input.correlationId || null,
      prNumber: input.prNumber || null,
      prSha: input.prSha || null,
      source: input.source,
      sourceSystem: input.sourceSystem,
      agent: input.agent as Prisma.InputJsonValue,
      redactionLevel,
      payloadEncrypted: input.payloadEncrypted ?? false,
      payload: sanitizedPayload as Prisma.InputJsonValue,
      payloadHash,
      promptHashes: promptHashes as Prisma.InputJsonValue,
      toolCallSummary: toolCallSummary as Prisma.InputJsonValue,
      safeSummary: {
        promptCount: sanitizedPayload.prompts?.length || 0,
        transcriptChars: sanitizedPayload.transcript?.length || 0,
        toolCalls: toolCallSummary.total,
        tokenUsage: input.payload.tokenUsage || null,
      } as Prisma.InputJsonValue,
    },
  });

  if (input.attachments?.length) {
    await prisma.provenanceArtifact.createMany({
      data: input.attachments.map((attachment) => {
        const content = attachment.content ? (storeRaw ? attachment.content : redactText(attachment.content, redactionLevel)) : null;
        const contentHash = attachment.json ? sha256OfJson(attachment.json) : sha256OfText(content || '');

        return {
          provenancePackId: pack.id,
          kind: attachment.kind,
          mimeType: attachment.mimeType,
          content,
          jsonContent: (attachment.json ?? undefined) as Prisma.InputJsonValue | undefined,
          contentHash,
        };
      }),
    });
  }

  return { provenancePackId: pack.id, payloadHash };
}
