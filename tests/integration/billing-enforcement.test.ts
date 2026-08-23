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
    review: {
      count: vi.fn(),
    },
    test: {
      count: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Import mocked prisma
import { prisma } from '../../lib/prisma';

describe('Billing & Usage Enforcement Integration', () => {
  const organizationId = 'org_test_enforcement';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue({ timezone: 'UTC' } as never);
    vi.spyOn(billingService, 'getOrganizationTier').mockResolvedValue(BILLING_TIERS.starter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Daily and Monthly LLM Token Enforcement', () => {
    it('blocks when daily LLM token limit is exceeded', async () => {
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

    it('allows request when daily and monthly usage is within limits', async () => {
      vi.spyOn(prisma.costTracking, 'aggregate')
        .mockResolvedValueOnce({ 
          _sum: { units: 1000 },
          _count: undefined,
          _avg: undefined,
          _min: undefined,
          _max: undefined,
        } as unknown as never)
        .mockResolvedValueOnce({ 
          _sum: { units: 5000 },
          _count: undefined,
          _avg: undefined,
          _min: undefined,
          _max: undefined,
        } as unknown as never);

      const result = await usageEnforcementService.checkLLMTokenLimit(organizationId, 500);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(BILLING_TIERS.starter.limits.llmTokensPerDay);
    });

    it('blocks when monthly LLM token limit is exceeded', async () => {
      vi.spyOn(prisma.costTracking, 'aggregate')
        .mockResolvedValueOnce({ 
          _sum: { units: 100 },
          _count: undefined,
          _avg: undefined,
          _min: undefined,
          _max: undefined,
        } as unknown as never)
        .mockResolvedValueOnce({ 
          _sum: { units: BILLING_TIERS.starter.limits.llmTokensPerMonth },
          _count: undefined,
          _avg: undefined,
          _min: undefined,
          _max: undefined,
        } as unknown as never);

      const result = await usageEnforcementService.checkLLMTokenLimit(organizationId, 1);

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe(LimitType.LLM_TOKENS_MONTHLY);
    });
  });

  describe('Runs and Concurrent Jobs Enforcement', () => {
    it('blocks when daily run limit is exceeded', async () => {
      vi.spyOn(prisma.review, 'count').mockResolvedValue(BILLING_TIERS.starter.limits.runsPerDay);
      vi.spyOn(prisma.test, 'count').mockResolvedValue(0);

      const result = await usageEnforcementService.checkRunsLimit(organizationId);

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe(LimitType.RUNS_DAILY);
    });

    it('blocks when concurrent jobs limit is exceeded', async () => {
      vi.spyOn(prisma.job, 'count').mockResolvedValue(BILLING_TIERS.starter.limits.concurrentJobs);

      const result = await usageEnforcementService.checkConcurrentJobsLimit(organizationId);

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe(LimitType.CONCURRENT_JOBS);
    });

    it('allows concurrent jobs when under limit', async () => {
      vi.spyOn(prisma.job, 'count').mockResolvedValue(0);

      const result = await usageEnforcementService.checkConcurrentJobsLimit(organizationId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(BILLING_TIERS.starter.limits.concurrentJobs);
    });
  });

  describe('Tier Upgrades and Scaling Limits', () => {
    it('applies scale tier limits with higher concurrency headroom', async () => {
      vi.spyOn(billingService, 'getOrganizationTier').mockResolvedValue(BILLING_TIERS.scale);
      vi.spyOn(prisma.job, 'count').mockResolvedValue(20);

      const result = await usageEnforcementService.checkConcurrentJobsLimit(organizationId);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(BILLING_TIERS.scale.limits.concurrentJobs);
    });
  });
});
