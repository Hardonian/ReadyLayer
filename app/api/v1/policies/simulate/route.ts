/**
 * POST /api/v1/policies/simulate
 * Policy Impact Simulation Engine
 * Replays proposed policy rule changes across historical PR runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../../lib/authz';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../observability/logging';
import { errorResponse, successResponse, parseJsonBody } from '../../../../../lib/api-route-helpers';
import { z } from 'zod';

const simulatePolicySchema = z.object({
  organizationId: z.string(),
  repositoryId: z.string().optional(),
  prCount: z.number().int().min(1).max(200).default(50),
  proposedRules: z.array(
    z.object({
      ruleId: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      action: z.enum(['block', 'warn', 'ignore']).default('block'),
    })
  ).min(1),
});

interface FindingItem {
  ruleId?: string;
  rule_id?: string;
  severity?: string;
  file?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `sim_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const validation = simulatePolicySchema.safeParse(bodyResult.data);
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid simulation configuration', 400, {
        errors: validation.error.issues,
      });
    }

    const { organizationId, repositoryId, prCount, proposedRules } = validation.data;

    // Fetch historical reviews for analysis
    const historicalReviews = await prisma.review.findMany({
      where: {
        repository: repositoryId
          ? { id: repositoryId, organizationId }
          : { organizationId },
      },
      orderBy: { createdAt: 'desc' },
      take: prCount,
      select: {
        id: true,
        prNumber: true,
        prSha: true,
        prTitle: true,
        status: true,
        isBlocked: true,
        issuesFound: true,
        createdAt: true,
      },
    });

    if (historicalReviews.length === 0) {
      return successResponse({
        totalSimulatedPRs: 0,
        historicalBlockedCount: 0,
        simulatedBlockedCount: 0,
        historicalBlockRate: '0.0%',
        simulatedBlockRate: '0.0%',
        newBlocksCount: 0,
        newPassesCount: 0,
        topTriggeredRules: [],
        evaluations: [],
        message: 'No historical PR reviews found for this repository/organization to simulate against.',
      });
    }

    // Build lookup for blocking rules
    const blockingRuleIds = new Set(
      proposedRules.filter((r) => r.action === 'block').map((r) => r.ruleId.toLowerCase())
    );

    let historicalBlockedCount = 0;
    let simulatedBlockedCount = 0;
    let newBlocksCount = 0;
    let newPassesCount = 0;
    const ruleTriggerCounts: Record<string, number> = {};

    const evaluations = historicalReviews.map((review) => {
      const issues = Array.isArray(review.issuesFound)
        ? (review.issuesFound as unknown as FindingItem[])
        : [];

      if (review.isBlocked) {
        historicalBlockedCount++;
      }

      // Check if any finding triggers proposed blocking rules
      const triggeredRules: string[] = [];
      for (const issue of issues) {
        const ruleId = (issue.ruleId || issue.rule_id || '').toLowerCase();
        if (blockingRuleIds.has(ruleId)) {
          triggeredRules.push(ruleId);
          ruleTriggerCounts[ruleId] = (ruleTriggerCounts[ruleId] || 0) + 1;
        }
      }

      const wouldBeBlocked = triggeredRules.length > 0;
      if (wouldBeBlocked) {
        simulatedBlockedCount++;
      }

      const isNewBlock = !review.isBlocked && wouldBeBlocked;
      const isNewPass = review.isBlocked && !wouldBeBlocked;

      if (isNewBlock) newBlocksCount++;
      if (isNewPass) newPassesCount++;

      return {
        reviewId: review.id,
        prNumber: review.prNumber,
        prTitle: review.prTitle || `PR #${review.prNumber}`,
        historicalBlocked: review.isBlocked,
        simulatedBlocked: wouldBeBlocked,
        statusChange: isNewBlock ? 'NEW_BLOCK' : isNewPass ? 'NEW_PASS' : 'UNCHANGED',
        triggeredRules,
        issuesCount: issues.length,
        createdAt: review.createdAt,
      };
    });

    const total = historicalReviews.length;
    const historicalBlockRate = `${((historicalBlockedCount / total) * 100).toFixed(1)}%`;
    const simulatedBlockRate = `${((simulatedBlockedCount / total) * 100).toFixed(1)}%`;

    const topTriggeredRules = Object.entries(ruleTriggerCounts)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);

    log.info(
      {
        total,
        historicalBlockedCount,
        simulatedBlockedCount,
        newBlocksCount,
      },
      'Policy impact simulation completed'
    );

    return successResponse({
      totalSimulatedPRs: total,
      historicalBlockedCount,
      simulatedBlockedCount,
      historicalBlockRate,
      simulatedBlockRate,
      newBlocksCount,
      newPassesCount,
      topTriggeredRules,
      evaluations: evaluations.slice(0, 25), // Return top 25 detailed records
    });
  } catch (error) {
    log.error(error, 'Policy simulation failed');
    return errorResponse(
      'SIMULATION_FAILED',
      error instanceof Error ? error.message : 'Unknown error during policy simulation',
      500
    );
  }
}
