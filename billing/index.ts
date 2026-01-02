/**
 * Billing Service
 * 
 * Stripe integration, tier enforcement, cost guardrails
 */

import { prisma } from '../lib/prisma';

export interface PlanLimits {
  // LLM limits
  llmTokensPerDay: number; // Daily token limit
  llmTokensPerMonth: number; // Monthly token limit (alternative to budget)
  llmBudget: number; // Monthly LLM spend limit (USD)
  
  // Usage limits
  runsPerDay: number; // Daily review/test runs
  concurrentJobs: number; // Max concurrent processing jobs
  
  // Fail-open/closed policy
  failOpenOnLimit: boolean; // If true, allow requests but log; if false, reject
}

export interface BillingTier {
  name: 'starter' | 'growth' | 'scale';
  monthlyPrice: number;
  llmBudget: number; // Monthly LLM spend limit
  limits: PlanLimits;
  features: {
    reviewGuard: boolean;
    testEngine: boolean;
    docSync: boolean;
    maxRepos: number;
    enforcementStrength: 'basic' | 'moderate' | 'maximum';
  };
}

export const BILLING_TIERS: Record<string, BillingTier> = {
  starter: {
    name: 'starter',
    monthlyPrice: 0,
    llmBudget: 50,
    limits: {
      llmTokensPerDay: 100000, // 100k tokens/day
      llmTokensPerMonth: 2000000, // 2M tokens/month
      llmBudget: 50,
      runsPerDay: 50, // 50 reviews/tests per day
      concurrentJobs: 2, // Max 2 concurrent jobs
      failOpenOnLimit: false, // Reject when limit hit
    },
    features: {
      reviewGuard: true,
      testEngine: true,
      docSync: true,
      maxRepos: 5,
      enforcementStrength: 'basic', // Critical issues only
    },
  },
  growth: {
    name: 'growth',
    monthlyPrice: 99,
    llmBudget: 500,
    limits: {
      llmTokensPerDay: 1000000, // 1M tokens/day
      llmTokensPerMonth: 20000000, // 20M tokens/month
      llmBudget: 500,
      runsPerDay: 500, // 500 reviews/tests per day
      concurrentJobs: 10, // Max 10 concurrent jobs
      failOpenOnLimit: false, // Reject when limit hit
    },
    features: {
      reviewGuard: true,
      testEngine: true,
      docSync: true,
      maxRepos: 50,
      enforcementStrength: 'moderate', // Critical + High issues
    },
  },
  scale: {
    name: 'scale',
    monthlyPrice: 499,
    llmBudget: 5000,
    limits: {
      llmTokensPerDay: 10000000, // 10M tokens/day
      llmTokensPerMonth: 200000000, // 200M tokens/month
      llmBudget: 5000,
      runsPerDay: 5000, // 5000 reviews/tests per day
      concurrentJobs: 50, // Max 50 concurrent jobs
      failOpenOnLimit: true, // Allow but log (graceful degradation)
    },
    features: {
      reviewGuard: true,
      testEngine: true,
      docSync: true,
      maxRepos: -1, // Unlimited
      enforcementStrength: 'maximum', // Critical + High + Medium issues
    },
  },
};

export class BillingService {
  /**
   * Get organization tier
   */
  async getOrganizationTier(organizationId: string): Promise<BillingTier> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscriptions: true },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const subscription = org.subscriptions[0];
    const plan = subscription?.plan || org.plan || 'starter';

    return BILLING_TIERS[plan] || BILLING_TIERS.starter;
  }

  /**
   * Check if organization can use feature
   */
  async canUseFeature(
    organizationId: string,
    feature: 'reviewGuard' | 'testEngine' | 'docSync'
  ): Promise<boolean> {
    const tier = await this.getOrganizationTier(organizationId);
    return tier.features[feature];
  }

  /**
   * Check if organization can add repository
   */
  async canAddRepository(organizationId: string): Promise<boolean> {
    const tier = await this.getOrganizationTier(organizationId);

    if (tier.features.maxRepos === -1) {
      return true; // Unlimited
    }

    const repoCount = await prisma.repository.count({
      where: { organizationId },
    });

    return repoCount < tier.features.maxRepos;
  }

  /**
   * Check LLM budget
   */
  async checkLLMBudget(organizationId: string): Promise<{
    allowed: boolean;
    currentSpend: number;
    budget: number;
    remaining: number;
  }> {
    const tier = await this.getOrganizationTier(organizationId);

    // Get current month spend
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthSpend = await prisma.costTracking.aggregate({
      where: {
        organizationId,
        date: { gte: startOfMonth },
        service: 'llm',
      },
      _sum: {
        amount: true,
      },
    });

    const currentSpend = Number(monthSpend._sum.amount || 0);
    const remaining = tier.llmBudget - currentSpend;

    return {
      allowed: remaining > 0,
      currentSpend,
      budget: tier.llmBudget,
      remaining,
    };
  }

  /**
   * Get enforcement strength for organization
   */
  async getEnforcementStrength(organizationId: string): Promise<'basic' | 'moderate' | 'maximum'> {
    const tier = await this.getOrganizationTier(organizationId);
    return tier.features.enforcementStrength;
  }
}

export const billingService = new BillingService();
