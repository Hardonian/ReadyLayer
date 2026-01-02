/**
 * Self-Learning Service
 * 
 * Tracks model performance, aggregates data, improves predictions
 * Builds trust and confidence scores that improve experientially
 */

import { prisma } from '../../lib/prisma';
import { privacyComplianceService, ComplianceConfig } from '../privacy-compliance';

export interface ModelPerformanceMetrics {
  modelId: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  averageTokensUsed: number;
  averageCost: number;
  accuracyScore: number; // 0-1, based on feedback
  confidenceScore: number; // 0-1, how confident we are in this model
  trustScore: number; // 0-1, overall trust based on historical performance
  lastUpdated: Date;
}

export interface PredictionFeedback {
  predictionId: string;
  wasCorrect: boolean;
  actualOutcome?: unknown;
  feedbackType: 'explicit' | 'implicit' | 'outcome_based';
  confidenceAtPrediction: number;
  userId?: string;
  timestamp: Date;
}

export interface AggregatedInsight {
  id: string;
  insightType: 'pattern' | 'anomaly' | 'optimization' | 'prediction';
  confidence: number;
  trustLevel: number;
  dataPoints: number; // Number of data points supporting this insight
  firstSeen: Date;
  lastSeen: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  metadata: Record<string, unknown>;
}

export interface ConfidenceScore {
  baseConfidence: number; // Initial confidence
  experienceMultiplier: number; // Increases with more data
  accuracyMultiplier: number; // Based on historical accuracy
  recencyMultiplier: number; // Recent data weighted more
  finalConfidence: number; // Combined score
  trustLevel: 'low' | 'medium' | 'high' | 'very_high';
}

export class SelfLearningService {
  /**
   * Record model performance
   */
  async recordModelPerformance(
    organizationId: string,
    modelId: string,
    provider: string,
    metrics: {
      success: boolean;
      responseTime: number;
      tokensUsed: number;
      cost: number;
      predictionId?: string;
    }
  ): Promise<void> {
    const complianceConfig = privacyComplianceService.getConfig(organizationId);

    // Prepare data for storage (anonymize if needed)
    const dataToStore = privacyComplianceService.prepareForAggregation(
      {
        modelId,
        provider,
        success: metrics.success,
        responseTime: metrics.responseTime,
        tokensUsed: metrics.tokensUsed,
        cost: metrics.cost,
      },
      complianceConfig
    );

    // Store performance record
    await prisma.modelPerformance.create({
      data: {
        organizationId,
        modelId,
        provider,
        success: metrics.success,
        responseTimeMs: metrics.responseTime,
        tokensUsed: metrics.tokensUsed,
        cost: metrics.cost,
        metadata: dataToStore as any,
      },
    });

    // Update aggregated metrics
    await this.updateAggregatedMetrics(organizationId, modelId, provider);
  }

  /**
   * Record prediction feedback
   */
  async recordFeedback(feedback: PredictionFeedback): Promise<void> {
    await prisma.predictionFeedback.create({
      data: {
        predictionId: feedback.predictionId,
        wasCorrect: feedback.wasCorrect,
        actualOutcome: feedback.actualOutcome as any,
        feedbackType: feedback.feedbackType,
        confidenceAtPrediction: feedback.confidenceAtPrediction,
        userId: feedback.userId,
        timestamp: feedback.timestamp,
      },
    });

    // Update confidence scores based on feedback
    await this.updateConfidenceFromFeedback(feedback);
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(
    organizationId: string,
    modelId?: string
  ): Promise<ModelPerformanceMetrics[]> {
    const where: { organizationId: string; modelId?: string } = { organizationId };
    if (modelId) {
      where.modelId = modelId;
    }

    const performances = await prisma.modelPerformance.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Last 1000 records for aggregation
    });

