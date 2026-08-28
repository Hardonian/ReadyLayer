/**
 * LLM Costs Tracking
 *
 * Tracks all LLM API calls, tokens used, and costs by organization.
 * Supports multiple LLM providers (OpenAI, Claude, etc.)
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export type LLMProvider = 'openai' | 'anthropic' | 'cohere' | 'huggingface';

export interface LLMCallMetrics {
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  requestDurationMs: number;
  timestamp: Date;
  success: boolean;
  cacheHit?: boolean;
  embeddingTokens?: number;
}

export interface LLMCostsData {
  organizationId: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEmbeddingTokens: number;
  totalCostUSD: number;
  costsByProvider: Record<LLMProvider, number>;
  costsByModel: Record<string, number>;
  cacheHitRate: number;
  averageRequestDuration: number;
  lastUpdated: Date;
}

interface LLMCostEntry {
  organizationId: string;
  calls: LLMCallMetrics[];
  lastUpdated: Date;
}

/**
 * In-memory cost tracking (should be persisted to database)
 */
const costTracker = new Map<string, LLMCostEntry>();

/**
 * Pricing for different LLM models (in USD per 1K tokens)
 */
const LLM_PRICING: Record<LLMProvider, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'text-embedding-ada-002': { input: 0.0001, output: 0 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
    'text-embedding-3-large': { input: 0.00013, output: 0 },
  },
  anthropic: {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-2': { input: 0.008, output: 0.024 },
  },
  cohere: {
    'command': { input: 0.000125, output: 0.000375 },
    'command-light': { input: 0.00003, output: 0.0001 },
    'command-nightly': { input: 0.0003, output: 0.0015 },
  },
  huggingface: {
    'default': { input: 0, output: 0 }, // HuggingFace pricing varies
  },
};

/**
 * Track an LLM API call
 */
