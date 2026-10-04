import { NextResponse } from 'next/server'
import type { ReadinessResponseContract } from '@/lib/contracts/health'
import { isKeyConfigured } from '@/lib/crypto'
import { healthChecker } from '@/observability/health'
import { logger } from '@/observability/logging'

const REQUIRED_ENVIRONMENT = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export async function GET(): Promise<NextResponse<ReadinessResponseContract>> {
  try {
    const environmentReady = REQUIRED_ENVIRONMENT.every((name) => Boolean(process.env[name]))
    const secretsReady = isKeyConfigured()
    const dependencies = await healthChecker.checkReady()

    if (dependencies.details) {
      logger.warn({ details: dependencies.details }, 'Readiness schema check reported deployment drift')
    }

    const checks: ReadinessResponseContract['checks'] = {
      ...dependencies.checks,
      environment: environmentReady ? 'ready' : 'not_ready',
      secrets: secretsReady ? 'ready' : 'not_ready',
    }
    const isReady = dependencies.status === 'ready' && environmentReady && secretsReady

    return NextResponse.json(
      {
        status: isReady ? 'ready' : 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
        ...(!isReady ? { message: 'One or more required deployment checks are not ready' } : {}),
      },
      {
        status: isReady ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    logger.error(error, 'Readiness check failed')
    return NextResponse.json(
      {
        status: 'not_ready',
        checks: {
          environment: 'not_ready',
          database: 'not_ready',
          secrets: 'not_ready',
        },
        timestamp: new Date().toISOString(),
        message: 'Readiness check failed',
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
