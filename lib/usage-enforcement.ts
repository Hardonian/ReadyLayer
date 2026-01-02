/**
 * Usage Enforcement Service
 * 
 * Enforces plan-based usage limits with proper error handling
 * and audit logging
 */

import { prisma } from './prisma';
import { billingService, BillingTier } from '../billing';
import { logger } from '../observability/logging';

export enum LimitType {
  LLM_TOKENS_DAILY = 'llm_tokens_daily',
  LLM_TOKENS_MONTHLY = 'llm_tokens_monthly',
  LLM_BUDGET = 'llm_budget',
  RUNS_DAILY = 'runs_daily',
  CONCURRENT_JOBS = 'concurrent_jobs',
}

export interface LimitCheckResult {
  allowed: boolean;
  limitType?: LimitType;
  current: number;
  limit: number;
  remaining: number;
  message: string;
}

export class UsageLimitExceededError extends Error {
  constructor(
    public limitType: LimitType,
    public current: number,
    public limit: number,
    public message: string,
    public httpStatus: number = 429
  ) {
    super(message);
    this.name = 'UsageLimitExceededError';
  }
}

export class UsageEnforcementService {
  /**
   * Check LLM token limits (daily and monthly)
   */
  async checkLLMTokenLimit(
    organizationId: string,
    requestedTokens: number
  ): Promise<LimitCheckResult> {
    const tier = await billingService.getOrganizationTier(organizationId);
    const limits = tier.limits;

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: today,
        service: 'llm',
      },
      _sum: {
        units: true,
      },
    });

    const todayTokens = Number(todayUsage._sum.units || 0);
    const dailyRemaining = limits.llmTokensPerDay - todayTokens;

    if (todayTokens + requestedTokens > limits.llmTokensPerDay) {
      return {
        allowed: limits.failOpenOnLimit,
        limitType: LimitType.LLM_TOKENS_DAILY,
        current: todayTokens,
        limit: limits.llmTokensPerDay,
        remaining: dailyRemaining,
        message: `Daily LLM token limit exceeded: ${todayTokens}/${limits.llmTokensPerDay} tokens. Upgrade your plan or wait until tomorrow.`,
      };
    }

    // Check monthly limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthUsage = await prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: { gte: startOfMonth },
        service: 'llm',
      },
      _sum: {
        units: true,
      },
    });

    const monthTokens = Number(monthUsage._sum.units || 0);
    const monthlyRemaining = limits.llmTokensPerMonth - monthTokens;

    if (monthTokens + requestedTokens > limits.llmTokensPerMonth) {
      return {
        allowed: limits.failOpenOnLimit,
        limitType: LimitType.LLM_TOKENS_MONTHLY,
        current: monthTokens,
        limit: limits.llmTokensPerMonth,
        remaining: monthlyRemaining,
        message: `Monthly LLM token limit exceeded: ${monthTokens}/${limits.llmTokensPerMonth} tokens. Upgrade your plan or wait until next month.`,
      };
    }

    return {
      allowed: true,
      current: todayTokens,
      limit: limits.llmTokensPerDay,
      remaining: dailyRemaining - requestedTokens,
      message: 'Within limits',
    };
  }

  /**
   * Check LLM budget limit
   */
  async checkLLMBudgetLimit(organizationId: string): Promise<LimitCheckResult> {
    const budget = await billingService.checkLLMBudget(organizationId);
    const tier = await billingService.getOrganizationTier(organizationId);

    if (!budget.allowed) {
      return {
        allowed: tier.limits.failOpenOnLimit,
        limitType: LimitType.LLM_BUDGET,
        current: budget.currentSpend,
        limit: budget.budget,
        remaining: budget.remaining,
        message: `LLM budget exceeded: $${budget.currentSpend.toFixed(2)} / $${budget.budget.toFixed(2)}. Upgrade your plan or wait until next billing period.`,
      };
    }

    return {
      allowed: true,
      current: budget.currentSpend,
      limit: budget.budget,
      remaining: budget.remaining,
      message: 'Within budget',
    };
  }

  /**
   * Check daily runs limit
   */
  async checkRunsLimit(organizationId: string): Promise<LimitCheckResult> {
    const tier = await billingService.getOrganizationTier(organizationId);
    const limits = tier.limits;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count reviews and tests created today
    const todayRuns = await prisma.review.count({
      where: {
        repository: {
          organizationId,
        },
        createdAt: { gte: today },
      },
    }) + await prisma.test.count({
      where: {
        repository: {
          organizationId,
        },
        createdAt: { gte: today },
      },
    });

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
   * Check concurrent jobs limit
   */
  async checkConcurrentJobsLimit(organizationId: string): Promise<LimitCheckResult> {
    const tier = await billingService.getOrganizationTier(organizationId);
    const limits = tier.limits;

    // Count jobs currently processing for this org
    const concurrentJobs = await prisma.job.count({
      where: {
        repository: {
          organizationId,
        },
        status: { in: ['pending', 'processing', 'retrying'] },
      },
    });

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
   * Log enforcement decision to audit log
   */
  async logEnforcementDecision(
    organizationId: string,
    userId: string | null,
    limitType: LimitType,
    allowed: boolean,
    result: LimitCheckResult,
    resourceType: string = 'usage_limit'
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: allowed ? 'limit_check_passed' : 'limit_check_failed',
          resourceType,
          details: {
            limitType,
            current: result.current,
            limit: result.limit,
            remaining: result.remaining,
            message: result.message,
            failOpen: !allowed && result.allowed, // true if we allowed despite limit being hit
          },
        },
      });
    } catch (error) {
      // Don't fail on audit log errors
      logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
      }, 'Failed to log enforcement decision');
    }
  }

  /**
   * Check all limits before LLM request
   */
  async checkLLMRequest(
    organizationId: string,
    userId: string | null,
    requestedTokens: number
  ): Promise<void> {
    // Check token limits
    const tokenCheck = await this.checkLLMTokenLimit(organizationId, requestedTokens);
    await this.logEnforcementDecision(
      organizationId,
      userId,
      tokenCheck.limitType || LimitType.LLM_TOKENS_DAILY,
      tokenCheck.allowed,
      tokenCheck,
      'llm_request'
    );

    if (!tokenCheck.allowed) {
      throw new UsageLimitExceededError(
        tokenCheck.limitType!,
        tokenCheck.current,
        tokenCheck.limit,
        tokenCheck.message,
        429 // Too Many Requests
      );
    }

    // Check budget limit
    const budgetCheck = await this.checkLLMBudgetLimit(organizationId);
    await this.logEnforcementDecision(
      organizationId,
      userId,
      LimitType.LLM_BUDGET,
      budgetCheck.allowed,
      budgetCheck,
      'llm_request'
    );

    if (!budgetCheck.allowed) {
      throw new UsageLimitExceededError(
        LimitType.LLM_BUDGET,
        budgetCheck.current,
        budgetCheck.limit,
        budgetCheck.message,
        402 // Payment Required
      );
    }
  }

  /**
   * Check all limits before enqueueing a job
   */
  async checkJobEnqueue(
    organizationId: string,
    userId: string | null,
    jobType: string
  ): Promise<void> {
    // Check runs limit (for review/test jobs)
    if (jobType === 'review' || jobType === 'test_generation' || jobType === 'webhook') {
      const runsCheck = await this.checkRunsLimit(organizationId);
      await this.logEnforcementDecision(
        organizationId,
        userId,
        LimitType.RUNS_DAILY,
        runsCheck.allowed,
        runsCheck,
        'job_enqueue'
      );

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
    const concurrentCheck = await this.checkConcurrentJobsLimit(organizationId);
    await this.logEnforcementDecision(
      organizationId,
      userId,
      LimitType.CONCURRENT_JOBS,
      concurrentCheck.allowed,
      concurrentCheck,
      'job_enqueue'
    );

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
   * Get current usage stats for an organization
   */
  async getUsageStats(organizationId: string): Promise<{
    llmTokens: { daily: number; monthly: number; limits: { daily: number; monthly: number } };
    runs: { today: number; limit: number };
    concurrentJobs: { current: number; limit: number };
    budget: { current: number; limit: number; remaining: number };
  }> {
    const tier = await billingService.getOrganizationTier(organizationId);
    const limits = tier.limits;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayUsage, monthUsage, todayRuns, concurrentJobs, budget] = await Promise.all([
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
      Promise.all([
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
      ]).then(([reviews, tests]) => reviews + tests),
      prisma.job.count({
        where: {
          repository: { organizationId },
          status: { in: ['pending', 'processing', 'retrying'] },
        },
      }),
      billingService.checkLLMBudget(organizationId),
    ]);

    return {
      llmTokens: {
        daily: Math.max(0, Number(todayUsage._sum.units || 0)),
        monthly: Math.max(0, Number(monthUsage._sum.units || 0)),
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
}

export const usageEnforcementService = new UsageEnforcementService();
