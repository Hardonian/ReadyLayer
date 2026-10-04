import { describe, expect, it } from 'vitest'
import { healthResponseSchema, readinessResponseSchema } from '@/lib/contracts/health'
import { GET as getHealth } from '@/app/api/health/route'
import { GET as getReadiness } from '@/app/api/ready/route'

describe('operational probe contracts', () => {
  it('keeps liveness independent from external dependencies', async () => {
    const response = getHealth()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(healthResponseSchema.safeParse(body).success).toBe(true)
  })

  it('returns a non-cacheable response matching the readiness contract', async () => {
    const response = await getReadiness()
    const body = await response.json()

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(readinessResponseSchema.safeParse(body).success).toBe(true)
    expect([200, 503]).toContain(response.status)
  })
})
