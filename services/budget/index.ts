/**
 * Budget Service
 * 
 * Manages organization/repo/stage budgets and enforces limits
 */

import { logger } from '../../observability/logging';
import { prisma } from '../../lib/prisma';
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
  private async loadBudgetConfig(organizationId: string, repositoryId?: string): Promise<BudgetConfig> {
    const [organizationConfig, repositoryConfig] = await Promise.all([
      prisma.organizationConfig.findUnique({
        where: { organizationId },
        select: { config: true },
      }),
      repositoryId
        ? prisma.repositoryConfig.findUnique({
            where: { repositoryId },
            select: { config: true },
          })
        : Promise.resolve(null),
    ]);
    const orgValue = organizationConfig?.config;
    const repoValue = repositoryConfig?.config;
    const orgBudgets = isRecord(orgValue) && isRecord(orgValue.budgets) ? orgValue.budgets : {};
    const repoBudgets = isRecord(repoValue) && isRecord(repoValue.budgets) ? repoValue.budgets : {};
    const stage = isRecord(orgBudgets.stageTokenCap) ? orgBudgets.stageTokenCap : {};
    const repoCap = isRecord(orgBudgets.repoTokenCap) ? orgBudgets.repoTokenCap : {};
    const repositoryCap = repositoryId && typeof repoBudgets.monthlyTokenCap === 'number'
      ? repoBudgets.monthlyTokenCap
      : repositoryId && typeof repoCap[repositoryId] === 'number'
        ? repoCap[repositoryId]
        : undefined;

    return {
      organizationId,
      monthlyTokenCap: typeof orgBudgets.monthlyTokenCap === 'number' ? orgBudgets.monthlyTokenCap : undefined,
      repoTokenCap: repositoryCap === undefined ? undefined : { [repositoryId as string]: repositoryCap },
      stageTokenCap: {
        review: typeof stage.review === 'number' ? stage.review : undefined,
        test_generation: typeof stage.test_generation === 'number' ? stage.test_generation : undefined,
        doc_sync: typeof stage.doc_sync === 'number' ? stage.doc_sync : undefined,
      },
      degradedMode: orgBudgets.degradedMode === true,
    };
  }

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

      const config = await this.loadBudgetConfig(organizationId, repositoryId);

      const monthlyCap = config.monthlyTokenCap ?? 1_000_000;
      if (orgUsage.totalTokens + estimatedTokens > monthlyCap) {
        return {
          allowed: false,
          reason: 'Monthly token cap exceeded',
          currentUsage: orgUsage.totalTokens,
          limit: monthlyCap,
          remaining: Math.max(0, monthlyCap - orgUsage.totalTokens),
        };
      }

      const repositoryCap = repositoryId ? config.repoTokenCap?.[repositoryId] : undefined;
      if (repositoryCap !== undefined) {
        const scopedRepositoryId = repositoryId;
        if (!scopedRepositoryId) {
          return { allowed: true, currentUsage: orgUsage.totalTokens, limit: monthlyCap, remaining: monthlyCap - orgUsage.totalTokens };
        }
        const repositoryUsage = await usageAccountingService.getRepositoryUsage(
          scopedRepositoryId,
          startOfMonth,
          now
        );
        if (repositoryUsage.totalTokens + estimatedTokens > repositoryCap) {
          return {
            allowed: false,
            reason: 'Repository token cap exceeded',
            currentUsage: repositoryUsage.totalTokens,
            limit: repositoryCap,
            remaining: Math.max(0, repositoryCap - repositoryUsage.totalTokens),
          };
        }
      }

      // Check stage-level cap (if configured)
      const stageUsage = orgUsage.byService[service] || 0;
      const stageCap = config.stageTokenCap?.[service] ?? 100_000;
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

    const config = await this.loadBudgetConfig(organizationId);
    const monthlyLimit = config.monthlyTokenCap ?? 1_000_000;

    return {
      monthlyUsage: usage.totalTokens,
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - usage.totalTokens),
      byService: usage.byService,
    };
  }
}

export const budgetService = new BudgetService();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
