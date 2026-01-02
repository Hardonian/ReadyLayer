import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';
import { logger } from '../../../observability/logging';
import { isKeyConfigured, getAvailableKeyVersions } from '../../../lib/crypto';

export async function GET() {
  try {
    const ready = await healthChecker.checkReady();
    
    // Add secrets health check
    const secretsConfigured = isKeyConfigured();
    const keyVersions = secretsConfigured ? getAvailableKeyVersions() : [];
    
    const checks = {
      ...ready.checks,
      secrets: secretsConfigured ? 'ready' : 'degraded',
    };

    const status = ready.status === 'ready' && secretsConfigured ? 'ready' : 'degraded';
    const statusCode = status === 'ready' ? 200 : 503;

    return NextResponse.json(
      {
        ...ready,
        status,
        checks,
        secrets: {
          configured: secretsConfigured,
          keyVersions,
          message: secretsConfigured
            ? 'Encryption keys configured'
            : 'No encryption keys configured - provider calls will be disabled',
        },
      },
      { status: statusCode }
    );
  } catch (error) {
    logger.error(error, 'Readiness check failed');
    // Return not ready status on error
    return NextResponse.json(
      {
        status: 'not_ready',
        checks: {
          database: 'not_ready',
          secrets: 'unknown',
        },
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      },
      { status: 503 }
    );
  }
}
