/**
 * Optimized Usage Enforcement Service
 * 
 * Performance improvements:
 * - Caches usage stats in Redis/memory with 5s TTL
 * - Pre-aggregates daily/monthly data
 * - Batches multiple limit checks
 * - Uses in-memory cache for concurrent job counts
 */

import { prisma } from './prisma';
import { billingService } from '../billing';
import { cache, buildCacheKey } from './db/cache';
import { SimpleCache } from './utils/memoization';
import { 
  LimitType, 
  LimitCheckResult, 
  UsageLimitExceededError 
} from './usage-enforcement';

// In-memory cache for high-frequency checks
const usageCache = new SimpleCache<{
  daily: number;
  monthly: number;
  concurrent: number;
  runs: number;
}>(5000);

// TTL constants (in seconds)
const TTL_USAGE = 5;
const TTL_TIER = 60;

interface UsageStats {
  llmTokens: { daily: number; monthly: number; limits: { daily: number; monthly: number } };
  runs: { today: number; limit: number };
  concurrentJobs: { current: number; limit: number };
  budget: { current: number; limit: number; remaining: number };
}

/**
 * Get organization tier with caching
 */
async function getCachedOrganizationTier(
  organizationId: string
): Promise<ReturnType<typeof billingService.getOrganizationTier>> {
  const cacheKey = buildCacheKey('tier', organizationId);
  const cached = await cache.get<ReturnType<typeof billingService.getOrganizationTier>>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const tier = await billingService.getOrganizationTier(organizationId);
  await cache.set(cacheKey, tier, TTL_TIER);
  return tier;
}

/**
 * Get cached usage stats (daily/monthly tokens, concurrent jobs, runs)
 */
async function getCachedUsageStats(
  organizationId: string,
  orgTimezone: string
): Promise<{
  dailyTokens: number;
  monthlyTokens: number;
  concurrentJobs: number;
  todayRuns: number;
}> {
  const cacheKey = `usage:${organizationId}`;
  const memCached = usageCache.get(cacheKey);
  
  if (memCached) {
    return {
      dailyTokens: memCached.daily,
      monthlyTokens: memCached.monthly,
      concurrentJobs: memCached.concurrent,
      todayRuns: memCached.runs,
    };
  }

  // Calculate time ranges
  const now = new Date();
  const todayInOrgTZ = new Date(now.toLocaleString('en-US', { timeZone: orgTimezone }));
  const today = new Date(todayInOrgTZ.getFullYear(), todayInOrgTZ.getMonth(), todayInOrgTZ.getDate());
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Execute all queries in parallel
  const [
    todayUsage,
    monthUsage,
    todayReviews,
    todayTests,
    concurrentJobs,
  ] = await Promise.all([
    prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: today,
        service: 'llm',
      },
      _sum: { units: true },
    }),
    prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: { gte: startOfMonth },
        service: 'llm',
      },
      _sum: { units: true },
    }),
    prisma.review.count({
      where: {
        repository: { organizationId },
        createdAt: { gte: today },
      },
    }),
    prisma.test.count({
      where: {
        repository: { organizationId },
        createdAt: { gte: today },
      },
    }),
    prisma.job.count({
      where: {
        repository: { organizationId },
        status: { in: ['pending', 'processing', 'retrying'] },
      },
    }),
  ]);

  const dailyTokens = Number(todayUsage._sum?.units || 0);
  const monthlyTokens = Number(monthUsage._sum?.units || 0);
  const todayRuns = todayReviews + todayTests;

  // Cache in memory
  usageCache.set(cacheKey, {
    daily: dailyTokens,
    monthly: monthlyTokens,
    concurrent: concurrentJobs,
    runs: todayRuns,
  }, TTL_USAGE * 1000);

  return {
    dailyTokens,
    monthlyTokens,
    concurrentJobs,
    todayRuns,
  };
}

/**
 * Check LLM token limits (daily and monthly) - OPTIMIZED
 */
export async function checkLLMTokenLimitOptimized(
  organizationId: string,
  requestedTokens: number
): Promise<LimitCheckResult> {
  const tier = await getCachedOrganizationTier(organizationId);
  const limits = tier.limits;

  // Get organization timezone
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const orgTimezone = org?.timezone || 'UTC';

  // Get cached usage stats
  const { dailyTokens, monthlyTokens } = await getCachedUsageStats(organizationId, orgTimezone);

  const dailyRemaining = limits.llmTokensPerDay - dailyTokens;
  const monthlyRemaining = limits.llmTokensPerMonth - monthlyTokens;

  // Check daily limit
  if (dailyTokens + requestedTokens > limits.llmTokensPerDay) {
    return {
      allowed: limits.failOpenOnLimit,
      limitType: LimitType.LLM_TOKENS_DAILY,
      current: dailyTokens,
      limit: limits.llmTokensPerDay,
      remaining: dailyRemaining,
      message: `Daily LLM token limit exceeded: ${dailyTokens}/${limits.llmTokensPerDay} tokens. Upgrade your plan or wait until tomorrow.`,
    };
  }

  // Check monthly limit
  if (monthlyTokens + requestedTokens > limits.llmTokensPerMonth) {
    return {
      allowed: limits.failOpenOnLimit,
      limitType: LimitType.LLM_TOKENS_MONTHLY,
      current: monthlyTokens,
      limit: limits.llmTokensPerMonth,
      remaining: monthlyRemaining,
      message: `Monthly LLM token limit exceeded: ${monthlyTokens}/${limits.llmTokensPerMonth} tokens. Upgrade your plan or wait until next month.`,
    };
  }

  return {
    allowed: true,
    current: dailyTokens,
    limit: limits.llmTokensPerDay,
    remaining: dailyRemaining - requestedTokens,
    message: 'Within limits',
  };
}

