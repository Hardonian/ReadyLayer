import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  repository: { findMany: vi.fn() },
  violation: { findMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { policyInheritanceService } from '@/services/policy-engine/inheritance';

describe('policy improvement suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recommends disabled recurring high-severity rules from tenant evidence', async () => {
    mockPrisma.repository.findMany.mockResolvedValue([{ id: 'repo_1' }]);
    mockPrisma.violation.findMany.mockResolvedValue([
      { ruleId: 'security.sql-injection', severity: 'critical' },
      { ruleId: 'security.sql-injection', severity: 'high' },
      { ruleId: 'quality.todo', severity: 'low' },
    ]);

    const suggestions = await policyInheritanceService.suggestImprovements('org_1', {
      id: 'policy_1',
      name: 'Policy',
      source: 'organization',
      rules: [{ id: 'quality.todo', name: 'quality.todo', enabled: true, severity: 'low', source: 'organization' }],
      overrides: new Map(),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestion).toContain('security.sql-injection');
    expect(suggestions[0].impact).toContain('high-severity');
  });
});
