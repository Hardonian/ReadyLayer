/**
 * Predictive Detection Service
 * 
 * Uses self-learning data to make predictive detections
 * Confidence and trust scores improve experientially
 */

import { selfLearningService, ConfidenceScore } from '../self-learning';
import { prisma } from '../../lib/prisma';

export interface PredictiveAlert {
  id: string;
  type: 'anomaly' | 'drift' | 'token_waste' | 'repeated_mistake' | 'security' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: ConfidenceScore;
  prediction: string;
  rationale: string;
  suggestedAction: string;
  estimatedLikelihood: number; // 0-1
  historicalAccuracy?: number; // Based on similar past predictions
  dataPoints: number; // Supporting data points
  createdAt: Date;
}

export interface DetectionContext {
  repositoryId?: string;
  organizationId: string;
  codeContext?: string;
  recentActivity?: Array<{
    type: string;
    timestamp: Date;
    metadata: Record<string, unknown>;
  }>;
  historicalPatterns?: Array<{
    pattern: string;
    frequency: number;
    lastSeen: Date;
  }>;
}

export class PredictiveDetectionService {
  /**
   * Predict potential issues before they occur
   */
  async predictIssues(context: DetectionContext): Promise<PredictiveAlert[]> {
    const alerts: PredictiveAlert[] = [];

    // Get historical data for this context
    const historicalData = await this.getHistoricalData(context);

    // Get model performance to calculate confidence
    const _modelPerformance = await selfLearningService.getModelPerformance(
      context.organizationId
    );

    // Predict drift
    const driftAlert = await this.predictDrift(context, historicalData, _modelPerformance);
    if (driftAlert) alerts.push(driftAlert);

    // Predict token waste
    const tokenWasteAlert = await this.predictTokenWaste(
      context,
      historicalData,
      _modelPerformance
    );
    if (tokenWasteAlert) alerts.push(tokenWasteAlert);

    // Predict repeated mistakes
    const mistakeAlert = await this.predictRepeatedMistakes(
      context,
      historicalData,
      _modelPerformance
    );
    if (mistakeAlert) alerts.push(mistakeAlert);

    // Predict security issues
    const securityAlert = await this.predictSecurityIssues(
      context,
      historicalData,
      _modelPerformance
    );
    if (securityAlert) alerts.push(securityAlert);

    // Store predictions for feedback loop
    await this.storePredictions(alerts, context);

    return alerts;
  }

