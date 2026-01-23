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
import {
  assertConfidenceBounds,
  assertWeightsSumToOne,
} from '../../lib/invariants/assertions';
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

interface ReviewSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ReviewRecord {
  id: string;
  summary: ReviewSummary | null;
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
    const confidenceScore = this.calculateConfidenceScore({ id: review.id, summary: review.summary as ReviewSummary | null });

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

    // P0: Actually check test engine results (not hardcoded)
    const testEngineResult = await prisma.test.findFirst({
      where: {
        repositoryId: review.repositoryId,
        prNumber: review.prNumber,
        prSha: review.prSha,
        status: 'generated',
      },
    });
    const testEnginePassed = testEngineResult !== null && testEngineResult.status === 'generated';

    // P0: Actually check doc sync results (not hardcoded)
    const docSyncResult = await prisma.doc.findFirst({
      where: {
        repositoryId: review.repositoryId,
        ref: review.prSha,
      },
    });
    const docSyncPassed = docSyncResult !== null && !docSyncResult.driftDetected;

    const reviewGuardPassed = review.status === 'completed' && !review.isBlocked;

    // P0: Persist certificate to database (INV-D2: Immutable)
    const persistedCertificate = await prisma.mergeConfidenceCertificate.create({
      data: {
        certificateId,
        reviewId: review.id,
        repositoryId: review.repositoryId,
        prNumber: review.prNumber,
        prSha: review.prSha,
        confidenceScore,
        readinessLevel,
        reviewGuardPassed,
        testEnginePassed,
        docSyncPassed,
        policyVersion,
        policyChecksum,
        evidenceBundleId: evidenceBundle?.id,
        evaluatedAt: review.completedAt || review.createdAt,
      },
    });

