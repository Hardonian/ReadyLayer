/**
 * Shadow Mode API Route
 * 
 * POST /api/v1/shadow-mode - Run non-blocking shadow evaluation on PR/diff
 */

import { NextRequest, NextResponse } from 'next/server';
import { shadowModeService, type ShadowModeRequest } from '@/services/shadow-mode';
import { requireAuth } from '@/lib/auth';
import { createAuthzMiddleware } from '@/lib/authz';
import { logger } from '@/observability/logging';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId, route: 'shadow-mode' });

  try {
    const user = await requireAuth(request);

    const authzResponse = await createAuthzMiddleware({
      requiredScopes: ['write'],
    })(request);
    if (authzResponse) {
      return authzResponse;
    }

    const body = await request.json() as Partial<ShadowModeRequest>;

    if (!body.repositoryId || !body.files || !Array.isArray(body.files)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'repositoryId and files array are required',
          },
        },
        { status: 400 }
      );
    }

    const shadowRequest: ShadowModeRequest = {
      repositoryId: body.repositoryId,
      prNumber: body.prNumber || 0,
      prSha: body.prSha || 'HEAD',
      prTitle: body.prTitle || 'Shadow Mode Analysis',
      diff: body.diff,
      files: body.files,
      aiTouchedFiles: body.aiTouchedFiles,
    };

    const result = await shadowModeService.analyze(shadowRequest);

    if (body.repositoryId && body.prNumber) {
      try {
        await shadowModeService.saveResult(body.repositoryId, body.prNumber, result);
      } catch (saveErr) {
        log.warn({ err: saveErr }, 'Failed to persist shadow mode result to job store');
      }
    }

    log.info({
      repositoryId: body.repositoryId,
      userId: user.id,
      wouldHaveBlocked: result.summary.wouldHaveBlocked,
      totalIssues: result.summary.totalIssues,
    }, 'Shadow mode analysis complete');

    return NextResponse.json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        mode: 'shadow',
        enforcementActive: false,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Shadow mode evaluation failed');
    return NextResponse.json(
      {
        error: {
          code: 'SHADOW_MODE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error during shadow mode analysis',
        },
      },
      { status: 500 }
    );
  }
}