export function trackLLMCall(
  organizationId: string,
  metrics_: LLMCallMetrics
): void {
  try {
    // Get or create entry for organization
    if (!costTracker.has(organizationId)) {
      costTracker.set(organizationId, {
        organizationId,
        calls: [],
        lastUpdated: new Date(),
      });
    }

    const entry = costTracker.get(organizationId)!;
    entry.calls.push(metrics_);
    entry.lastUpdated = new Date();

    logger.debug(
      {
        organizationId,
        provider: metrics_.provider,
        model: metrics_.model,
        inputTokens: metrics_.inputTokens,
        outputTokens: metrics_.outputTokens,
        costUSD: metrics_.costUSD,
      },
      'LLM call tracked'
    );

    // Record metrics
    metrics.increment('llm_call', {
      provider: metrics_.provider,
      model: metrics_.model,
      success: metrics_.success ? 'true' : 'false',
    });

    metrics.increment('llm_input_tokens', {
      amount: metrics_.inputTokens.toString(),
    });

    metrics.increment('llm_output_tokens', {
      amount: metrics_.outputTokens.toString(),
    });

    const metricsWithTiming = metrics as {
      timing?: (name: string, value: number, tags?: Record<string, string>) => void;
    };
    metricsWithTiming.timing?.('llm_request_duration_ms', metrics_.requestDurationMs, {
      provider: metrics_.provider,
    });

    // Track costs if successful
    if (metrics_.success) {
      metrics.increment('llm_cost_usd', {
        amount: metrics_.costUSD.toFixed(4),
      });
    }

    // Track cache hits
    if (metrics_.cacheHit) {
      metrics.increment('llm_cache_hit');
    }
  } catch (error) {
    logger.error(
      {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error tracking LLM call'
    );
  }
}

/**
 * Calculate cost for an LLM call
 */
export function calculateLLMCost(
  provider: LLMProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  embeddingTokens?: number
): number {
  try {
    const pricing = LLM_PRICING[provider]?.[model];

    if (!pricing) {
      logger.warn(
        {
          provider,
          model,
        },
        'Unknown LLM model pricing'
      );
      return 0;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    let embeddingCost = 0;

    if (embeddingTokens && provider === 'openai') {
      const embeddingPricing = LLM_PRICING.openai[model];
      if (embeddingPricing) {
        embeddingCost = (embeddingTokens / 1000) * embeddingPricing.input;
      }
    }

    const totalCost = inputCost + outputCost + embeddingCost;

    return Math.round(totalCost * 10000) / 10000; // Round to 4 decimal places
  } catch (error) {
    logger.error(
      {
        provider,
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error calculating LLM cost'
    );
    return 0;
  }
}

/**
 * Get cost data for organization
 */
export function getOrganizationCosts(organizationId: string): LLMCostsData {
  const entry = costTracker.get(organizationId);

  if (!entry || entry.calls.length === 0) {
    return {
      organizationId,
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEmbeddingTokens: 0,
      totalCostUSD: 0,
      costsByProvider: {
        openai: 0,
        anthropic: 0,
        cohere: 0,
        huggingface: 0,
      },
      costsByModel: {},
      cacheHitRate: 0,
      averageRequestDuration: 0,
      lastUpdated: new Date(),
    };
  }

  const calls = entry.calls;
  const totalCalls = calls.length;
  const successfulCalls = calls.filter(c => c.success);
  const cachedCalls = calls.filter(c => c.cacheHit);

  const totalInputTokens = calls.reduce((sum, c) => sum + c.inputTokens, 0);
  const totalOutputTokens = calls.reduce((sum, c) => sum + c.outputTokens, 0);
  const totalEmbeddingTokens = calls.reduce((sum, c) => sum + (c.embeddingTokens || 0), 0);
  const totalCostUSD = calls.reduce((sum, c) => sum + c.costUSD, 0);

  const costsByProvider = {} as Record<LLMProvider, number>;
  const costsByModel = {} as Record<string, number>;

  // Calculate costs by provider and model
  for (const call of calls) {
    costsByProvider[call.provider] = (costsByProvider[call.provider] || 0) + call.costUSD;
    costsByModel[call.model] = (costsByModel[call.model] || 0) + call.costUSD;
  }

  const cacheHitRate = totalCalls > 0
    ? Math.round((cachedCalls.length / totalCalls) * 100) / 100
    : 0;

  const averageRequestDuration =
    successfulCalls.length > 0
      ? Math.round(
          successfulCalls.reduce((sum, c) => sum + c.requestDurationMs, 0) /
          successfulCalls.length
        )
      : 0;

  return {
    organizationId,
    totalCalls,
    totalInputTokens,
    totalOutputTokens,
    totalEmbeddingTokens,
    totalCostUSD: Math.round(totalCostUSD * 10000) / 10000,
    costsByProvider,
    costsByModel,
    cacheHitRate,
    averageRequestDuration,
    lastUpdated: entry.lastUpdated,
  };
}

/**
 * Get costs for multiple organizations
 */
export function getAllOrganizationsCosts(): LLMCostsData[] {
  return Array.from(costTracker.values()).map(entry =>
    getOrganizationCosts(entry.organizationId)
  );
}

/**
 * Get cost trends over time period
 */
export function getCostTrends(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Record<string, number> {
  const entry = costTracker.get(organizationId);

  if (!entry) {
    return {};
  }

  const trends: Record<string, number> = {};

  for (const call of entry.calls) {
    if (call.timestamp >= startDate && call.timestamp <= endDate) {
      const dateKey = call.timestamp.toISOString().split('T')[0];
      trends[dateKey] = (trends[dateKey] || 0) + call.costUSD;
    }
  }

  return trends;
}

/**
 * Clear costs for testing
 */
export function clearCosts(organizationId?: string): void {
  if (organizationId) {
    costTracker.delete(organizationId);
  } else {
    costTracker.clear();
  }
}

/**
 * Get raw call metrics for debugging
 */
export function getRawCallMetrics(organizationId: string): LLMCallMetrics[] {
  const entry = costTracker.get(organizationId);
  return entry ? [...entry.calls] : [];
}

/**
 * Export costs data for analytics
 */
export async function exportCostsData(
  organizationId: string,
  format: 'csv' | 'json' = 'json'
): Promise<string> {
  const costs = getOrganizationCosts(organizationId);

  if (format === 'csv') {
    const headers = [
      'Total Calls',
      'Input Tokens',
      'Output Tokens',
      'Total Cost USD',
      'Cache Hit Rate',
      'Avg Duration MS',
    ];
    const values = [
      costs.totalCalls,
      costs.totalInputTokens,
      costs.totalOutputTokens,
      costs.totalCostUSD,
      costs.cacheHitRate,
      costs.averageRequestDuration,
    ];
    return `${headers.join(',')}\n${values.join(',')}`;
  }

  return JSON.stringify(costs, null, 2);
}

/**
 * Get model usage statistics
 */
export interface ModelUsageStats {
  calls: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
}

export function getModelUsageStats(organizationId: string): Record<string, ModelUsageStats> {
  const entry = costTracker.get(organizationId);

  if (!entry) {
    return {};
  }

  const stats: Record<string, ModelUsageStats> = {};

  for (const call of entry.calls) {
    if (!stats[call.model]) {
      stats[call.model] = {
        calls: 0,
        totalTokens: 0,
        totalCost: 0,
        successRate: 0,
      };
    }

    stats[call.model].calls++;
    stats[call.model].totalTokens += call.totalTokens;
    stats[call.model].totalCost += call.costUSD;
  }

  // Calculate success rates
  for (const model in stats) {
    const modelCalls = entry.calls.filter(c => c.model === model);
    const successCount = modelCalls.filter(c => c.success).length;
    stats[model].successRate = (successCount / modelCalls.length) * 100;
  }

  return stats;
}

/**
 * Alias for trackLLMCall (for backward compatibility)
 */
export const trackLLMCost = trackLLMCall;

/**
 * Get organization's monthly spend
 */
export function getOrganizationMonthlySpend(organizationId: string): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const trends = getCostTrends(organizationId, startOfMonth, endOfMonth);
  return Object.values(trends).reduce((sum, cost) => sum + cost, 0);
}

/**
 * Check if organization is within budget
 */
export function isWithinBudget(organizationId: string, budgetLimit: number): boolean {
  const monthlySpend = getOrganizationMonthlySpend(organizationId);
  return monthlySpend <= budgetLimit;
}

/**
 * Get remaining budget
 */
export function getRemainingBudget(organizationId: string, budgetLimit: number): number {
  const monthlySpend = getOrganizationMonthlySpend(organizationId);
  return Math.max(0, budgetLimit - monthlySpend);
}

/**
 * Get budget utilization percentage
 */
export function getBudgetUtilization(organizationId: string, budgetLimit: number): number {
  if (budgetLimit === 0) return 0;
  const monthlySpend = getOrganizationMonthlySpend(organizationId);
  return Math.min(100, (monthlySpend / budgetLimit) * 100);
}

/**
 * Check for budget alerts
 */
export function checkBudgetAlerts(
  organizationId: string,
  budgetLimit: number,
  thresholds: number[] = [50, 75, 90, 100]
): { level: number; percentage: number; exceeded: boolean } | null {
  const utilization = getBudgetUtilization(organizationId, budgetLimit);

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (utilization >= thresholds[i]) {
      return {
        level: thresholds[i],
        percentage: utilization,
        exceeded: utilization >= 100,
      };
    }
  }

  return null;
}
