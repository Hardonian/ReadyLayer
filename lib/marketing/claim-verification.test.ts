import { describe, expect, it } from 'vitest'
import { findHighRiskClaims } from './claim-verification'

describe('claim verification', () => {
  it('flags unverified certifications, adoption numbers, and fabricated testimonials', () => {
    const contents = [
      'SOC 2 Type II Certified',
      'Trusted by 500+ Engineering Teams',
      'Sarah Chen at TechCorp says this is great',
      '99.9% uptime SLA',
    ].join('\n')

    expect(findHighRiskClaims('example.md', contents).map((violation) => violation.rule)).toEqual([
      'fabricated-persona',
      'fabricated-company',
      'unverified-adoption',
      'unverified-uptime',
      'unverified-certification',
    ])
  })

  it('allows evidence-scoped product language', () => {
    const contents = 'The local runner makes no network calls. Compliance mappings are not certifications.'
    expect(findHighRiskClaims('example.md', contents)).toEqual([])
  })
})
