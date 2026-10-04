#!/usr/bin/env tsx

import { verifyClaimSurfaces } from '../lib/marketing/claim-verification'
import { console } from './logger'

const CLAIM_SURFACES = [
  'app/(public)',
  'app/content',
  'app/evaluate',
  'components/landing',
  'components/marketing',
  'gtm',
  'docs/ENTERPRISE.md',
  'docs/PRICING.md',
] as const

function main(): void {
  const violations = verifyClaimSurfaces(process.cwd(), CLAIM_SURFACES)
  if (violations.length === 0) {
    console.log('Verified public and GTM surfaces contain no blocked high-risk claims.')
    return
  }

  console.error('Claim verification failed. Replace or substantiate these claims:')
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.excerpt}`)
  }
  process.exitCode = 1
}

main()
