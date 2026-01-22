/**
 * Cost Attribution Service
 *
 * Tracks and attributes costs to organizations/teams for:
 * - LLM API calls (GPT-4, Claude, etc.)
 * - Embedding generation
 * - Database operations
 * - Storage usage
 * - API rate limiting
 *
 * Essential for Startup CTOs to understand and optimize costs
 */

// TODO: Uncomment when costEvent model is implemented in schema
// import { prisma } from '../../lib/prisma';
import { logger } from '../../observability/logging';

export interface CostBreakdown {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  costs: {
    llm: LLMCosts;
    embedding: EmbeddingCosts;
    database: DatabaseCosts;
    storage: StorageCosts;
    api: APICosts;
  };
  total: number; // Total in USD
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface LLMCosts {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costPerInputMillion: number;
  costPerOutputMillion: number;
  totalCost: number;
}

export interface EmbeddingCosts {
  model: string;
  tokens: number;
  costPerMillion: number;
  totalCost: number;
}

export interface DatabaseCosts {
  storage: number; // GB
  reads: number;
  writes: number;
  costPerGB: number;
  costPerRead: number;
  costPerWrite: number;
  totalCost: number;
}

export interface StorageCosts {
  usage: number; // GB
  costPerGB: number;
  totalCost: number;
}

export interface APICosts {
  requests: number;
  costPerRequest: number;
  totalCost: number;
}

interface CostEvent {
  type: 'llm' | 'embedding' | 'database' | 'storage' | 'api';
  totalCost: number;
  metadata?: Record<string, unknown>;
}

// Pricing tiers (can be configured per organization)
const DEFAULT_PRICING = {
  llm: {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1M tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude': { input: 0.008, output: 0.024 },
    'default': { input: 0.01, output: 0.03 },
  },
  embedding: {
    'ada': { cost: 0.0001 }, // per 1M tokens
    'default': { cost: 0.0001 },
  },
  database: {
    storage: 0.25, // per GB/month
    read: 0.00000025, // per read
    write: 0.0000015, // per write
  },
  storage: 0.023, // per GB/month
  api: 0.000001, // per request
};

class CostAttributionService {
  /**
   * Record LLM API call cost
   */
  async recordLLMCost(
    organizationId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    try {
      const pricing =
        DEFAULT_PRICING.llm[model as keyof typeof DEFAULT_PRICING.llm] ||
        DEFAULT_PRICING.llm.default;

      const inputCost = (inputTokens / 1_000_000) * pricing.input;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      const totalCost = inputCost + outputCost;

      // TODO: Implement costEvent model in Prisma schema
      // await prisma.costEvent.create({
      //   data: {
      //     organizationId,
      //     type: 'llm',
      //     category: model,
      //     quantity: inputTokens + outputTokens,
      //     unitCost: (inputCost + outputCost) / (inputTokens + outputTokens || 1),
      //     totalCost,
      //     metadata: {
      //       model,
      //       inputTokens,
      //       outputTokens,
      //       inputCost,
      //       outputCost,
      //     },
      //     recordedAt: new Date(),
      //   },
      // });

      logger.debug(
        { organizationId, model, inputTokens, outputTokens, totalCost },
        'LLM cost recorded'
      );
    } catch (error) {
      logger.error(
        { error, organizationId },
        'Failed to record LLM cost'
      );
    }
  }

  /**
   * Record embedding generation cost
   */
  async recordEmbeddingCost(
    organizationId: string,
    tokens: number,
    model: string = 'ada'
  ): Promise<void> {
    try {
      const pricing =
        DEFAULT_PRICING.embedding[model as keyof typeof DEFAULT_PRICING.embedding] ||
        DEFAULT_PRICING.embedding.default;

      const totalCost = (tokens / 1_000_000) * pricing.cost;

      // TODO: Implement costEvent model in Prisma schema
      // await prisma.costEvent.create({
      //   data: {
      //     organizationId,
      //     type: 'embedding',
      //     category: model,
      //     quantity: tokens,
      //     unitCost: pricing.cost / 1_000_000,
      //     totalCost,
      //     metadata: { model, tokens },
      //     recordedAt: new Date(),
      //   },
      // });

      logger.debug({ organizationId, tokens, totalCost }, 'Embedding cost recorded');
    } catch (error) {
      logger.error({ error, organizationId }, 'Failed to record embedding cost');
    }
  }

