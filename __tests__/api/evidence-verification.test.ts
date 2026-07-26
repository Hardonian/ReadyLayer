import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  membershipFindUnique: vi.fn(),
  requireAuth: vi.fn(),
  authz: vi.fn(),
}));
const { findUnique, membershipFindUnique, requireAuth, authz } = mocks;

vi.mock('@/lib/prisma', () => ({ prisma: {
  evidenceBundle: { findUnique: mocks.findUnique },
  organizationMember: { findUnique: mocks.membershipFindUnique },
} }));
vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/authz', () => ({ createAuthzMiddleware: () => mocks.authz }));

import { GET } from '@/app/api/v1/evidence/[bundleId]/verification/route';

const request = () => new NextRequest('http://localhost/api/v1/evidence/bundle-a/verification', { headers: { authorization: 'Bearer rl_test' } });
const params = { params: Promise.resolve({ bundleId: 'bundle-a' }) };

beforeEach(() => {
  vi.clearAllMocks();
  requireAuth.mockResolvedValue({ id: 'user-a', organizationIds: ['org-a'] });
  authz.mockResolvedValue(null);
  membershipFindUnique.mockResolvedValue({ organizationId: 'org-a' });
  findUnique.mockResolvedValue({
    id: 'bundle-a', reviewId: 'review-a', testId: null, docId: null,
    inputsMetadata: { source: 'ci' }, rulesFired: [{ rule: 'review-required' }],
    policyChecksum: 'sha256:policy-a', toolVersions: { runner: '1.0.0' },
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    review: { repository: { organizationId: 'org-a' } }, test: null, doc: null,
  });
});

describe('evidence verification endpoint', () => {
  it('returns status, provenance, expiry, and explicit limitations', async () => {
    const response = await GET(request(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('review_required');
    expect(body.policy.rulesFired).toEqual([{ rule: 'review-required' }]);
    expect(body.provenance.policyChecksum).toBe('sha256:policy-a');
    expect(body.evidence.expiresAt).toBe('2026-07-31T00:00:00.000Z');
    expect(body.limitations.join(' ')).toContain('does not certify production readiness');
    expect(membershipFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId_userId: { organizationId: 'org-a', userId: 'user-a' } } }));
  });

  it('does not disclose a bundle to another tenant', async () => {
    membershipFindUnique.mockResolvedValue(null);
    const response = await GET(request(), params);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('FORBIDDEN');
  });
});
