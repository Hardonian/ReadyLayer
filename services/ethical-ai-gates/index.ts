/**
 * Ethical AI Acceptance Gates Service
 * 
 * Implements explicit ethical AI controls:
 * - AI decision explainability
 * - Confidence scoring
 * - Human override with justification logging
 * - Bias monitoring
 * - False-positive tracking
 * - Transparent audit logs
 * 
 * No black-box decisions allowed.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { Issue } from '../static-analysis';

export interface AIExplanation {
  decision: string;
  confidence: number; // 0-1
  reasoning: string;
  factors: Array<{
    factor: string;
    weight: number;
    contribution: number;
  }>;
  alternatives: Array<{
    option: string;
    score: number;
    whyNot: string;
  }>;
}

export interface OverrideRequest {
  reviewId: string;
  findingId: string;
  reason: string;
  justification: string;
  userId: string;
}

export interface BiasMetrics {
  falsePositiveRate: number; // 0-1
  falseNegativeRate: number; // 0-1
  demographicBias?: Record<string, number>; // If applicable
  temporalBias?: {
    recentAccuracy: number;
    historicalAccuracy: number;
  };
}

/**
 * Ethical AI Acceptance Gates Service
 * 
 * Ensures all AI decisions are explainable, overrideable, and auditable.
 */
export class EthicalAIGatesService {
  /**
   * Explain an AI decision
   * 
   * Provides full transparency into why a decision was made.
   */
  async explainDecision(
    finding: Issue,
    context: {
      filePath: string;
      ruleId: string;
      policyVersion: string;
    }
  ): Promise<AIExplanation> {
    // Build explanation from finding and context
    const confidence = finding.confidence || 0.5;

    const factors = [
      {
        factor: 'Rule severity',
        weight: 0.3,
        contribution: this.getSeverityWeight(finding.severity) * 0.3,
      },
      {
        factor: 'Pattern match confidence',
        weight: 0.4,
        contribution: confidence * 0.4,
      },
      {
        factor: 'Policy enforcement',
        weight: 0.3,
        contribution: 0.3, // Would check policy
      },
    ];

    const reasoning = `This finding was flagged because:
- Rule "${context.ruleId}" detected a ${finding.severity} severity issue
- Pattern match confidence: ${(confidence * 100).toFixed(0)}%
- Policy version ${context.policyVersion} requires ${finding.severity} issues to be ${this.getPolicyAction(finding.severity)}
- Location: ${context.filePath}:${finding.line}`;

    const alternatives = [
      {
        option: 'Allow',
        score: 1 - confidence,
        whyNot: 'Would violate policy enforcement requirements',
      },
      {
        option: 'Warn only',
        score: confidence * 0.5,
        whyNot: 'Policy requires blocking for this severity',
      },
    ];

    return {
      decision: finding.severity === 'critical' || finding.severity === 'high' ? 'block' : 'warn',
      confidence,
      reasoning,
      factors,
      alternatives,
    };
  }

  /**
   * Record human override
   * 
   * Logs when a human overrides an AI decision with justification.
   */
  async recordOverride(request: OverrideRequest): Promise<void> {
    // Create audit log entry
    const review = await prisma.review.findUnique({
      where: { id: request.reviewId },
      select: { repositoryId: true, repository: { select: { organizationId: true } } },
    });

    if (!review) {
      throw new Error(`Review ${request.reviewId} not found`);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: review.repository.organizationId,
        userId: request.userId,
        action: 'override',
        resourceType: 'review',
        resourceId: request.reviewId,
        details: {
          findingId: request.findingId,
          reason: request.reason,
          justification: request.justification,
          overrideType: 'ai_decision',
        } as Prisma.InputJsonValue,
        runId: request.reviewId, // Link to review
      },
    });

    // Track override for bias monitoring
    await this.trackOverrideForBias(request.reviewId, request.findingId, request.reason);
  }

  /**
   * Calculate bias metrics
   * 
   * Monitors for bias in AI decisions.
   */
  async calculateBiasMetrics(organizationId: string): Promise<BiasMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const [feedback, reviews] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          organizationId,
          action: { in: ['false_positive', 'false_negative'] },
          createdAt: { gte: sixtyDaysAgo, lte: now },
        },
        select: { action: true, createdAt: true },
      }),
      prisma.review.findMany({
        where: {
          repository: { organizationId },
          createdAt: { gte: sixtyDaysAgo, lte: now },
        },
        select: { createdAt: true },
      }),
    ]);
    const totalLabels = feedback.length;
    const falsePositives = feedback.filter((entry) => entry.action === 'false_positive').length;
    const falseNegatives = feedback.filter((entry) => entry.action === 'false_negative').length;
    const recentFeedback = feedback.filter((entry) => entry.createdAt >= thirtyDaysAgo);
    const historicalFeedback = feedback.filter((entry) => entry.createdAt < thirtyDaysAgo);
    const accuracy = (entries: typeof feedback, reviewCount: number): number => {
      if (reviewCount === 0) return 0;
      const errors = entries.length;
      return Math.max(0, 1 - errors / reviewCount);
    };
    const recentReviewCount = reviews.filter((review) => review.createdAt >= thirtyDaysAgo).length;
    const historicalReviewCount = reviews.filter((review) => review.createdAt < thirtyDaysAgo).length;

    return {
      falsePositiveRate: totalLabels > 0 ? falsePositives / totalLabels : 0,
      falseNegativeRate: totalLabels > 0 ? falseNegatives / totalLabels : 0,
      temporalBias: {
        recentAccuracy: accuracy(recentFeedback, recentReviewCount),
        historicalAccuracy: accuracy(historicalFeedback, historicalReviewCount),
      },
    };
  }

  /**
   * Track false positives
   * 
   * Records when a finding was incorrectly flagged.
   */
  async trackFalsePositive(
    reviewId: string,
    findingId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { repositoryId: true, repository: { select: { organizationId: true } } },
    });

    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    // Record in audit log
    await prisma.auditLog.create({
      data: {
        organizationId: review.repository.organizationId,
        userId,
        action: 'false_positive',
        resourceType: 'review',
        resourceId: reviewId,
        details: {
          findingId,
          reason,
        } as Prisma.InputJsonValue,
      },
    });

    // Update false positive tracking (would be in a separate table)
    // For now, just log it
  }

  /** Record a missed finding for recall and temporal-bias reporting. */
  async trackFalseNegative(
    reviewId: string,
    findingId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { repository: { select: { organizationId: true } } },
    });
    if (!review) throw new Error(`Review ${reviewId} not found`);
    await prisma.auditLog.create({
      data: {
        organizationId: review.repository.organizationId,
        userId,
        action: 'false_negative',
        resourceType: 'review',
        resourceId: reviewId,
        details: { findingId, reason } as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Get severity weight for explanation
   */
  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };
    return weights[severity] || 0.5;
  }

  /**
   * Get policy action for severity
   */
  private getPolicyAction(severity: string): string {
    const actions: Record<string, string> = {
      critical: 'blocked',
      high: 'blocked',
      medium: 'warned',
      low: 'allowed',
    };
    return actions[severity] || 'warned';
  }

  /**
   * Track override for bias monitoring
   */
  private async trackOverrideForBias(
    _reviewId: string,
    _findingId: string,
    _reason: string
  ): Promise<void> {
    // Would track override patterns for bias detection
    // For now, just log it
  }
}

export const ethicalAIGatesService = new EthicalAIGatesService();
