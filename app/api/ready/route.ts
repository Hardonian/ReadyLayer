import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';
import { logger } from '../../../observability/logging';

export async function GET() {
  try {
    const ready = await healthChecker.checkReady();
    const statusCode = ready.status === 'ready' ? 200 : 503;
    return NextResponse.json(ready, { status: statusCode });
  } catch (error) {
    logger.error(error, 'Readiness check failed');
    // Return not ready status on error
    return NextResponse.json(
      {
        status: 'not_ready',
        checks: {
          database: 'not_ready',
        },
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      },
      { status: 503 }
    );
  }
}
