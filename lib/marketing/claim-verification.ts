import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

export interface ClaimViolation {
  file: string
  line: number
  rule: string
  excerpt: string
}

interface ClaimRule {
  id: string
  pattern: RegExp
}

const HIGH_RISK_CLAIM_RULES: readonly ClaimRule[] = [
  { id: 'fabricated-persona', pattern: /\b(?:Sarah Chen|Michael Rodriguez|Mike Rodriguez|Emily Watson|David Kim|Jessica Park|Alex Thompson)\b/gi },
  { id: 'fabricated-company', pattern: /\b(?:TechCorp|DataFlow|FinSecure|CloudScale|RemoteFirst Inc|APIFirst|Acme Corp|StartupXYZ|HealthTech Co\.)\b/gi },
  { id: 'unverified-adoption', pattern: /\b(?:500\+ Engineering Teams|100K\+ PRs Reviewed)\b/gi },
  { id: 'unverified-uptime', pattern: /\b99\.(?:9|99)%\s+(?:uptime|uptime SLA)\b/gi },
  { id: 'unverified-certification', pattern: /\b(?:SOC\s?2 Type II Certified|ISO 27001 Certified|SOC\s?2 compliant|HIPAA (?:ready|compliant))\b/gi },
  { id: 'unverified-trial', pattern: /\b(?:14-day free trial|no credit card required)\b/gi },
  { id: 'absolute-outcome', pattern: /\b(?:100% (?:Breach Prevention|Audit Pass Rate|Doc Accuracy|Zero-Leak)|zero (?:latency overhead|uncontrolled blast radius|network leakage))\b/gi },
  { id: 'unverified-time-to-value', pattern: /\bdeploy in \d+ minutes?\b/gi },
  { id: 'unsafe-failure-absolute', pattern: /\bnever blocks? PRs\b/gi },
  { id: 'uncontracted-support', pattern: /\b(?:guaranteed response times?|24\/7 dedicated support)\b/gi },
]

const SCANNED_EXTENSIONS = new Set(['.md', '.mdx', '.ts', '.tsx'])

export function findHighRiskClaims(file: string, contents: string): ClaimViolation[] {
  const violations: ClaimViolation[] = []

  for (const rule of HIGH_RISK_CLAIM_RULES) {
    rule.pattern.lastIndex = 0
    for (const match of contents.matchAll(rule.pattern)) {
      const index = match.index ?? 0
      const line = contents.slice(0, index).split('\n').length
      violations.push({
        file,
        line,
        rule: rule.id,
        excerpt: match[0],
      })
    }
  }

  return violations
}

export function collectClaimSurfaceFiles(repoRoot: string, surfaces: readonly string[]): string[] {
  const files: string[] = []

  const visit = (absolutePath: string): void => {
    if (!existsSync(absolutePath)) return
    if (statSync(absolutePath).isDirectory()) {
      for (const entry of readdirSync(absolutePath)) visit(join(absolutePath, entry))
      return
    }
    if (SCANNED_EXTENSIONS.has(extname(absolutePath))) files.push(absolutePath)
  }

  for (const surface of surfaces) visit(join(repoRoot, surface))
  return files.sort()
}

export function verifyClaimSurfaces(repoRoot: string, surfaces: readonly string[]): ClaimViolation[] {
  return collectClaimSurfaceFiles(repoRoot, surfaces).flatMap((absolutePath) =>
    findHighRiskClaims(relative(repoRoot, absolutePath), readFileSync(absolutePath, 'utf8'))
  )
}