  /**
   * Record database operation cost
   */
  async recordDatabaseCost(
    organizationId: string,
    operation: 'read' | 'write',
    count: number = 1
  ): Promise<void> {
    try {
      const unitCost =
        operation === 'read'
          ? DEFAULT_PRICING.database.read
          : DEFAULT_PRICING.database.write;

      const totalCost = count * unitCost;
      void totalCost; // Will be used when costEvent model is implemented

      // TODO: Implement costEvent model in Prisma schema
      // await prisma.costEvent.create({
      //   data: {
      //     organizationId,
      //     type: 'database',
      //     category: operation,
      //     quantity: count,
      //     unitCost,
      //     totalCost,
      //     metadata: { operation, count },
      //     recordedAt: new Date(),
      //   },
      // });
    } catch (error) {
      logger.error({ error, organizationId }, 'Failed to record database cost');
    }
  }

  /**
   * Record API request cost
   */
  async recordAPICost(organizationId: string, requests: number = 1): Promise<void> {
    try {
      const totalCost = requests * DEFAULT_PRICING.api;
      void totalCost; // Will be used when costEvent model is implemented

      // TODO: Implement costEvent model in Prisma schema
      // await prisma.costEvent.create({
      //   data: {
      //     organizationId,
      //     type: 'api',
      //     category: 'request',
      //     quantity: requests,
      //     unitCost: DEFAULT_PRICING.api,
      //     totalCost,
      //     metadata: { requests },
      //     recordedAt: new Date(),
      //   },
      // });
    } catch (error) {
      logger.error({ error, organizationId }, 'Failed to record API cost');
    }
  }

  /**
   * Get cost breakdown for organization
   */
  async getCostBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostBreakdown> {
    // TODO: Implement costEvent model in Prisma schema
    // const events = await prisma.costEvent.findMany({
    //   where: {
    //     organizationId,
    //     recordedAt: {
    //       gte: startDate,
    //       lte: endDate,
    //     },
    //   },
    // });
    const events: CostEvent[] = [];

    const costs = {
      llm: { model: 'aggregate', inputTokens: 0, outputTokens: 0, costPerInputMillion: 0, costPerOutputMillion: 0, totalCost: 0 },
      embedding: { model: 'aggregate', tokens: 0, costPerMillion: 0, totalCost: 0 },
      database: { storage: 0, reads: 0, writes: 0, costPerGB: 0.25, costPerRead: 0.00000025, costPerWrite: 0.0000015, totalCost: 0 },
      storage: { usage: 0, costPerGB: 0.023, totalCost: 0 },
      api: { requests: 0, costPerRequest: 0.000001, totalCost: 0 },
    };

    for (const event of events) {
      switch (event.type) {
        case 'llm':
          {
            const llmMeta = event.metadata;
            costs.llm.totalCost += event.totalCost;
            costs.llm.inputTokens += getNumber(llmMeta?.inputTokens);
            costs.llm.outputTokens += getNumber(llmMeta?.outputTokens);
            break;
          }

        case 'embedding':
          {
            const embMeta = event.metadata;
            costs.embedding.totalCost += event.totalCost;
            costs.embedding.tokens += getNumber(embMeta?.tokens);
            break;
          }

        case 'database':
          {
            const dbMeta = event.metadata;
            costs.database.totalCost += event.totalCost;
            if (dbMeta?.operation === 'read') {
              costs.database.reads += getNumber(dbMeta?.count);
            } else {
              costs.database.writes += getNumber(dbMeta?.count);
            }
            break;
          }

        case 'storage':
          {
            const storageMeta = event.metadata;
            costs.storage.totalCost += event.totalCost;
            costs.storage.usage += getNumber(storageMeta?.usage);
            break;
          }

        case 'api':
          {
            const apiMeta = event.metadata;
            costs.api.totalCost += event.totalCost;
            costs.api.requests += getNumber(apiMeta?.requests);
            break;
          }
      }
    }

    const total =
      costs.llm.totalCost +
      costs.embedding.totalCost +
      costs.database.totalCost +
      costs.storage.totalCost +
      costs.api.totalCost;

    const breakdown = [
      {
        category: 'LLM',
        amount: costs.llm.totalCost,
        percentage: (costs.llm.totalCost / Math.max(total, 0.01)) * 100,
      },
      {
        category: 'Embedding',
        amount: costs.embedding.totalCost,
        percentage: (costs.embedding.totalCost / Math.max(total, 0.01)) * 100,
      },
      {
        category: 'Database',
        amount: costs.database.totalCost,
        percentage: (costs.database.totalCost / Math.max(total, 0.01)) * 100,
      },
      {
        category: 'Storage',
        amount: costs.storage.totalCost,
        percentage: (costs.storage.totalCost / Math.max(total, 0.01)) * 100,
      },
      {
        category: 'API',
        amount: costs.api.totalCost,
        percentage: (costs.api.totalCost / Math.max(total, 0.01)) * 100,
      },
    ].sort((a, b) => b.amount - a.amount);

    return {
      organizationId,
      period: { start: startDate, end: endDate },
      costs,
      total,
      breakdown,
    };
  }

