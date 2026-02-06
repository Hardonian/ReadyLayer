/**
 * Demo Mode API Route
 *
 * Executes the full ReadyLayer pipeline against deterministic fixtures
 * without requiring external credentials. Returns real findings, tests, and docs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoPipelineService } from '@/lib/demo/pipeline';

const DEMO_MODE_ENABLED = process.env.DEMO_MODE_ENABLED === 'true';

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
      timestamp: new Date().toISOString(),
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
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const body = await request.json();
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      if (body && typeof body === 'object' && 'checkIds' in body) {
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
        checkIds = Array.isArray(body.checkIds) ? (body.checkIds as unknown[]).filter((v): v is string => typeof v === 'string') : undefined;
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
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
      timestamp: new Date().toISOString(),
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