    // Aggregate metrics - map Prisma records to expected format
    return this.aggregatePerformanceMetrics(performances.map(p => ({
      modelId: p.modelId,
      provider: p.provider,
      success: p.success,
      responseTimeMs: p.responseTimeMs,
      tokensUsed: p.tokensUsed,
      cost: Number(p.cost),
    })));
  }

  /**
   * Calculate confidence score for a prediction
   */
  async calculateConfidenceScore(
    _predictionType: string,
    _context: Record<string, unknown>,
    historicalData?: {
      similarPredictions: number;
      accuracyRate: number;
      recentTrend: number;
    }
  ): Promise<ConfidenceScore> {
    // Base confidence starts lower and increases with experience
    let baseConfidence = 0.5;

    if (historicalData) {
      // More similar predictions = higher base confidence
      const experienceFactor = Math.min(historicalData.similarPredictions / 100, 1);
      baseConfidence = 0.3 + (experienceFactor * 0.4);

      // Accuracy multiplier
      const accuracyMultiplier = historicalData.accuracyRate;

      // Recency multiplier (recent data weighted more)
      const recencyMultiplier = Math.min(historicalData.recentTrend, 1.2);

      const finalConfidence = Math.min(
        baseConfidence * accuracyMultiplier * recencyMultiplier,
        0.99
      );

      return {
        baseConfidence,
        experienceMultiplier: experienceFactor,
        accuracyMultiplier: historicalData.accuracyRate,
        recencyMultiplier: historicalData.recentTrend,
        finalConfidence,
        trustLevel: this.getTrustLevel(finalConfidence),
      };
    }

    return {
      baseConfidence,
      experienceMultiplier: 0,
      accuracyMultiplier: 1,
      recencyMultiplier: 1,
      finalConfidence: baseConfidence,
      trustLevel: 'low',
    };
  }

  /**
   * Get trust level from confidence score
   */
  private getTrustLevel(confidence: number): ConfidenceScore['trustLevel'] {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.75) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Generate aggregated insights
   */
  async generateInsights(
    organizationId: string,
    insightType?: AggregatedInsight['insightType']
  ): Promise<AggregatedInsight[]> {
    const complianceConfig = privacyComplianceService.getConfig(organizationId);

    // Get aggregated data (respecting compliance)
    const aggregatedData = await this.getAggregatedData(organizationId, complianceConfig);

    const insights: AggregatedInsight[] = [];

    // Pattern detection
    if (!insightType || insightType === 'pattern') {
      const patterns = await this.detectPatterns(aggregatedData);
      insights.push(...patterns);
    }

    // Anomaly detection
    if (!insightType || insightType === 'anomaly') {
      const anomalies = await this.detectAnomalies(aggregatedData);
      insights.push(...anomalies);
    }

    // Optimization opportunities
    if (!insightType || insightType === 'optimization') {
      const optimizations = await this.detectOptimizations(aggregatedData);
      insights.push(...optimizations);
    }

    // Store insights
    for (const insight of insights) {
      await prisma.aggregatedInsight.upsert({
        where: { id: insight.id },
        update: {
          confidence: insight.confidence,
          trustLevel: insight.trustLevel,
          dataPoints: insight.dataPoints,
          lastSeen: insight.lastSeen,
          trend: insight.trend,
          metadata: insight.metadata as any,
        },
        create: {
          id: insight.id,
          organizationId,
          insightType: insight.insightType,
          confidence: insight.confidence,
          trustLevel: insight.trustLevel,
          dataPoints: insight.dataPoints,
          firstSeen: insight.firstSeen,
          lastSeen: insight.lastSeen,
          trend: insight.trend,
          metadata: insight.metadata as any,
        },
      });
    }

    return insights;
  }

  /**
   * Update aggregated metrics
   */
  private async updateAggregatedMetrics(
    organizationId: string,
    modelId: string,
    provider: string
  ): Promise<void> {
    const recentPerformances = await prisma.modelPerformance.findMany({
      where: {
        organizationId,
        modelId,
        provider,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    if (recentPerformances.length === 0) return;

    const total = recentPerformances.length;
    const successful = recentPerformances.filter((p) => p.success).length;
    const avgResponseTime =
      recentPerformances.reduce((sum, p) => sum + p.responseTimeMs, 0) / total;
    const avgTokens =
      recentPerformances.reduce((sum, p) => sum + p.tokensUsed, 0) / total;
    const avgCost = recentPerformances.reduce((sum, p) => sum + Number(p.cost), 0) / total;

    // Calculate accuracy from feedback
    const feedbacks = await prisma.predictionFeedback.findMany({
      where: {
        predictionId: {
          in: recentPerformances
            .map((p) => p.predictionId)
            .filter((id): id is string => id !== null),
        },
      },
    });

    const accuracyScore =
      feedbacks.length > 0
        ? feedbacks.filter((f) => f.wasCorrect).length / feedbacks.length
        : 0.8; // Default if no feedback

    // Calculate confidence and trust scores
    const experienceFactor = Math.min(total / 100, 1);
    const confidenceScore = Math.min(0.5 + accuracyScore * 0.3 + experienceFactor * 0.2, 0.99);
    const trustScore = Math.min(
      confidenceScore * (successful / total) * (1 + experienceFactor * 0.1),
      0.99
    );

    // Store aggregated metrics
    await prisma.modelPerformanceAggregate.upsert({
      where: {
        organizationId_modelId_provider: {
          organizationId,
          modelId,
          provider,
        },
      },
      update: {
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: total - successful,
        averageResponseTime: avgResponseTime,
        averageTokensUsed: avgTokens,
        averageCost: avgCost,
        accuracyScore,
        confidenceScore,
        trustScore,
        lastUpdated: new Date(),
      },
      create: {
        organizationId,
        modelId,
        provider,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: total - successful,
        averageResponseTime: avgResponseTime,
        averageTokensUsed: avgTokens,
        averageCost: avgCost,
        accuracyScore,
        confidenceScore,
        trustScore,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Aggregate performance metrics
   */
  private aggregatePerformanceMetrics(
    performances: Array<{
      modelId: string;
      provider: string;
      success: boolean;
      responseTimeMs: number;
      tokensUsed: number;
      cost: number;
    }>
  ): ModelPerformanceMetrics[] {
    const grouped = new Map<string, typeof performances>();

    for (const perf of performances) {
      const key = `${perf.modelId}:${perf.provider}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(perf);
    }

    return Array.from(grouped.entries()).map(([key, perfs]) => {
      const [modelId, provider] = key.split(':');
      const total = perfs.length;
      const successful = perfs.filter((p) => p.success).length;
      const avgResponseTime = perfs.reduce((sum, p) => sum + p.responseTimeMs, 0) / total;
      const avgTokens = perfs.reduce((sum, p) => sum + p.tokensUsed, 0) / total;
      const avgCost = perfs.reduce((sum, p) => sum + Number(p.cost), 0) / total;

      return {
        modelId,
        provider,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: total - successful,
        averageResponseTime: avgResponseTime,
        averageTokensUsed: avgTokens,
        averageCost: avgCost,
        accuracyScore: 0.8, // Would be calculated from feedback
        confidenceScore: 0.7,
        trustScore: 0.75,
        lastUpdated: new Date(),
      };
    });
  }

  /**
   * Update confidence from feedback
   */
  private async updateConfidenceFromFeedback(feedback: PredictionFeedback): Promise<void> {
    // Find related performance records
    const performances = await prisma.modelPerformance.findMany({
      where: {
        predictionId: feedback.predictionId,
      },
    });

    for (const perf of performances) {
      // Recalculate confidence based on feedback
      await this.updateAggregatedMetrics(
        perf.organizationId,
        perf.modelId,
        perf.provider
      );
    }
  }

  /**
   * Get aggregated data (compliant)
   */
  private async getAggregatedData(
    organizationId: string,
    config: ComplianceConfig
  ): Promise<Record<string, unknown>[]> {
    // Get data within aggregation window
    const windowStart = new Date(Date.now() - config.aggregationWindow * 24 * 60 * 60 * 1000);

    const performances = await prisma.modelPerformance.findMany({
      where: {
        organizationId,
        timestamp: { gte: windowStart },
      },
      take: 10000, // Limit for performance
    });

    // Anonymize if needed
    return performances.map((p) =>
      privacyComplianceService.prepareForAggregation(
        {
          modelId: p.modelId,
          provider: p.provider,
          success: p.success,
          responseTime: p.responseTimeMs,
          tokensUsed: p.tokensUsed,
          cost: Number(p.cost),
        },
        config
      )
    );
  }

  /**
   * Detect patterns in aggregated data
   */
  private async detectPatterns(
    data: Record<string, unknown>[]
  ): Promise<AggregatedInsight[]> {
    const insights: AggregatedInsight[] = [];

    // Group by model
    const byModel = new Map<string, typeof data>();
    for (const item of data) {
      const modelId = `${item.modelId}:${item.provider}`;
      if (!byModel.has(modelId)) {
        byModel.set(modelId, []);
      }
      byModel.get(modelId)!.push(item);
    }

    // Detect patterns
    for (const [modelId, modelData] of byModel.entries()) {
      if (modelData.length < 10) continue; // Need minimum data points

      const successRate =
        modelData.filter((d) => d.success).length / modelData.length;

      if (successRate > 0.95) {
        insights.push({
          id: `pattern-${modelId}-high-success`,
          insightType: 'pattern',
          confidence: Math.min(0.5 + modelData.length / 200, 0.95),
          trustLevel: Math.min(0.5 + modelData.length / 200, 0.95),
          dataPoints: modelData.length,
          firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastSeen: new Date(),
          trend: 'stable',
          metadata: {
            modelId,
            pattern: 'high_success_rate',
            successRate,
          },
        });
      }
    }

    return insights;
  }

  /**
   * Detect anomalies
   */
  private async detectAnomalies(
    data: Record<string, unknown>[]
  ): Promise<AggregatedInsight[]> {
    const insights: AggregatedInsight[] = [];

    // Detect sudden changes in success rate
    const recentData = data.filter(
      (d) => new Date(d.timestamp as string).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    const olderData = data.filter(
      (d) => new Date(d.timestamp as string).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    if (recentData.length > 0 && olderData.length > 0) {
      const recentSuccessRate = recentData.filter((d) => d.success).length / recentData.length;
      const olderSuccessRate = olderData.filter((d) => d.success).length / olderData.length;

      if (Math.abs(recentSuccessRate - olderSuccessRate) > 0.2) {
        insights.push({
          id: `anomaly-success-rate-change`,
          insightType: 'anomaly',
          confidence: 0.7,
          trustLevel: 0.7,
          dataPoints: recentData.length + olderData.length,
          firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastSeen: new Date(),
          trend: recentSuccessRate > olderSuccessRate ? 'increasing' : 'decreasing',
          metadata: {
            recentSuccessRate,
            olderSuccessRate,
            change: recentSuccessRate - olderSuccessRate,
          },
        });
      }
    }

    return insights;
  }

  /**
   * Detect optimization opportunities
   */
  private async detectOptimizations(
    data: Record<string, unknown>[]
  ): Promise<AggregatedInsight[]> {
    const insights: AggregatedInsight[] = [];

    // Group by model and calculate averages
    const byModel = new Map<string, typeof data>();
    for (const item of data) {
      const modelId = `${item.modelId}:${item.provider}`;
      if (!byModel.has(modelId)) {
        byModel.set(modelId, []);
      }
      byModel.get(modelId)!.push(item);
    }

    for (const [modelId, modelData] of byModel.entries()) {
      if (modelData.length < 20) continue;

      const avgTokens = modelData.reduce((sum, d) => sum + (d.tokensUsed as number), 0) / modelData.length;
      const avgCost = modelData.reduce((sum, d) => sum + (d.cost as number), 0) / modelData.length;

      // Flag high token usage
      if (avgTokens > 50000) {
        insights.push({
          id: `optimization-${modelId}-high-tokens`,
          insightType: 'optimization',
          confidence: 0.8,
          trustLevel: 0.8,
          dataPoints: modelData.length,
          firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastSeen: new Date(),
          trend: 'stable',
          metadata: {
            modelId,
            averageTokens: avgTokens,
            averageCost: avgCost,
            suggestion: 'Consider using smaller context windows or model',
          },
        });
      }
    }

    return insights;
  }
}

export const selfLearningService = new SelfLearningService();