/**
 * Check daily runs limit - OPTIMIZED
 */
export async function checkRunsLimitOptimized(
  organizationId: string
): Promise<LimitCheckResult> {
  const tier = await getCachedOrganizationTier(organizationId);
  const limits = tier.limits;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const orgTimezone = org?.timezone || 'UTC';

  const { todayRuns } = await getCachedUsageStats(organizationId, orgTimezone);
  const remaining = limits.runsPerDay - todayRuns;

  if (todayRuns >= limits.runsPerDay) {
    return {
      allowed: limits.failOpenOnLimit,
      limitType: LimitType.RUNS_DAILY,
      current: todayRuns,
      limit: limits.runsPerDay,
      remaining: 0,
      message: `Daily runs limit exceeded: ${todayRuns}/${limits.runsPerDay} runs. Upgrade your plan or wait until tomorrow.`,
    };
  }

  return {
    allowed: true,
    current: todayRuns,
    limit: limits.runsPerDay,
    remaining,
    message: 'Within limits',
  };
}

/**
 * Check concurrent jobs limit - OPTIMIZED
 */
export async function checkConcurrentJobsLimitOptimized(
  organizationId: string
): Promise<LimitCheckResult> {
  const tier = await getCachedOrganizationTier(organizationId);
  const limits = tier.limits;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const orgTimezone = org?.timezone || 'UTC';

  const { concurrentJobs } = await getCachedUsageStats(organizationId, orgTimezone);
  const remaining = limits.concurrentJobs - concurrentJobs;

  if (concurrentJobs >= limits.concurrentJobs) {
    return {
      allowed: limits.failOpenOnLimit,
      limitType: LimitType.CONCURRENT_JOBS,
      current: concurrentJobs,
      limit: limits.concurrentJobs,
      remaining: 0,
      message: `Concurrent jobs limit exceeded: ${concurrentJobs}/${limits.concurrentJobs} jobs. Upgrade your plan or wait for jobs to complete.`,
    };
  }

  return {
    allowed: true,
    current: concurrentJobs,
    limit: limits.concurrentJobs,
    remaining,
    message: 'Within limits',
  };
}

/**
 * Batch check all limits for job enqueue - OPTIMIZED
 */
export async function checkJobEnqueueOptimized(
  organizationId: string,
  jobType: string
): Promise<void> {
  // Check runs limit (for review/test jobs)
  if (['review', 'test_generation', 'webhook'].includes(jobType)) {
    const runsCheck = await checkRunsLimitOptimized(organizationId);

    if (!runsCheck.allowed) {
      throw new UsageLimitExceededError(
        LimitType.RUNS_DAILY,
        runsCheck.current,
        runsCheck.limit,
        runsCheck.message,
        429
      );
    }
  }

  // Check concurrent jobs limit
  const concurrentCheck = await checkConcurrentJobsLimitOptimized(organizationId);

  if (!concurrentCheck.allowed) {
    throw new UsageLimitExceededError(
      LimitType.CONCURRENT_JOBS,
      concurrentCheck.current,
      concurrentCheck.limit,
      concurrentCheck.message,
      429
    );
  }
}

/**
 * Get all usage stats in one call - OPTIMIZED
 */
export async function getUsageStatsOptimized(
  organizationId: string
): Promise<UsageStats> {
  const tier = await getCachedOrganizationTier(organizationId);
  const limits = tier.limits;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  const orgTimezone = org?.timezone || 'UTC';

  const { dailyTokens, monthlyTokens, concurrentJobs, todayRuns } = 
    await getCachedUsageStats(organizationId, orgTimezone);

  const budget = await billingService.checkLLMBudget(organizationId);

  return {
    llmTokens: {
      daily: Math.max(0, dailyTokens),
      monthly: Math.max(0, monthlyTokens),
      limits: {
        daily: Math.max(0, limits.llmTokensPerDay),
        monthly: Math.max(0, limits.llmTokensPerMonth),
      },
    },
    runs: {
      today: Math.max(0, todayRuns),
      limit: Math.max(0, limits.runsPerDay),
    },
    concurrentJobs: {
      current: Math.max(0, concurrentJobs),
      limit: Math.max(0, limits.concurrentJobs),
    },
    budget: {
      current: Math.max(0, budget.currentSpend),
      limit: Math.max(0, budget.budget),
      remaining: Math.max(0, budget.remaining),
    },
  };
}

/**
 * Invalidate usage cache for organization
 */
export async function invalidateUsageCache(organizationId: string): Promise<void> {
  usageCache.delete(`usage:${organizationId}`);
}
