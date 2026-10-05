import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  costTracking: { aggregate: vi.fn() },
  auditLog: { create: vi.fn() },
}));

const mockBilling = vi.hoisted(() => ({
  getOrganizationTier: vi.fn(),
  checkLLMBudget: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/billing', () => ({ billingService: mockBilling }));

import { LimitType, UsageEnforcementService } from '@/lib/usage-enforcement';
import { calculateLLMCost } from '@/lib/telemetry/llm-costs';

const limits = {
  llmTokensPerDay: 100,
  llmTokensPerMonth: 1_000,
  llmBudget: 50,
  runsPerDay: 10,
  concurrentJobs: 2,
  failOpenOnLimit: false,
};

describe('Billing service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBilling.getOrganizationTier.mockResolvedValue({ limits });
    mockBilling.checkLLMBudget.mockResolvedValue({ allowed: true, currentSpend: 0, budget: 50, remaining: 50 });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it('blocks a daily LLM request above the organization limit', async () => {
    mockPrisma.costTracking.aggregate.mockResolvedValueOnce({ _sum: { units: 95 } });

    const result = await new UsageEnforcementService().checkLLMTokenLimit('org_1', 10);

    expect(result).toMatchObject({
      allowed: false,
      limitType: LimitType.LLM_TOKENS_DAILY,
      current: 95,
      limit: 100,
      remaining: 5,
    });
  });

  it('blocks a monthly request after passing the daily limit', async () => {
    mockPrisma.costTracking.aggregate
      .mockResolvedValueOnce({ _sum: { units: 50 } })
      .mockResolvedValueOnce({ _sum: { units: 995 } });

    const result = await new UsageEnforcementService().checkLLMTokenLimit('org_1', 10);

    expect(result).toMatchObject({
      allowed: false,
      limitType: LimitType.LLM_TOKENS_MONTHLY,
      current: 995,
      limit: 1_000,
      remaining: 5,
    });
  });

  it('allows requests within quota and records the remaining daily allowance', async () => {
    mockPrisma.costTracking.aggregate
      .mockResolvedValueOnce({ _sum: { units: 25 } })
      .mockResolvedValueOnce({ _sum: { units: 250 } });

    const result = await new UsageEnforcementService().checkLLMTokenLimit('org_1', 10);

    expect(result).toMatchObject({ allowed: true, current: 25, limit: 100, remaining: 65 });
  });

  it('honors explicit fail-open policy while retaining exceeded-limit evidence', async () => {
    mockBilling.getOrganizationTier.mockResolvedValue({ limits: { ...limits, failOpenOnLimit: true } });
    mockPrisma.costTracking.aggregate.mockResolvedValueOnce({ _sum: { units: 100 } });

    const result = await new UsageEnforcementService().checkLLMTokenLimit('org_1', 1);

    expect(result).toMatchObject({ allowed: true, limitType: LimitType.LLM_TOKENS_DAILY, current: 100 });
  });

  it('calculates provider-specific LLM costs deterministically', () => {
    expect(calculateLLMCost('openai', 'gpt-4-turbo', 1_000, 1_000)).toBe(0.04);
    expect(calculateLLMCost('anthropic', 'claude-3-haiku', 1_000, 1_000)).toBeCloseTo(0.0015);
  });
});
