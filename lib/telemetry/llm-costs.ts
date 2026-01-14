/**
 * LLM Cost Tracking Service
 * 
 * Tracks all LLM API calls and embeddings costs by organization.
 * Used for billing, budget enforcement, and cost analytics.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export interface LLMCostEntry {
  organizationId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Pricing tiers for different models (in USD per 1K tokens)
 */
const MODEL_PRICING = {
  'gpt-4-turbo': {
    input: 0.01,     // $0.01 per 1K input tokens
    output: 0.03,    // $0.03 per 1K output tokens
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'claude-3-opus': {
    input: 0.015,
    output: 0.075,
  },
  'claude-3-sonnet': {
    input: 0.003,
    output: 0.015,
  },
  'claude-3-haiku': {
    input: 0.00025,
    output: 0.00125,
  },
  'embedding-3-small': {
    input: 0.00002,   // Embeddings are cheaper
    output: 0.00002,
  },
};

/**
 * Calculate cost for LLM API call
 */
export function calculateLLMCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelName as keyof typeof MODEL_PRICING];

  if (!pricing) {
    logger.warn({ modelName }, 'Unknown model for cost calculation');
    return 0;
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Track LLM API call cost
 */
export async function trackLLMCost(entry: LLMCostEntry): Promise<void> {
  try {
    // Validate cost calculation
    if (entry.costUSD < 0) {
      logger.warn({ entry }, 'Negative cost detected, skipping');
      return;
    }

    // Record in database for audit trail
    await prisma.llmCostLog.create({
      data: {
        organizationId: entry.organizationId,
        modelName: entry.modelName,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        totalTokens: entry.totalTokens,
        costUSD: entry.costUSD,
        requestId: entry.requestId,
        metadata: entry.metadata,
        timestamp: entry.timestamp,
      },
    });

    // Update organization's monthly spend
    await updateOrganizationMonthlySpend(entry.organizationId, entry.costUSD);

    // Record metrics
    metrics.recordHistogram('llm_cost_usd', entry.costUSD, {
      model: entry.modelName,
    });

    metrics.recordHistogram('llm_tokens', entry.totalTokens, {
      model: entry.modelName,
    });

    logger.debug(
      {
        organizationId: entry.organizationId,
        model: entry.modelName,
        cost: entry.costUSD,
        tokens: entry.totalTokens,
      },
      'LLM cost tracked'
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry,
      },
      'Error tracking LLM cost'
    );

    metrics.increment('llm_cost_tracking_error');
  }
}

/**
 * Track batch LLM costs
 */
export async function trackBatchLLMCosts(entries: LLMCostEntry[]): Promise<void> {
  for (const entry of entries) {
    await trackLLMCost(entry);
  }
}

/**
 * Update organization's monthly spend
 */
async function updateOrganizationMonthlySpend(
  organizationId: string,
  costUSD: number
): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get or create monthly spend record
  const existing = await prisma.organizationMonthlySpend.findUnique({
    where: {
      organizationId_month: {
        organizationId,
        month: monthStart,
      },
    },
  });

  if (existing) {
    await prisma.organizationMonthlySpend.update({
      where: {
        id: existing.id,
      },
      data: {
        totalSpendUSD: existing.totalSpendUSD + costUSD,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.organizationMonthlySpend.create({
      data: {
        organizationId,
        month: monthStart,
        totalSpendUSD: costUSD,
      },
    });
  }
}

/**
 * Get organization's current month spend
 */
export async function getOrganizationMonthlySpend(
  organizationId: string
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const spend = await prisma.organizationMonthlySpend.findUnique({
    where: {
      organizationId_month: {
        organizationId,
        month: monthStart,
      },
    },
  });

  return spend?.totalSpendUSD || 0;
}

/**
 * Get organization's spending over time
 */
export async function getOrganizationSpendingHistory(
  organizationId: string,
  months: number = 12
): Promise<Array<{ month: Date; spent: number }>> {
  const result = await prisma.organizationMonthlySpend.findMany({
    where: { organizationId },
    orderBy: { month: 'desc' },
    take: months,
  });

  return result
    .map((row) => ({
      month: row.month,
      spent: row.totalSpendUSD,
    }))
    .reverse();
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdownByModel(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  const logs = await prisma.llmCostLog.findMany({
    where: {
      organizationId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const breakdown: Record<string, number> = {};

  for (const log of logs) {
    breakdown[log.modelName] = (breakdown[log.modelName] || 0) + log.costUSD;
  }

  return breakdown;
}

/**
 * Get cost trends over time
 */
export async function getCostTrends(
  organizationId: string,
  days: number = 30
): Promise<Array<{ date: Date; cost: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.llmCostLog.findMany({
    where: {
      organizationId,
      timestamp: {
        gte: startDate,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Group by day
  const costByDay: Record<string, number> = {};

  for (const log of logs) {
    const dateKey = log.timestamp.toISOString().split('T')[0];
    costByDay[dateKey] = (costByDay[dateKey] || 0) + log.costUSD;
  }

  return Object.entries(costByDay)
    .map(([dateStr, cost]) => ({
      date: new Date(dateStr),
      cost,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Check if organization is within budget
 */
export async function isWithinBudget(
  organizationId: string,
  monthlyBudgetUSD: number
): Promise<boolean> {
  const spent = await getOrganizationMonthlySpend(organizationId);
  return spent <= monthlyBudgetUSD;
}

/**
 * Get remaining budget
 */
export async function getRemainingBudget(
  organizationId: string,
  monthlyBudgetUSD: number
): Promise<number> {
  const spent = await getOrganizationMonthlySpend(organizationId);
  return Math.max(0, monthlyBudgetUSD - spent);
}

/**
 * Get budget utilization percentage
 */
export async function getBudgetUtilization(
  organizationId: string,
  monthlyBudgetUSD: number
): Promise<number> {
  const spent = await getOrganizationMonthlySpend(organizationId);
  return (spent / monthlyBudgetUSD) * 100;
}

/**
 * Alert on budget threshold
 */
export async function checkBudgetAlerts(
  organizationId: string,
  monthlyBudgetUSD: number,
  thresholds: { warning: number; critical: number } = { warning: 75, critical: 90 }
): Promise<'ok' | 'warning' | 'critical'> {
  const utilization = await getBudgetUtilization(organizationId, monthlyBudgetUSD);

  if (utilization >= thresholds.critical) {
    return 'critical';
  } else if (utilization >= thresholds.warning) {
    return 'warning';
  }

  return 'ok';
}

/**
 * Get cost statistics
 */
export async function getCostStatistics(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCost: number;
  averageCost: number;
  minCost: number;
  maxCost: number;
  totalTokens: number;
  avgCostPerToken: number;
}> {
  const logs = await prisma.llmCostLog.findMany({
    where: {
      organizationId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (logs.length === 0) {
    return {
      totalCost: 0,
      averageCost: 0,
      minCost: 0,
      maxCost: 0,
      totalTokens: 0,
      avgCostPerToken: 0,
    };
  }

  const costs = logs.map((log) => log.costUSD);
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
  const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);

  return {
    totalCost,
    averageCost: totalCost / logs.length,
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
    totalTokens,
    avgCostPerToken: totalCost / (totalTokens || 1),
  };
}
