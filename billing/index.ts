/**
 * Billing Service
 * 
 * Stripe integration, tier enforcement, cost guardrails
 */

import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';

export interface BillingTier {
  name: 'starter' | 'growth' | 'scale';
  monthlyPrice: number;
  llmBudget: number; // Monthly LLM spend limit
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
