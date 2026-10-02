import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateComplianceAttestation,
  renderAttestationMarkdown,
} from '@/lib/compliance/soc2-generator';
import { prisma } from '@/lib/prisma';
import { verifyAuditLogContinuity } from '@/lib/audit';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    policyPack: {
      findMany: vi.fn(),
    },
    waiver: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  verifyAuditLogContinuity: vi.fn(),
}));

describe('Compliance Attestation Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a cryptographically signed compliance attestation report', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org-acme',
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'scale',
    } as any);

    vi.mocked(prisma.policyPack.findMany).mockResolvedValue([
      {
        id: 'pack-1',
        version: '1.2.0',
        checksum: 'sha256-abc123mock',
        createdAt: new Date('2026-01-01'),
        rules: [{ id: 'rule-1' }, { id: 'rule-2' }],
      },
    ] as any);

    vi.mocked(verifyAuditLogContinuity).mockResolvedValue({
      valid: true,
      totalLogs: 150,
      brokenAtIndex: null,
      lastValidHash: 'hash-abc',
    });

    vi.mocked(prisma.waiver.findMany).mockResolvedValue([
      {
        id: 'waiver-xyz',
        ruleId: 'secret-leak-detection',
        reason: 'Temporary test fixture',
        expiresAt: new Date(Date.now() + 86400000),
      },
    ] as any);

    const report = await generateComplianceAttestation('org-acme', {
      framework: 'soc2',
      periodDays: 30,
    });

    expect(report).toBeDefined();
    expect(report.organization.slug).toBe('acme');
    expect(report.summary.complianceScore).toBeGreaterThanOrEqual(75);
    expect(report.summary.auditLogContinuityVerified).toBe(true);
    expect(report.attestationDigest).toHaveLength(64); // SHA-256 hex string

    // Render markdown test
    const markdown = renderAttestationMarkdown(report);
    expect(markdown).toContain('ReadyLayer Compliance Attestation Report');
    expect(markdown).toContain('Acme Corp');
    expect(markdown).toContain('CC6.1');
    expect(markdown).toContain(report.attestationDigest);
  });

  it('throws an error if organization does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await expect(
      generateComplianceAttestation('org-nonexistent')
    ).rejects.toThrow('Organization org-nonexistent not found');
  });
});
