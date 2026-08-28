import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usageEnforcementService, LimitType } from '../../lib/usage-enforcement';
import { billingService, BILLING_TIERS } from '../../billing';

// Mock prisma module
vi.mock('../../lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ timezone: 'UTC' }),
    },
    costTracking: {
      aggregate: vi.fn(),
    },
  },
}));

// Import mocked prisma
import { prisma } from '../../lib/prisma';

describe('Billing Enforcement Integration', () => {
  const organizationId = 'org_test_enforcement';

  beforeEach(() => {
    vi.spyOn(billingService, 'getOrganizationTier').mockResolvedValue(BILLING_TIERS.starter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks when daily LLM token limit exceeded', async () => {
    vi.spyOn(prisma.costTracking, 'aggregate')
      .mockResolvedValueOnce({
        _sum: { units: BILLING_TIERS.starter.limits.llmTokensPerDay },
        _count: undefined,
        _avg: undefined,
        _min: undefined,
        _max: undefined,
      } as unknown as never)
      .mockResolvedValueOnce({
        _sum: { units: 0 },
        _count: undefined,
        _avg: undefined,
        _min: undefined,
        _max: undefined,
      } as unknown as never);

    const result = await usageEnforcementService.checkLLMTokenLimit(organizationId, 1);

    expect(result.allowed).toBe(false);
    expect(result.limitType).toBe(LimitType.LLM_TOKENS_DAILY);
    expect(result.remaining).toBe(0);
  });
});