  /**
   * Get monthly cost trend
   */
  async getMonthlyCostTrend(
    organizationId: string,
    months: number = 12
  ): Promise<Array<{ month: string; cost: number }>> {
    const trend: Array<{ month: string; cost: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const breakdown = await this.getCostBreakdown(organizationId, start, end);
      trend.push({
        month: start.toISOString().slice(0, 7), // YYYY-MM
        cost: breakdown.total,
      });
    }

    return trend;
  }

  /**
   * Estimate monthly cost based on usage
   */
  async estimateMonthlyCost(
    _organizationId: string,
    projectedMetrics: {
      llmTokens?: number;
      embeddingTokens?: number;
      databaseReads?: number;
      databaseWrites?: number;
      apiRequests?: number;
    }
  ): Promise<number> {
    let totalCost = 0;

    if (projectedMetrics.llmTokens) {
      // Assume 30% input, 70% output for LLM tokens
      const inputTokens = projectedMetrics.llmTokens * 0.3;
      const outputTokens = projectedMetrics.llmTokens * 0.7;
      totalCost +=
        (inputTokens / 1_000_000) * DEFAULT_PRICING.llm.default.input +
        (outputTokens / 1_000_000) * DEFAULT_PRICING.llm.default.output;
    }

    if (projectedMetrics.embeddingTokens) {
      totalCost +=
        (projectedMetrics.embeddingTokens / 1_000_000) *
        DEFAULT_PRICING.embedding.default.cost;
    }

    if (projectedMetrics.databaseReads) {
      totalCost +=
        projectedMetrics.databaseReads * DEFAULT_PRICING.database.read;
    }

    if (projectedMetrics.databaseWrites) {
      totalCost +=
        projectedMetrics.databaseWrites * DEFAULT_PRICING.database.write;
    }

    if (projectedMetrics.apiRequests) {
      totalCost += projectedMetrics.apiRequests * DEFAULT_PRICING.api;
    }

    return totalCost;
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateOptimizationRecommendations(
    organizationId: string,
    days: number = 30
  ): Promise<string[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const breakdown = await this.getCostBreakdown(organizationId, startDate, endDate);
    const recommendations: string[] = [];

    // LLM optimization
    if (breakdown.costs.llm.totalCost > breakdown.total * 0.5) {
      recommendations.push(
        'LLM costs are high (>50% of total). Consider enabling result caching or using a cheaper model for simple tasks.'
      );
    }

    // Database optimization
    if (breakdown.costs.database.totalCost > breakdown.total * 0.3) {
      recommendations.push(
        'Database costs are significant. Consider batch operations, connection pooling, or read replicas.'
      );
    }

    // API optimization
    if (breakdown.costs.api.requests > 1_000_000) {
      recommendations.push(
        'High API request volume. Consider rate limiting, caching, or batch processing.'
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ['Usage is optimized. No immediate recommendations.'];
  }
}

function getNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export const costAttributionService = new CostAttributionService();

// Export for testing
export { CostAttributionService };
