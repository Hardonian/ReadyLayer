export type CapabilityStatus = 'verified' | 'beta' | 'design-partner'

export type CapabilityCategory = 'governance' | 'evidence' | 'integration' | 'deployment'

export interface CapabilityEvidence {
  label: string
  path: string
}

export interface ProductCapability {
  id: string
  name: string
  category: CapabilityCategory
  status: CapabilityStatus
  summary: string
  availability: string
  verification: string
  evidence: readonly CapabilityEvidence[]
}

/**
 * Canonical, evidence-backed product capability catalog.
 *
 * Public claims should be derived from this catalog. A capability may only be
 * marked `verified` when its evidence paths exist and its verification command
 * is part of the repository's supported workflow.
 */
export const PRODUCT_CAPABILITIES: readonly ProductCapability[] = [
  {
    id: 'deterministic-policy-runner',
    name: 'Deterministic policy runner',
    category: 'governance',
    status: 'verified',
    summary: 'A local Go runner evaluates versioned policy input and emits schema-defined evidence bundles.',
    availability: 'Open source and self-hosted',
    verification: 'go test ./...',
    evidence: [
      { label: 'Runner source', path: 'tools/ready-layer-runner/cmd/ready-layer-runner/main.go' },
      { label: 'Output contract', path: 'tools/ready-layer-runner/schemas/runner_output.schema.json' },
      { label: 'Runner guide', path: 'tools/ready-layer-runner/README.md' },
    ],
  },
  {
    id: 'deterministic-demo',
    name: 'Credential-free deterministic demo',
    category: 'governance',
    status: 'verified',
    summary: 'A fixed sandbox pipeline demonstrates review, test, and documentation decisions without external credentials.',
    availability: 'Included in the web application',
    verification: 'npm test -- __tests__/demo-mode.test.ts',
    evidence: [
      { label: 'Demo API', path: 'app/api/demo/route.ts' },
      { label: 'Demo contract tests', path: '__tests__/demo-mode.test.ts' },
      { label: 'Sandbox experience', path: 'app/(app)/dashboard/runs/sandbox/page.tsx' },
    ],
  },
  {
    id: 'signed-attestations',
    name: 'Signed agent attestations and AIBOMs',
    category: 'evidence',
    status: 'beta',
    summary: 'Agent activity can be bound to signed in-toto statements and CycloneDX AI bill-of-materials documents.',
    availability: 'Available for controlled evaluation',
    verification: 'npm test -- __tests__/agent-guard.test.ts __tests__/lib/cyclonedx-aibom.test.ts',
    evidence: [
      { label: 'Attestation implementation', path: 'lib/agent-guard/attestation.ts' },
      { label: 'Agent guard tests', path: '__tests__/agent-guard.test.ts' },
      { label: 'AIBOM tests', path: '__tests__/lib/cyclonedx-aibom.test.ts' },
    ],
  },
  {
    id: 'signed-waivers',
    name: 'Cryptographically signed policy waivers',
    category: 'evidence',
    status: 'beta',
    summary: 'Policy exceptions include scoped approvals, expiry, signature verification, and an auditable decision path.',
    availability: 'Available for controlled evaluation',
    verification: 'npm test -- __tests__/lib/waiver-signing.test.ts',
    evidence: [
      { label: 'Waiver signing', path: 'lib/waivers/signing.ts' },
      { label: 'Verification tests', path: '__tests__/lib/waiver-signing.test.ts' },
      { label: 'Waiver API', path: 'app/api/v1/waivers/route.ts' },
    ],
  },
  {
    id: 'git-provider-workflows',
    name: 'Git provider governance workflows',
    category: 'integration',
    status: 'beta',
    summary: 'Webhook and feedback adapters cover GitHub, GitLab, and Bitbucket with provider-specific contract tests.',
    availability: 'GitHub is the primary evaluation path; validate other providers in your environment',
    verification: 'npm test -- __tests__/contracts/github-webhook-contract.test.ts __tests__/integrations',
    evidence: [
      { label: 'GitHub webhook', path: 'app/api/webhooks/github/route.ts' },
      { label: 'GitLab webhook', path: 'app/api/webhooks/gitlab/route.ts' },
      { label: 'Bitbucket webhook', path: 'app/api/webhooks/bitbucket/route.ts' },
    ],
  },
  {
    id: 'self-hosted-deployment',
    name: 'Self-hosted deployment',
    category: 'deployment',
    status: 'verified',
    summary: 'The web application supports a standalone container build with explicit health and readiness endpoints.',
    availability: 'Open source; operated in your infrastructure',
    verification: 'npm run build',
    evidence: [
      { label: 'Container build', path: 'Dockerfile' },
      { label: 'Deployment guide', path: 'docs/DEPLOYMENT.md' },
      { label: 'Health contract tests', path: '__tests__/contracts/health-contract.test.ts' },
    ],
  },
  {
    id: 'managed-enterprise',
    name: 'Managed enterprise deployment',
    category: 'deployment',
    status: 'design-partner',
    summary: 'Deployment topology, support coverage, data residency, and service levels are scoped with each design partner.',
    availability: 'Pilot only; no public SLA or certification claim',
    verification: 'Pilot acceptance plan agreed before production use',
    evidence: [
      { label: 'Enterprise boundary', path: 'docs/ENTERPRISE.md' },
      { label: 'Release checklist', path: 'docs/RELEASE_READINESS.md' },
      { label: 'Go-live runbook', path: 'docs/runbooks/go-live.md' },
    ],
  },
] as const

export const CAPABILITY_STATUS_LABELS: Readonly<Record<CapabilityStatus, string>> = {
  verified: 'Verified in repository',
  beta: 'Beta — validate in your environment',
  'design-partner': 'Design-partner pilot',
}
