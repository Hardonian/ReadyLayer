import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health check endpoint
 * 
 * Returns system health status including:
 * - API status
 * - Database connectivity
 * - Timestamp
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      api: 'ok',
      database: 'unknown' as 'ok' | 'error' | 'unknown',
    },
  }

  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = 'ok'
  } catch (error) {
    health.checks.database = 'error'
    health.status = 'degraded'
    console.error('Database health check failed:', error)
  }

  const statusCode = health.status === 'ok' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
