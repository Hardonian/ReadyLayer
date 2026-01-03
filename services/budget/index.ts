/**
 * Budget Service
 * 
 * Manages organization/repo/stage budgets and enforces limits
 */

import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';
import { usageAccountingService } from '../usage-accounting';

export interface BudgetConfig {
  organizationId: string;
  monthlyTokenCap?: number;
  repoTokenCap?: Record<string, number>;
  stageTokenCap?: {
    review?: number;
    test_generation?: number;
    doc_sync?: number;
  };
  degradedMode?: boolean; // Skip AI if cap reached
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Budget Service
 */
export class BudgetService {
  /**
   * Check if usage is within budget
   */
  async checkBudget(
    organizationId: string,
    repositoryId: string | undefined,
    service: 'review' | 'test_generation' | 'doc_sync',
    estimatedTokens: number
  ): Promise<BudgetCheckResult> {
    const log = logger.child({ organizationId, repositoryId, service });

    try {
      // Get organization usage for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const orgUsage = await usageAccountingService.getOrganizationUsage(
        organizationId,
        startOfMonth,
        now
      );

      // Check org-level monthly cap (would be stored in OrganizationConfig or Subscription)
      // For now, use a default cap of 1M tokens/month
      const monthlyCap = 1_000_000;
      if (orgUsage.totalTokens + estimatedTokens > monthlyCap) {
        return {
          allowed: false,
          reason: 'Monthly token cap exceeded',
          currentUsage: orgUsage.totalTokens,
          limit: monthlyCap,
          remaining: Math.max(0, monthlyCap - orgUsage.totalTokens),
        };
      }

      // Check repo-level cap (if configured)
      // Note: Repo-specific caps would be stored in RepositoryConfig or Subscription
      // For now, repo-level caps are not implemented

      // Check stage-level cap (if configured)
      const stageUsage = orgUsage.byService[service] || 0;
      const stageCap = 100_000; // Default stage cap
      if (stageUsage + estimatedTokens > stageCap) {
        return {
          allowed: false,
          reason: `${service} stage token cap exceeded`,
          currentUsage: stageUsage,
          limit: stageCap,
          remaining: Math.max(0, stageCap - stageUsage),
        };
      }

      return {
        allowed: true,
        currentUsage: orgUsage.totalTokens,
        limit: monthlyCap,
        remaining: monthlyCap - orgUsage.totalTokens,
      };
    } catch (error) {
      log.error({ err: error }, 'Failed to check budget');
      // Allow on error (fail open)
      return { allowed: true };
    }
  }

  /**
   * Get budget status for organization
   */
  async getBudgetStatus(organizationId: string): Promise<{
    monthlyUsage: number;
    monthlyLimit: number;
    remaining: number;
    byService: Record<string, number>;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await usageAccountingService.getOrganizationUsage(
      organizationId,
      startOfMonth,
      now
    );

    const monthlyLimit = 1_000_000; // Would come from subscription/config

    return {
      monthlyUsage: usage.totalTokens,
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - usage.totalTokens),
      byService: usage.byService,
    };
  }
}

export const budgetService = new BudgetService();
