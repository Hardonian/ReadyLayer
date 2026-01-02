/**
 * False Positive Tracking
 * 
 * Tracks false positives by monitoring waiver creation
 * Waivers are a proxy for false positives (users waive issues they believe are false)
 */

import { prisma } from '../prisma';
import { logger } from '../../observability/logging';

export interface FalsePositiveMetrics {
  totalWaivers: number;
  waiversByRule: Record<string, number>;
  waiversBySeverity: Record<string, number>;
  averageWaiversPerReview: number;
  falsePositiveRate: number; // Estimated: waivers / total findings
}

/**
 * Track waiver creation (proxy for false positive)
 */
export async function trackWaiverCreated(params: {
  organizationId: string;
  repositoryId: string | null;
  ruleId: string;
  severity: string;
  reviewId?: string;
}): Promise<void> {
  try {
    // Log waiver creation for telemetry
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        action: 'waiver_created',
        resourceType: 'waiver',
        details: {
          ruleId: params.ruleId,
          severity: params.severity,
          repositoryId: params.repositoryId,
          reviewId: params.reviewId,
          trackedAt: new Date().toISOString(),
        },
      },
    });

    logger.info({
      organizationId: params.organizationId,
      ruleId: params.ruleId,
      severity: params.severity,
    }, 'False positive tracked (waiver created)');
  } catch (error) {
    // Don't fail on telemetry errors
    logger.error({ error }, 'Failed to track false positive');
  }
}

/**
 * Get false positive metrics for organization
 */
export async function getFalsePositiveMetrics(
  organizationId: string,
  days: number = 30
): Promise<FalsePositiveMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get all waivers created in time period
  const waivers = await prisma.waiver.findMany({
    where: {
      organizationId,
      createdAt: { gte: since },
    },
    include: {
      repository: true,
    },
  });

  // Get reviews in same period to calculate false positive rate
  const reviews = await prisma.review.findMany({
    where: {
      repository: {
        organizationId,
      },
      createdAt: { gte: since },
    },
    select: {
      id: true,
      issuesFound: true,
    },
  });

  // Calculate total findings
  const totalFindings = reviews.reduce((sum, review) => {
    const issues = Array.isArray(review.issuesFound) ? review.issuesFound : [];
    return sum + issues.length;
  }, 0);

  // Group waivers by rule
  const waiversByRule: Record<string, number> = {};
  const waiversBySeverity: Record<string, number> = {};

  for (const waiver of waivers) {
    waiversByRule[waiver.ruleId] = (waiversByRule[waiver.ruleId] || 0) + 1;
    // Note: Severity not stored in waiver, would need to look up from review
    // For now, use ruleId pattern to infer severity
    const inferredSeverity = inferSeverityFromRuleId(waiver.ruleId);
    waiversBySeverity[inferredSeverity] = (waiversBySeverity[inferredSeverity] || 0) + 1;
  }

  const totalWaivers = waivers.length;
  const averageWaiversPerReview = reviews.length > 0 ? totalWaivers / reviews.length : 0;
  const falsePositiveRate = totalFindings > 0 ? totalWaivers / totalFindings : 0;

  return {
    totalWaivers,
    waiversByRule,
    waiversBySeverity,
    averageWaiversPerReview,
    falsePositiveRate,
  };
}

/**
 * Infer severity from rule ID pattern
 */
function inferSeverityFromRuleId(ruleId: string): string {
  if (ruleId.startsWith('security.')) {
    return 'critical';
  }
  if (ruleId.startsWith('quality.')) {
    return 'high';
  }
  if (ruleId.startsWith('style.')) {
    return 'low';
  }
  return 'medium';
}

/**
 * Get false positive rate for a specific rule
 */
export async function getRuleFalsePositiveRate(
  organizationId: string,
  ruleId: string,
  days: number = 30
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Count waivers for this rule
  const waiverCount = await prisma.waiver.count({
    where: {
      organizationId,
      ruleId,
      createdAt: { gte: since },
    },
  });

  // Count total findings for this rule
  const reviews = await prisma.review.findMany({
    where: {
      repository: {
        organizationId,
      },
      createdAt: { gte: since },
    },
    select: {
      issuesFound: true,
    },
  });

  const totalFindings = reviews.reduce((sum, review) => {
    const issues = Array.isArray(review.issuesFound) ? review.issuesFound : [];
    return sum + issues.filter((issue: unknown) => {
      return typeof issue === 'object' && issue !== null && 'ruleId' in issue && (issue as { ruleId?: string }).ruleId === ruleId;
    }).length;
  }, 0);

  return totalFindings > 0 ? waiverCount / totalFindings : 0;
}
