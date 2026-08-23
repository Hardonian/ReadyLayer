/**
 * Failure Intelligence API Route
 * 
 * GET /api/v1/failure-intelligence - Retrieve failure insights and trends
 * POST /api/v1/failure-intelligence - Record an anonymized failure pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { failureIntelligenceService } from '@/services/failure-intelligence';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';
import { logger } from '@/observability/logging';
import type { Issue } from '@/services/static-analysis';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'failure-intelligence' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['read'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || user.organizationIds[0] || '';

    if (!organizationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' } },
        { status: 400 }
      );
    }

    const insights = await failureIntelligenceService.getInsights(organizationId);

    log.info({ organizationId, insightsCount: insights.length }, 'Fetched failure intelligence insights');

    return NextResponse.json({
      data: {
        organizationId,
        insights,
        totalInsights: insights.length,
        anonymized: true,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch failure intelligence');
    return NextResponse.json(
      {
        error: {
          code: 'FAILURE_INTELLIGENCE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'failure-intelligence' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json() as {
      organizationId?: string;
      repositoryId: string;
      finding: Issue;
      context?: {
        fileExtension?: string;
        language?: string;
        framework?: string;
        isAITouched?: boolean;
      };
    };

    if (!body.repositoryId || !body.finding) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'repositoryId and finding are required' } },
        { status: 400 }
      );
    }

    const orgId = body.organizationId || user.organizationIds[0] || '';
    if (!orgId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'organizationId could not be resolved' } },
        { status: 400 }
      );
    }

    await failureIntelligenceService.recordPattern(
      orgId,
      body.repositoryId,
      body.finding,
      body.context || {}
    );

    log.info({ organizationId: orgId, repositoryId: body.repositoryId, ruleId: body.finding.ruleId }, 'Recorded failure pattern');

    return NextResponse.json({
      data: {
        success: true,
        message: 'Anonymized failure pattern recorded',
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to record failure pattern');
    return NextResponse.json(
      {
        error: {
          code: 'RECORD_PATTERN_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
