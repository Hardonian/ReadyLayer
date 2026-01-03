/**
 * Cultural Lock-In Artifacts Service
 * 
 * Generates first-class artifacts that shift behavior:
 * - Merge Confidence Certificate
 * - Readiness Score™ per repository
 * - AI Risk Exposure Index™ per organization
 * 
 * These artifacts make ReadyLayer's absence visible and create
 * cultural lock-in through visible trust signals.
 */

import { prisma } from '../../lib/prisma';
// import { policyEngineService } from '../policy-engine'; // Reserved for future use

export interface MergeConfidenceCertificate {
  reviewId: string;
  repositoryId: string;
  prNumber: number;
  prSha: string;
  confidenceScore: number; // 0-100
  readinessLevel: 'ready' | 'needs_review' | 'blocked';
  gatesPassed: {
    reviewGuard: boolean;
    testEngine: boolean;
    docSync: boolean;
  };
  policyVersion: string;
  policyChecksum: string;
  evaluatedAt: Date;
  certificateId: string; // Unique certificate ID
  evidenceBundleId?: string;
}

export interface ReadinessScore {
  repositoryId: string;
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor';
  factors: {
    gatePassRate: number; // 0-1
    averageConfidence: number; // 0-1
    policyCompliance: number; // 0-1
    testCoverage: number; // 0-1
    docSync: number; // 0-1
  };
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface AIRiskExposureIndex {
  organizationId: string;
  index: number; // 0-100 (higher = more risk)
  level: 'low' | 'moderate' | 'high' | 'critical';
  factors: {
    aiTouchedPercentage: number; // 0-1
    unreviewedMerges: number;
    averageConfidence: number; // 0-1
    criticalFindingsRate: number; // 0-1
  };
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

/**
 * Cultural Lock-In Artifacts Service
 * 
 * Generates artifacts that make ReadyLayer indispensable and visible.
 */
export class CulturalArtifactsService {
  /**
   * Generate Merge Confidence Certificate
   * 
   * Creates a certificate that proves a PR was reviewed by ReadyLayer.
   * Absence of this certificate indicates unreviewed code.
   */
  async generateMergeConfidenceCertificate(
    reviewId: string,
    _runId?: string
  ): Promise<MergeConfidenceCertificate> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        evidenceBundle: true,
        repository: true,
      },
    });

    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(review);

    // Determine readiness level
    const readinessLevel =
      review.isBlocked || review.status === 'blocked'
        ? 'blocked'
        : confidenceScore >= 80
        ? 'ready'
        : 'needs_review';

    // Get policy info
    const evidenceBundle = review.evidenceBundle;
    const policyChecksum = evidenceBundle?.policyChecksum || 'unknown';
    const policyVersion = await this.getPolicyVersion(review.repositoryId, policyChecksum);

    // Generate certificate ID
    const certificateId = `cert_${review.id}_${Date.now()}`;

    const certificate: MergeConfidenceCertificate = {
      reviewId: review.id,
      repositoryId: review.repositoryId,
      prNumber: review.prNumber,
      prSha: review.prSha,
      confidenceScore,
      readinessLevel,
      gatesPassed: {
        reviewGuard: review.status === 'completed' && !review.isBlocked,
        testEngine: false, // Would check test engine results
        docSync: false, // Would check doc sync results
      },
      policyVersion,
      policyChecksum,
      evaluatedAt: review.completedAt || review.createdAt,
      certificateId,
      evidenceBundleId: evidenceBundle?.id,
    };

    // Store certificate (could be in a separate table)
    // For now, return it

    return certificate;
  }

  /**
   * Calculate Readiness Score for a repository
   */
  async calculateReadinessScore(repositoryId: string): Promise<ReadinessScore> {
    // Get recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reviews = await prisma.review.findMany({
      where: {
        repositoryId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate factors
    const gatePassRate = reviews.length > 0
      ? reviews.filter((r) => !r.isBlocked && r.status === 'completed').length / reviews.length
      : 1;

    const averageConfidence = reviews.length > 0
      ? reviews.reduce((sum, r) => {
          const score = this.calculateConfidenceScore(r);
          return sum + score;
        }, 0) / reviews.length / 100
      : 1;

    // Policy compliance (would check policy violations)
    const policyCompliance = 0.9; // Placeholder

    // Test coverage (would check test engine results)
    const testCoverage = 0.85; // Placeholder

    // Doc sync (would check doc sync results)
    const docSync = 0.9; // Placeholder

    // Calculate overall score
    const score = Math.round(
      (gatePassRate * 0.3 +
        averageConfidence * 0.3 +
        policyCompliance * 0.2 +
        testCoverage * 0.1 +
        docSync * 0.1) *
        100
    );

    // Determine level
    const level =
      score >= 90
        ? 'excellent'
        : score >= 75
        ? 'good'
        : score >= 60
        ? 'fair'
        : 'poor';

    // Calculate trend (compare last 15 days vs previous 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentReviews = reviews.filter((r) => r.createdAt >= fifteenDaysAgo);
    const olderReviews = reviews.filter((r) => r.createdAt < fifteenDaysAgo);

    const recentScore =
      recentReviews.length > 0
        ? recentReviews.filter((r) => !r.isBlocked).length / recentReviews.length
        : 1;
    const olderScore =
      olderReviews.length > 0
        ? olderReviews.filter((r) => !r.isBlocked).length / olderReviews.length
        : 1;

    const trend =
      recentScore > olderScore * 1.1
        ? 'improving'
        : recentScore < olderScore * 0.9
        ? 'declining'
        : 'stable';

    return {
      repositoryId,
      score,
      level,
      factors: {
        gatePassRate,
        averageConfidence,
        policyCompliance,
        testCoverage,
        docSync,
      },
      trend,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate AI Risk Exposure Index for an organization
   */
  async calculateAIRiskExposureIndex(organizationId: string): Promise<AIRiskExposureIndex> {
    // Get all repositories
    const repositories = await prisma.repository.findMany({
      where: { organizationId },
    });

    // Get recent runs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const runs = await prisma.readyLayerRun.findMany({
      where: {
        repositoryId: { in: repositories.map((_r) => _r.id) },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate factors
    const aiTouchedPercentage =
      runs.length > 0
        ? runs.filter((r) => r.aiTouchedDetected).length / runs.length
        : 0;

    // Count unreviewed merges (would need to track this)
    const unreviewedMerges = 0; // Placeholder

    const averageConfidence =
      runs.length > 0
        ? runs.reduce((sum, _r) => {
            // Would calculate from review results
            return sum + 0.8;
          }, 0) / runs.length
        : 0.8;

    // Critical findings rate
    const reviews = await prisma.review.findMany({
      where: {
        repositoryId: { in: repositories.map((r) => r.id) },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const criticalFindingsRate =
      reviews.length > 0
        ? reviews.filter((r) => {
            const summary = r.summary as { critical?: number } | null;
            return (summary?.critical || 0) > 0;
          }).length / reviews.length
        : 0;

    // Calculate index (higher = more risk)
    const index = Math.round(
      (aiTouchedPercentage * 0.3 +
        Math.min(unreviewedMerges / 10, 1) * 0.2 +
        (1 - averageConfidence) * 0.3 +
        criticalFindingsRate * 0.2) *
        100
    );

    // Determine level
    const level =
      index >= 75
        ? 'critical'
        : index >= 50
        ? 'high'
        : index >= 25
        ? 'moderate'
        : 'low';

    // Calculate trend
    const trend = 'stable'; // Would compare periods

    return {
      organizationId,
      index,
      level,
      factors: {
        aiTouchedPercentage,
        unreviewedMerges,
        averageConfidence,
        criticalFindingsRate,
      },
      trend,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate confidence score from review
   */
  private calculateConfidenceScore(review: any): number {
    const summary = review.summary as
      | { total: number; critical: number; high: number; medium: number; low: number }
      | null;

    if (!summary) return 100;

    // Start at 100, deduct for issues
    let score = 100;
    score -= summary.critical * 20;
    score -= summary.high * 10;
    score -= summary.medium * 5;
    score -= summary.low * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get policy version from checksum
   */
  private async getPolicyVersion(repositoryId: string, checksum: string): Promise<string> {
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repo) return 'unknown';

    const policyPack = await prisma.policyPack.findFirst({
      where: {
        organizationId: repo.organizationId,
        repositoryId: repositoryId,
        checksum,
      },
      orderBy: { createdAt: 'desc' },
    });

    return policyPack?.version || 'default';
  }
}

export const culturalArtifactsService = new CulturalArtifactsService();
