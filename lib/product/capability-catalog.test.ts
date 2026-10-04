import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCT_CAPABILITIES } from './capability-catalog'

describe('product capability catalog', () => {
  it('uses unique stable identifiers', () => {
    const ids = PRODUCT_CAPABILITIES.map((capability) => capability.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('backs every capability with repository evidence', () => {
    for (const capability of PRODUCT_CAPABILITIES) {
      expect(capability.evidence.length).toBeGreaterThanOrEqual(2)
      for (const evidence of capability.evidence) {
        expect(existsSync(resolve(process.cwd(), evidence.path)), `${capability.id}: ${evidence.path}`).toBe(true)
      }
    }
  })

  it('does not present design-partner work as generally available', () => {
    const designPartnerCapabilities = PRODUCT_CAPABILITIES.filter(
      (capability) => capability.status === 'design-partner'
    )

    expect(designPartnerCapabilities.length).toBeGreaterThan(0)
    for (const capability of designPartnerCapabilities) {
      expect(capability.availability.toLowerCase()).toContain('pilot')
    }
  })
})
