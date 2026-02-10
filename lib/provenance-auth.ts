import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { extractApiKey } from './auth';

export async function getApiKeyScopesFromRequest(request: NextRequest): Promise<string[]> {
  const apiKey = extractApiKey(request);
  if (!apiKey) return [];
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const rec = await prisma.apiKey.findFirst({ where: { keyHash, isActive: true }, select: { scopes: true } });
  return rec?.scopes ?? [];
}

export async function getMembershipRole(userId: string, organizationId: string): Promise<'owner' | 'admin' | 'member' | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  return (membership?.role as 'owner' | 'admin' | 'member' | undefined) ?? null;
}

export function canIngestExternal(role: 'owner' | 'admin' | 'member' | null, scopes: string[]): boolean {
  if (scopes.includes('admin') || scopes.includes('provenance:write')) return true;
  return role === 'owner' || role === 'admin';
}
