import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';
import { logger } from '../../../observability/logging';

export async function GET() {
  try {
    const health = await healthChecker.checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error(error, 'Health check failed');
    // Return unhealthy status on error
    return NextResponse.json(
      {
        status: 'unhealthy',
        checks: {
          database: 'unhealthy',
        },
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