  /**
   * Predict documentation drift
   */
  private async predictDrift(
    context: DetectionContext,
    historicalData: Record<string, unknown>[],
    _modelPerformance: unknown[]
  ): Promise<PredictiveAlert | null> {
    // Check for patterns suggesting upcoming drift
    const recentDocs = await prisma.doc.findMany({
      where: {
        repositoryId: context.repositoryId || undefined,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentDocs.length === 0) return null;

    // Check if code changes are happening faster than doc updates
    const recentReviews = await prisma.review.findMany({
      where: {
        repositoryId: context.repositoryId || undefined,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      take: 20,
    });

    const docUpdateRate = recentDocs.length / 7; // Docs per day
    const codeChangeRate = recentReviews.length / 7; // Changes per day

    if (codeChangeRate > docUpdateRate * 2) {
      // Code changing faster than docs - drift likely
      const confidence = await selfLearningService.calculateConfidenceScore(
        'drift_prediction',
        context as unknown as Record<string, unknown>,
        {
          similarPredictions: historicalData.length,
          accuracyRate: 0.75, // Would come from feedback
          recentTrend: 1.0,
        }
      );

      return {
        id: `predict-drift-${context.repositoryId || context.organizationId}`,
        type: 'drift',
        severity: 'medium',
        confidence,
        prediction: 'Documentation drift likely within next 7 days',
        rationale: `Code changes (${codeChangeRate.toFixed(1)}/day) are happening ${(
          codeChangeRate / docUpdateRate
        ).toFixed(1)}x faster than documentation updates (${docUpdateRate.toFixed(1)}/day)`,
        suggestedAction: 'Schedule documentation review or enable auto-sync',
        estimatedLikelihood: Math.min(codeChangeRate / docUpdateRate / 2, 0.9),
        historicalAccuracy: 0.75,
        dataPoints: recentReviews.length + recentDocs.length,
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Predict token waste
   */
  private async predictTokenWaste(
    context: DetectionContext,
    historicalData: Record<string, unknown>[],
    _modelPerformance: unknown[]
  ): Promise<PredictiveAlert | null> {
    // Check recent token usage
    const recentUsage = await prisma.tokenUsage.findMany({
      where: {
        organizationId: context.organizationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (recentUsage.length === 0) return null;

    const avgWaste = recentUsage.reduce((sum, u) => sum + Number(u.wastePercentage || 0), 0) / recentUsage.length;
    const avgTokens = recentUsage.reduce((sum, u) => sum + u.totalTokens, 0) / recentUsage.length;

    if (avgWaste > 20 && avgTokens > 30000) {
      const confidence = await selfLearningService.calculateConfidenceScore(
        'token_waste_prediction',
        context as unknown as Record<string, unknown>,
        {
          similarPredictions: historicalData.length,
          accuracyRate: 0.8,
          recentTrend: 1.0,
        }
      );

      return {
        id: `predict-token-waste-${context.organizationId}`,
        type: 'token_waste',
        severity: 'medium',
        confidence,
        prediction: 'Token waste likely to continue or increase',
        rationale: `Average waste is ${avgWaste.toFixed(1)}% with ${avgTokens.toLocaleString()} tokens per request`,
        suggestedAction: 'Review context window sizes and implement chunking',
        estimatedLikelihood: Math.min(avgWaste / 30, 0.9),
        historicalAccuracy: 0.8,
        dataPoints: recentUsage.length,
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Predict repeated mistakes
   */
  private async predictRepeatedMistakes(
    context: DetectionContext,
    historicalData: Record<string, unknown>[],
    _modelPerformance: unknown[]
  ): Promise<PredictiveAlert | null> {
    // Check for violation patterns
    const recentViolations = await prisma.violation.findMany({
      where: {
        repositoryId: context.repositoryId || undefined,
        detectedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: 100,
    });

    if (recentViolations.length < 5) return null;

    // Group by rule
    const ruleGroups = new Map<string, typeof recentViolations>();
    for (const violation of recentViolations) {
      if (!ruleGroups.has(violation.ruleId)) {
        ruleGroups.set(violation.ruleId, []);
      }
      ruleGroups.get(violation.ruleId)!.push(violation);
    }

    // Find rules with increasing frequency
    for (const [ruleId, violations] of ruleGroups.entries()) {
      if (violations.length < 3) continue;

      // Check trend
      const recent = violations.filter(
        (v) => v.detectedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length;
      const older = violations.length - recent;

      if (recent > older && recent >= 3) {
        const confidence = await selfLearningService.calculateConfidenceScore(
          'repeated_mistake_prediction',
          context as unknown as Record<string, unknown>,
          {
            similarPredictions: historicalData.length,
            accuracyRate: 0.85,
            recentTrend: 1.1,
          }
        );

        return {
          id: `predict-mistake-${ruleId}`,
          type: 'repeated_mistake',
          severity: 'high',
          confidence,
          prediction: `${ruleId} violations likely to continue`,
          rationale: `Rule ${ruleId} triggered ${recent} times in last 7 days vs ${older} in previous period`,
          suggestedAction: `Add explicit check for ${ruleId} in system prompt or add linting rule`,
          estimatedLikelihood: Math.min(recent / (older + 1), 0.95),
          historicalAccuracy: 0.85,
          dataPoints: violations.length,
          createdAt: new Date(),
        };
      }
    }

    return null;
  }

  /**
   * Predict security issues
   */
  private async predictSecurityIssues(
    context: DetectionContext,
    historicalData: Record<string, unknown>[],
    _modelPerformance: unknown[]
  ): Promise<PredictiveAlert | null> {
    // Check for security violation patterns
    const recentSecurityViolations = await prisma.violation.findMany({
      where: {
        repositoryId: context.repositoryId || undefined,
        severity: 'critical',
        ruleId: {
          contains: 'security',
        },
        detectedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    if (recentSecurityViolations.length === 0) return null;

    // Check if security issues are increasing
    const recent = recentSecurityViolations.filter(
      (v) => v.detectedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const older = recentSecurityViolations.length - recent;

    if (recent > 0 && recent >= older) {
      const confidence = await selfLearningService.calculateConfidenceScore(
        'security_prediction',
        context as unknown as Record<string, unknown>,
        {
          similarPredictions: historicalData.length,
          accuracyRate: 0.9, // Security predictions are high accuracy
          recentTrend: 1.2,
        }
      );

      return {
        id: `predict-security-${context.repositoryId || context.organizationId}`,
        type: 'security',
        severity: 'critical',
        confidence,
        prediction: 'Security issues may increase',
        rationale: `${recent} critical security violations in last 7 days vs ${older} previously`,
        suggestedAction: 'Review security patterns and add stricter checks',
        estimatedLikelihood: Math.min(recent / (older + 1), 0.9),
        historicalAccuracy: 0.9,
        dataPoints: recentSecurityViolations.length,
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Get historical data for context
   */
  private async getHistoricalData(
    context: DetectionContext
  ): Promise<Record<string, unknown>[]> {
    // Get recent reviews, violations, token usage
    const [reviews, violations, tokenUsage] = await Promise.all([
      prisma.review.findMany({
        where: {
          repositoryId: context.repositoryId || undefined,
          repository: context.repositoryId ? undefined : {
            organizationId: context.organizationId,
          },
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        take: 100,
      }),
      prisma.violation.findMany({
        where: {
          repositoryId: context.repositoryId || undefined,
          detectedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        take: 200,
      }),
      prisma.tokenUsage.findMany({
        where: {
          organizationId: context.organizationId,
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        take: 100,
      }),
    ]);

    return [
      ...reviews.map((r) => ({
        type: 'review',
        timestamp: r.createdAt,
        data: r.summary,
      })),
      ...violations.map((v) => ({
        type: 'violation',
        timestamp: v.detectedAt,
        data: { ruleId: v.ruleId, severity: v.severity },
      })),
      ...tokenUsage.map((t) => ({
        type: 'token_usage',
        timestamp: t.createdAt,
        data: { tokens: t.totalTokens, waste: t.wastePercentage },
      })),
    ];
  }

  /**
   * Store predictions for feedback loop
   */
  private async storePredictions(
    alerts: PredictiveAlert[],
    context: DetectionContext
  ): Promise<void> {
    for (const alert of alerts) {
      // Store predictive alert
      await prisma.predictiveAlert.create({
        data: {
          organizationId: context.organizationId,
          repositoryId: context.repositoryId || null,
          alertType: alert.type,
          severity: alert.severity,
          confidence: alert.confidence.finalConfidence,
          trustLevel: alert.confidence.trustLevel,
          prediction: alert.prediction,
          rationale: alert.rationale,
          suggestedAction: alert.suggestedAction,
          estimatedLikelihood: alert.estimatedLikelihood,
          historicalAccuracy: alert.historicalAccuracy || null,
          dataPoints: alert.dataPoints,
          metadata: {
            confidence: alert.confidence,
          } as any,
        },
      });
    }
  }

  /**
   * Record outcome of prediction (for learning)
   */
  async recordOutcome(
    predictionId: string,
    wasCorrect: boolean,
    actualOutcome?: unknown
  ): Promise<void> {
    await selfLearningService.recordFeedback({
      predictionId,
      wasCorrect,
      actualOutcome,
      feedbackType: 'outcome_based',
      confidenceAtPrediction: 0.7, // Would be fetched from prediction
      timestamp: new Date(),
    });
  }
}

export const predictiveDetectionService = new PredictiveDetectionService();