    const certificate: MergeConfidenceCertificate = {
      reviewId: persistedCertificate.reviewId,
      repositoryId: persistedCertificate.repositoryId,
      prNumber: persistedCertificate.prNumber,
      prSha: persistedCertificate.prSha,
      confidenceScore: Number(persistedCertificate.confidenceScore),
      readinessLevel,
      gatesPassed: {
        reviewGuard: persistedCertificate.reviewGuardPassed,
        testEngine: persistedCertificate.testEnginePassed,
        docSync: persistedCertificate.docSyncPassed,
      },
      policyVersion: persistedCertificate.policyVersion,
      policyChecksum: persistedCertificate.policyChecksum,
      evaluatedAt: persistedCertificate.evaluatedAt,
      certificateId: persistedCertificate.certificateId,
      evidenceBundleId: persistedCertificate.evidenceBundleId || undefined,
    };

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
          const score = this.calculateConfidenceScore({ id: r.id, summary: r.summary as ReviewSummary | null });
          return sum + score;
        }, 0) / reviews.length / 100
      : 1;

    // P0: Calculate policy compliance from actual violations (no placeholders)
    const violations = await prisma.violation.findMany({
      where: {
        repositoryId,
        detectedAt: { gte: thirtyDaysAgo },
      },
    });
    const criticalViolations = violations.filter((v) => v.severity === 'critical').length;
    const totalViolations = violations.length;
    const policyCompliance = totalViolations > 0
      ? Math.max(0, 1 - (criticalViolations * 0.5 + totalViolations * 0.05))
      : 1;

    // P0: Calculate test coverage from actual test engine results (no placeholders)
    const testRuns = await prisma.testRun.findMany({
      where: {
        repositoryId,
        createdAt: { gte: thirtyDaysAgo },
        status: 'completed',
      },
    });
    const testCoverage = testRuns.length > 0
      ? testRuns.reduce((sum, tr) => {
          const coverage = tr.coverage as { total?: number } | null;
          return sum + (coverage?.total || 0);
        }, 0) / testRuns.length / 100
      : 0;

    // P0: Calculate doc sync from actual doc sync results (no placeholders)
    const docs = await prisma.doc.findMany({
      where: {
        repositoryId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });
    const docSync = docs.length > 0
      ? docs.filter((d) => !d.driftDetected && d.status === 'published').length / docs.length
      : 0;

    // P0: Assert INV-S2 - Readiness score weights sum to 1.0
    const weights = {
      gatePassRate: 0.3,
      averageConfidence: 0.3,
      policyCompliance: 0.2,
      testCoverage: 0.1,
      docSync: 0.1,
    };
    assertWeightsSumToOne(weights, { repositoryId });

    // Calculate overall score
    const score = Math.round(
      (gatePassRate * weights.gatePassRate +
        averageConfidence * weights.averageConfidence +
        policyCompliance * weights.policyCompliance +
        testCoverage * weights.testCoverage +
        docSync * weights.docSync) *
        100
    );

    // P0: Assert INV-D4 - Confidence score bounds (0-100 for display)
    assertConfidenceBounds(score, '0-100', { repositoryId });

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

    // P0: Persist readiness score snapshot (INV-S5: Immutable)
    await prisma.readinessScoreSnapshot.create({
      data: {
        repositoryId,
        score,
        level,
        gatePassRate,
        averageConfidence,
        policyCompliance,
        testCoverage,
        docSync,
        totalReviews: reviews.length,
        period: '30d',
      },
    });

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

    // P0: Count unreviewed merges from actual data (no placeholders)
    const allReviews = await prisma.review.findMany({
      where: {
        repositoryId: { in: repositories.map((r) => r.id) },
        createdAt: { gte: thirtyDaysAgo },
      },
    });
    const unreviewedMerges = allReviews.filter((r) => r.status === 'pending' || r.status === 'failed').length;

    // P0: Calculate average confidence from actual review data (no placeholders)
    const averageConfidence =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => {
            const score = this.calculateConfidenceScore({ id: r.id, summary: r.summary as ReviewSummary | null });
            return sum + score / 100;
          }, 0) / allReviews.length
        : 0;

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

    // Calculate trend (compare last 15 days vs previous 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentRuns = runs.filter((r) => r.createdAt >= fifteenDaysAgo);
    const olderRuns = runs.filter((r) => r.createdAt < fifteenDaysAgo);

    const recentRisk = recentRuns.length > 0
      ? recentRuns.filter((r) => r.aiTouchedDetected && !r.gatesPassed).length / recentRuns.length
      : 0;
    const olderRisk = olderRuns.length > 0
      ? olderRuns.filter((r) => r.aiTouchedDetected && !r.gatesPassed).length / olderRuns.length
      : 0;

    const trend =
      recentRisk < olderRisk * 0.9
        ? 'improving'
        : recentRisk > olderRisk * 1.1
        ? 'declining'
        : 'stable';

    // P0: Calculate orphaned intelligence (AI code without human understanding)
    const orphanedIntelligence = runs.length > 0
      ? runs.filter((r) => {
          const metadata = r.triggerMetadata as { reviewerCount?: number } | null;
          return r.aiTouchedDetected && (metadata?.reviewerCount || 0) === 0;
        }).length / runs.length
      : 0;

    // Calculate review intensity (human review depth)
    const reviewIntensity = allReviews.length > 0
      ? allReviews.reduce((sum, r) => {
          // Higher review duration = higher intensity
          const duration = r.completedAt && r.startedAt
            ? (r.completedAt.getTime() - r.startedAt.getTime()) / (1000 * 60)
            : 0;
          return sum + Math.min(duration / 30, 1); // Cap at 30 minutes
        }, 0) / allReviews.length
      : 0;

    // Calculate test coverage score
    const testCoverageScore = allReviews.length > 0
      ? allReviews.filter((r) => {
          // Check if test coverage is above threshold
          const summary = r.summary as { testCoverage?: number } | null;
          return (summary?.testCoverage || 0) >= 80;
        }).length / allReviews.length
      : 0;

    // Calculate velocity risk (speed vs safety)
    const velocityRisk = runs.length > 0
      ? runs.reduce((sum, r) => {
          const duration = r.completedAt && r.startedAt
            ? (r.completedAt.getTime() - r.startedAt.getTime()) / (1000 * 60)
            : 30;
          // Faster runs (< 5 min) = higher risk, slower runs (> 30 min) = lower risk
          return sum + Math.max(0, 1 - duration / 30);
        }, 0) / runs.length
      : 0;

    // P0: Persist AI Risk Exposure Index to database
    await prisma.aIRiskExposureIndex.create({
      data: {
        organizationId,
        aiAuthorshipPercent: aiTouchedPercentage * 100,
        reviewIntensity,
        testCoverageScore,
        velocityRisk,
        orphanedIntelligence,
        riskIndex: index,
        riskLevel: level,
        totalRepositories: repositories.length,
        period: '30d',
      },
    });

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
  private calculateConfidenceScore(review: ReviewRecord): number {
    const summary = review.summary as
      | { total: number; critical: number; high: number; medium: number; low: number }
      | null;

    if (!summary) {
      // P0: Assert INV-D4 - Confidence score bounds
      assertConfidenceBounds(100, '0-100', { reviewId: review.id });
      return 100;
    }

    // Start at 100, deduct for issues
    let score = 100;
    score -= summary.critical * 20;
    score -= summary.high * 10;
    score -= summary.medium * 5;
    score -= summary.low * 2;

    score = Math.max(0, Math.min(100, score));

    // P0: Assert INV-D4 - Confidence score bounds
    assertConfidenceBounds(score, '0-100', { reviewId: review.id, summary });

    return score;
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
