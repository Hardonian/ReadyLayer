/**
 * Sandbox Run API Route
 * 
 * POST /api/v1/runs/sandbox - Create a sandbox demo run (no auth required)
 */

import { NextRequest } from 'next/server';
import { runPipelineService } from '../../../../../services/run-pipeline';
import { errorResponse, successResponse } from '../../../../../lib/api-route-helpers';
import { logger } from '../../../../../observability/logging';

/**
 * POST /api/v1/runs/sandbox
 * Create a sandbox demo run (public endpoint for demos)
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    log.info('Creating sandbox run');

    // Execute sandbox run
    const result = await runPipelineService.createSandboxRun();

    return successResponse(result, 201);
  } catch (error) {
    log.error(error, 'Sandbox run execution failed');
    return errorResponse(
      'SANDBOX_RUN_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
