/**
 * Demo Mode API Route
 *
 * Executes the full ReadyLayer pipeline against deterministic fixtures
 * without requiring external credentials. Returns real findings, tests, and docs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoPipelineService, DEMO_FROZEN_TIMESTAMP } from '@/lib/demo/pipeline';

const DEMO_MODE_ENABLED = process.env.NODE_ENV !== 'production';

export async function GET(): Promise<NextResponse> {
  if (!DEMO_MODE_ENABLED) {
    return NextResponse.json(
      {
        error: {
          code: 'DEMO_MODE_DISABLED',
          message: 'Demo mode is not enabled. Set DEMO_MODE_ENABLED=true to use this endpoint.',
        },
      },
      { status: 403 }
    );
  }

  try {
    const result = await demoPipelineService.executeFullPipeline();

    return NextResponse.json({
      success: true,
      data: result,
      requestId: result.runId,
      timestamp: DEMO_FROZEN_TIMESTAMP,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'DEMO_PIPELINE_FAILED',
          message: 'Demo mode pipeline execution failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!DEMO_MODE_ENABLED) {
    return NextResponse.json(
      {
        error: {
          code: 'DEMO_MODE_DISABLED',
          message: 'Demo mode is not enabled. Set DEMO_MODE_ENABLED=true to use this endpoint.',
        },
      },
      { status: 403 }
    );
  }

  try {
    let checkIds: string[] | undefined;
    try {
      const body = (await request.json()) as { checkIds?: unknown } | null;
      if (body && typeof body === 'object' && 'checkIds' in body) {
        const rawCheckIds = body.checkIds;
        checkIds = Array.isArray(rawCheckIds)
          ? rawCheckIds.filter((value): value is string => typeof value === 'string')
          : undefined;
      }
    } catch {
      checkIds = undefined;
    }

    const fullResult = await demoPipelineService.executeFullPipeline();

    let result: typeof fullResult;

    if (checkIds && Array.isArray(checkIds) && checkIds.length > 0) {
      result = {
        ...fullResult,
        checks: fullResult.checks.filter((c: { id: string }) => checkIds.includes(c.id)),
      };
    } else {
      result = fullResult;
    }

    return NextResponse.json({
      success: true,
      data: result,
      requestId: result.runId,
      timestamp: DEMO_FROZEN_TIMESTAMP,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'DEMO_PIPELINE_FAILED',
          message: 'Demo mode pipeline execution failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
