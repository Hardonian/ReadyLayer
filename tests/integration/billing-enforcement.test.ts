import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usageEnforcementService, LimitType } from '../../lib/usage-enforcement';
import { billingService, BILLING_TIERS } from '../../billing';
import { prisma } from '../../lib/prisma';

describe('Billing Enforcement Integration', () => {
  const organizationId = 'org_test_enforcement';

  beforeEach(() => {
    vi.spyOn(billingService, 'getOrganizationTier').mockResolvedValue(BILLING_TIERS.starter);
    vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue(
      { timezone: 'UTC' } as unknown as { timezone: string | null }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks when daily LLM token limit exceeded', async () => {
    vi.spyOn(prisma.costTracking, 'aggregate')
      .mockResolvedValueOnce({ _sum: { units: BILLING_TIERS.starter.limits.llmTokensPerDay } } as unknown as {
        _sum: { units: number | null };
      })
      .mockResolvedValueOnce({ _sum: { units: 0 } } as unknown as {
        _sum: { units: number | null };
      });

    const result = await usageEnforcementService.checkLLMTokenLimit(organizationId, 1);

    expect(result.allowed).toBe(false);
    expect(result.limitType).toBe(LimitType.LLM_TOKENS_DAILY);
    expect(result.remaining).toBe(0);
  });
});
