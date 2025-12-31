import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';
import { logger } from '../../../observability/logging';

/**
 * GET /api/health
 * Health check endpoint with environment validation
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function GET() {
  try {
    // Check required environment variables (safe - no secrets exposed)
    const requiredEnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
    };

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([, present]) => !present)
      .map(([key]) => key);

    // If critical env vars missing, return unhealthy
    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          checks: {
            database: 'unhealthy',
            environment: 'unhealthy',
          },
          timestamp: new Date().toISOString(),
          details: {
            missingEnvVars,
          },
        },
        { status: 503 }
      );
    }

    const health = await healthChecker.checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    // Add environment check to response
    return NextResponse.json({
      ...health,
      checks: {
        ...health.checks,
        environment: 'healthy',
      },
    }, { status: statusCode });
  } catch (error) {
    logger.error(error, 'Health check failed');
    // Return unhealthy status on error
    return NextResponse.json(
      {
        status: 'unhealthy',
        checks: {
          database: 'unhealthy',
          environment: 'unknown',
        },
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
