/**
 * Usage Accounting Service
 * 
 * Tracks token usage per run/stage for billing and analytics
 */

import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';

export interface TokenUsageRecord {
  runId: string;
  repositoryId?: string;
  organizationId: string;
  reviewId?: string;
  service: 'review' | 'test_generation' | 'doc_sync';
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  contextSize?: number;
  wastePercentage?: number;
  metadata?: any;
}

/**
 * Usage Accounting Service
 */
export class UsageAccountingService {
  /**
   * Record token usage for a run/stage
   */
  async recordUsage(usage: TokenUsageRecord): Promise<void> {
    const log = logger.child({ runId: usage.runId, service: usage.service });

    try {
      await prisma.tokenUsage.create({
        data: {
          repositoryId: usage.repositoryId || null,
          organizationId: usage.organizationId,
          reviewId: usage.reviewId || null,
          service: usage.service,
          provider: usage.provider,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          cost: usage.cost,
          contextSize: usage.contextSize || null,
          wastePercentage: usage.wastePercentage || null,
          metadata: usage.metadata || null,
        },
      });

      log.info({ totalTokens: usage.totalTokens, cost: usage.cost }, 'Token usage recorded');
    } catch (error) {
      log.error({ err: error }, 'Failed to record token usage');
      // Don't throw - usage tracking is non-critical
    }
  }

  /**
   * Get usage for a run
   */
  async getRunUsage(runId: string): Promise<TokenUsageRecord[]> {
    // Get review ID from run first
    const run = await prisma.readyLayerRun.findUnique({
      where: { id: runId },
      select: { reviewId: true },
    });

    if (!run || !run.reviewId) {
      return [];
    }

    // Get token usage for the review
    const usageRecords = await prisma.tokenUsage.findMany({
      where: {
        reviewId: run.reviewId,
      },
    });

    return usageRecords.map((u) => ({
      runId,
      repositoryId: u.repositoryId || undefined,
      organizationId: u.organizationId,
      reviewId: u.reviewId || undefined,
      service: u.service as 'review' | 'test_generation' | 'doc_sync',
      provider: u.provider,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      cost: Number(u.cost),
      contextSize: u.contextSize || undefined,
      wastePercentage: u.wastePercentage ? Number(u.wastePercentage) : undefined,
      metadata: u.metadata as any,
    }));
  }

  /**
   * Get usage for an organization
   */
  async getOrganizationUsage(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalTokens: number; totalCost: number; byService: Record<string, number> }> {
    const where: any = { organizationId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const usageRecords = await prisma.tokenUsage.findMany({ where });

    const totalTokens = usageRecords.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = usageRecords.reduce((sum, u) => sum + Number(u.cost), 0);
    const byService = usageRecords.reduce((acc, u) => {
      acc[u.service] = (acc[u.service] || 0) + u.totalTokens;
      return acc;
    }, {} as Record<string, number>);

    return { totalTokens, totalCost, byService };
  }
}

export const usageAccountingService = new UsageAccountingService();
