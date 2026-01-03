/**
 * Metrics API Route
 * 
 * GET /api/v1/metrics - Get metrics (provider-pulled + ReadyLayer-native)
 */

import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for Prisma access
export const runtime = 'nodejs';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../observability/logging';
import { requireAuth } from '../../../../lib/auth';
import { createAuthzMiddleware } from '../../../../lib/authz';

/**
 * GET /api/v1/metrics
 * Get metrics (tenant-isolated)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const repositoryId = searchParams.get('repositoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get user's organization memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        providerMetrics: {},
        readylayerMetrics: {},
        proofMetrics: {},
      });
    }

    // Build where clause
    const orgFilter = organizationId ? organizationId : { in: userOrgIds };
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const repoFilter: {
      organizationId: string | { in: string[] };
      id?: string;
    } = {
      organizationId: orgFilter,
    };
    if (repositoryId) {
      repoFilter.id = repositoryId;
    }

    // ReadyLayer-native metrics
    const runsWhere: {
      repository: typeof repoFilter;
      createdAt?: typeof dateFilter;
    } = {
      repository: repoFilter,
    };
    if (startDate || endDate) {
      runsWhere.createdAt = dateFilter;
    }

    const [runs, reviews, tokenUsage] = await Promise.all([
      prisma.readyLayerRun.findMany({
        where: runsWhere,
        select: {
          id: true,
          status: true,
          conclusion: true,
          reviewGuardStatus: true,
          testEngineStatus: true,
          docSyncStatus: true,
          gatesPassed: true,
          createdAt: true,
          completedAt: true,
          reviewGuardStartedAt: true,
          reviewGuardCompletedAt: true,
          testEngineStartedAt: true,
          testEngineCompletedAt: true,
          docSyncResult: true,
          testEngineResult: true,
        },
      }),
      prisma.review.findMany({
        where: {
          repository: repoFilter,
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true,
          isBlocked: true,
          issuesFound: true,
          createdAt: true,
        },
      }),
      prisma.tokenUsage.findMany({
        where: {
          organizationId: orgFilter,
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        select: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          cost: true,
          service: true,
        },
      }),
    ]);

    // Calculate ReadyLayer metrics
    const now = Date.now();
    const defaultStartDate = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const startTime = startDate ? new Date(startDate).getTime() : defaultStartDate;
    const endTime = endDate ? new Date(endDate).getTime() : now;
    const daysDiff = Math.max(1, (endTime - startTime) / (1000 * 60 * 60 * 24));
    const runsPerDay = runs.length / daysDiff;
    
    const stageDurations = runs
      .filter(r => r.reviewGuardStartedAt && r.reviewGuardCompletedAt)
      .map(r => ({
        reviewGuard: r.reviewGuardCompletedAt!.getTime() - r.reviewGuardStartedAt!.getTime(),
        testEngine: r.testEngineStartedAt && r.testEngineCompletedAt
          ? r.testEngineCompletedAt.getTime() - r.testEngineStartedAt.getTime()
          : null,
      }));

    const p95Duration = (durations: number[]) => {
      if (durations.length === 0) return 0;
      const sorted = durations.sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.95);
      return sorted[index] || 0;
    };

    const findingCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    reviews.forEach(review => {
      const issues = Array.isArray(review.issuesFound) ? review.issuesFound : [];
      issues.forEach((issue) => {
        // Type guard: ensure issue is an object with optional severity property
        if (
          issue !== null &&
          typeof issue === 'object' &&
          !Array.isArray(issue) &&
          'severity' in issue
        ) {
          const severity = (issue as { severity?: unknown }).severity;
          if (
            typeof severity === 'string' &&
            severity in findingCounts
          ) {
            findingCounts[severity as keyof typeof findingCounts] =
              (findingCounts[severity as keyof typeof findingCounts] || 0) + 1;
          }
        }
      });
    });

    const gateBlockRate = runs.length > 0
      ? runs.filter(r => !r.gatesPassed).length / runs.length
      : 0;

    const overrideRate = 0; // Would need to track overrides

    // Token usage metrics
    const totalTokens = tokenUsage.reduce((sum, tu) => sum + tu.totalTokens, 0);
    const totalCost = tokenUsage.reduce((sum, tu) => sum + Number(tu.cost), 0);

    // Proof metrics
    const blockedRiskyMerges = reviews.filter(r => r.isBlocked).length;
    const docsInSync = runs.filter(r => {
      if (r.docSyncStatus !== 'succeeded' || !r.docSyncResult) return false;
      const result = r.docSyncResult as { driftDetected?: boolean };
      return !result.driftDetected;
    }).length;
    const testsGenerated = runs.reduce((sum, r) => {
      const result = r.testEngineResult as { testsGenerated?: number } | null;
      return sum + (result?.testsGenerated || 0);
    }, 0);

    return NextResponse.json({
      providerMetrics: {
        // Would need to fetch from provider APIs
        prCycleTime: null,
        reviewLatency: null,
        approvalsCount: null,
        pipelinePassRate: null,
      },
      readylayerMetrics: {
        runsPerDay: Math.round(runsPerDay * 100) / 100,
        stageDurationP95: {
          reviewGuard: p95Duration(stageDurations.map(d => d.reviewGuard)),
          testEngine: p95Duration(stageDurations.map(d => d.testEngine).filter((d): d is number => d !== null)),
        },
        findingCounts,
        gateBlockRate: Math.round(gateBlockRate * 10000) / 100,
        overrideRate: Math.round(overrideRate * 10000) / 100,
        rerunRate: 0, // Would need to track reruns
        flakyTestRate: 0, // Would need to track flaky tests
      },
      proofMetrics: {
        blockedRiskyMerges,
        docsKeptInSync: docsInSync,
        testsGenerated,
        timeToSignal: 0, // Would need to calculate from run start to first result
      },
      tokenUsage: {
        totalTokens,
        totalCost: Math.round(totalCost * 100) / 100,
        byService: tokenUsage.reduce((acc, tu) => {
          acc[tu.service] = (acc[tu.service] || 0) + tu.totalTokens;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    log.error(error, 'Failed to get metrics');
    return NextResponse.json(
      {
        error: {
          code: 'GET_METRICS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
