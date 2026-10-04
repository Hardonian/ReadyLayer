import { NextResponse } from 'next/server'
import type { HealthResponseContract } from '@/lib/contracts/health'

/**
 * Process liveness probe.
 *
 * This endpoint deliberately performs no network or database I/O. Dependency
 * health belongs to /api/ready; coupling it to liveness can create restart
 * loops during a database or Redis outage.
 */
export function GET(): NextResponse<HealthResponseContract> {
  return NextResponse.json(
    {
      status: 'healthy',
      checks: { process: 'healthy' },
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
