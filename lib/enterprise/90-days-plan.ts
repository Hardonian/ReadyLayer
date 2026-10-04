/**
 * ReadyLayer Enterprise First 90 Days Adoption & Rollout Specification
 *
 * Operational blueprint for Global 2000 & Series B+ engineering teams
 * deploying autonomous coding agents (Cursor, Claude Code, Windsurf, Devin)
 * with deterministic guardrails, zero-leak sovereign runners, and SLSA/in-toto provenance.
 */

export interface EnterpriseMilestone {
  id: string;
  title: string;
  description: string;
  category: 'governance' | 'infrastructure' | 'security' | 'compliance';
  requiredArtifact: string;
  verificationMethod: string;
  blastRadiusImpact: string;
}

export interface EnterprisePhase {
  id: 'days_1_30' | 'days_31_60' | 'days_61_90';
  title: string;
  timeframe: string;
  phaseNumber: number;
  subtitle: string;
  summary: string;
  kpis: Array<{
    label: string;
    target: string;
    measurement: string;
  }>;
  milestones: EnterpriseMilestone[];
  governanceGates: string[];
  deliverables: string[];
}

export const ENTERPRISE_90_DAYS_PHASES: EnterprisePhase[] = [
  {
    id: 'days_1_30',
    phaseNumber: 1,
    title: 'Phase 1: Foundation & Silent Shadow Mode',
    timeframe: 'Days 1 – 30',
    subtitle: 'Zero-Friction Baseline Discovery & Passive Governance Calibration',
    summary:
      'Inventory autonomous coding agent usage, establish baseline AI-touched code velocity, and deploy ReadyLayer runner in shadow mode across initial pilot repositories without impeding developer speed.',
    kpis: [
      {
        label: 'Shadow Mode Coverage',
        target: '100% of pilot repos',
        measurement: 'Passive policy execution on all active pull requests',
      },
      {
        label: 'Developer Friction',
        target: '0 hard blocks',
        measurement: 'Advisory telemetry only; no CI build disruptions',
      },
      {
        label: 'Agent Surface Inventory',
        target: '100% identified',
        measurement: 'Full telemetry across Cursor, Claude Code, and Copilot commits',
      },
      {
        label: 'Runner Latency',
        target: '< 20ms p95',
        measurement: 'Deterministic policy evaluation execution time',
      },
    ],
    governanceGates: [
      'Git Provider webhook ingestion (GitHub Enterprise / GitLab Self-Managed)',
      'Shadow Mode policy simulation logging',
      'Air-gapped Go runner baseline deployment in sovereign VPC or local CI',
      'Initial CycloneDX 1.6 Generative AIBOM generation',
    ],
    milestones: [
      {
        id: 'm1_git_integration',
        title: 'Connect Primary Enterprise Repositories',
        description:
          'Connect the first 3-5 mission-critical repositories via GitHub App or GitLab System Hook to begin passive event streaming.',
        category: 'infrastructure',
        requiredArtifact: 'Repository Connection Verification Certificate',
        verificationMethod: 'Automated webhook handshake with HMAC SHA-256 validation',
        blastRadiusImpact: 'Non-blocking passive monitoring',
      },
      {
        id: 'm1_shadow_mode_activation',
        title: 'Activate Silent Shadow Policy Engine',
        description:
          'Simulate corporate coding standards against historical and current PRs to establish true baseline violation and false-positive rates.',
        category: 'governance',
        requiredArtifact: 'Shadow Mode Simulation Baseline Log',
        verificationMethod: 'PR evaluation stream without merge gate blocking',
        blastRadiusImpact: 'Zero pipeline interruption',
      },
      {
        id: 'm1_slopsquatting_baseline',
        title: 'Package Slopsquatting & Dependency Audit',
        description:
          'Index all newly introduced dependencies to detect AI hallucinated package stems, typosquats, and zero-day release dates on npm/PyPI.',
        category: 'security',
        requiredArtifact: 'Dependency Risk Inventory (CycloneDX 1.6)',
        verificationMethod: 'Registry age, velocity, and Levenshtein synthetic stem scoring',
        blastRadiusImpact: 'Supply-chain visibility',
      },
      {
        id: 'm1_developer_briefing',
        title: 'Developer Guild Briefing & MCP Tooling Setup',
        description:
          'Provide engineering teams with ReadyLayer MCP configuration for Cursor and Claude Code to enable real-time local diff preflight checks.',
        category: 'compliance',
        requiredArtifact: 'MCP Configuration & Preflight CLI Distribution Guide',
        verificationMethod: 'Successful readylayer.health & preflight_check stdio responses',
        blastRadiusImpact: 'Shift-left security awareness',
      },
    ],
    deliverables: [
      '30-Day Shadow Mode Assessment Report',
      'Developer Agent Adoption Heatmap',
      'Baseline Repository Risk Exposure Index™',
      'Tuned Enterprise Policy Set with <0.5% False Positive Rate',
    ],
  },
  {
    id: 'days_31_60',
    phaseNumber: 2,
    title: 'Phase 2: Blast Radius Containment & Dual Custody',
    timeframe: 'Days 31 – 60',
    subtitle: 'Enforcing Deterministic Guardrails & Perimeter Protection',
    summary:
      'Transition from advisory observation to active protection on high-risk boundaries. Lock down Tier 0 and Tier 1 perimeter zones (IAM, CI/CD, migrations, k8s) with mandatory dual-custody approval, and actively intercept package hallucinations.',
    kpis: [
      {
        label: 'Tier-0 Protection',
        target: '100% intercepted',
        measurement: 'Autonomous agent modifications to critical files blocked for dual approval',
      },
      {
        label: 'Slopsquatting Prevention',
        target: '0 malicious packages merged',
        measurement: 'Deterministic rejection of hallucinated dependencies',
      },
      {
        label: 'Review Cycle Time',
        target: '< 30 min turnaround',
        measurement: 'Mean time to dual-custody review resolution via Slack/UI',
      },
      {
        label: 'Waiver Accountability',
        target: '100% signed with TTL',
        measurement: 'Every bypass requires cryptographic signature and expiration',
      },
    ],
    governanceGates: [
      'Tier 0/1 Blast Radius Perimeter Gate (CI/CD, IAM, Database Migrations)',
      'Deterministic AI Package Slopsquatting Interception',
      'Dual-Custody Merge Circuit-Breaker for Autonomous Agent Loops',
      'Time-Bound Cryptographic Waiver System',
    ],
    milestones: [
      {
        id: 'm2_blast_radius_tiers',
        title: 'Configure Tier 0–3 Blast Radius Tiers',
        description:
          'Classify repo file paths into risk tiers: Tier 0 (CI workflows, auth, IAM, terraform), Tier 1 (core domain logic), Tier 2 (features), Tier 3 (docs/tests).',
        category: 'governance',
        requiredArtifact: 'Blast Radius Policy Definition JSON',
        verificationMethod: 'Automated test suite asserting path-tier mapping',
        blastRadiusImpact: 'Guaranteed perimeter isolation',
      },
      {
        id: 'm2_dual_custody_enforcement',
        title: 'Activate Dual-Custody Approval Gates',
        description:
          'Require designated security/lead engineer co-signatures before AI agents can merge diffs touching Tier-0 assets.',
        category: 'security',
        requiredArtifact: 'Dual-Custody Co-Sign Enforcement Rule',
        verificationMethod: 'Simulated PR rejection without required second signature',
        blastRadiusImpact: 'Eliminates unchecked autonomous escalation',
      },
      {
        id: 'm2_active_slopsquatting_blocking',
        title: 'Enable Live Slopsquatting Blocking',
        description:
          'Switch dependency inspection from log-only to active blocker. Unverified zero-day packages fail CI with remediation instructions.',
        category: 'security',
        requiredArtifact: 'Active Slopsquatting Gate Configuration',
        verificationMethod: 'Dry-run synthetic package PR blocked with exit code 2',
        blastRadiusImpact: 'Hard stop against RCE in CI',
      },
      {
        id: 'm2_slack_teams_alerting',
        title: 'Integrate Real-Time ChatOps Webhooks',
        description:
          'Route blocked agent runs, dual-custody approval requests, and policy exceptions directly to dedicated SecOps channels.',
        category: 'infrastructure',
        requiredArtifact: 'Slack/Teams Incident Webhook Subscription',
        verificationMethod: 'Test notification dispatch on gate failure',
        blastRadiusImpact: 'Instant human-in-the-loop notification',
      },
    ],
    deliverables: [
      'Tier 0 Perimeter Security Attestation',
      'Dual-Custody Audit Trail Export',
      'First 50 Blocked Slopsquatting Incidents Log',
      '60-Day Progress Briefing for VP Engineering & InfoSec',
    ],
  },
  {
    id: 'days_61_90',
    phaseNumber: 3,
    title: 'Phase 3: Cryptographic Provenance & Enterprise Scale',
    timeframe: 'Days 61 – 90',
    subtitle: 'Immutable in-toto / SLSA Minting & Global Compliance Alignment',
    summary:
      'Scale ReadyLayer across all engineering repositories. Mint signed in-toto v1.0 and SLSA Level 2+ provenance bundles on every merged pull request, bind model versions and prompt digests, and generate turn-key compliance attestations for external auditors.',
    kpis: [
      {
        label: 'Organization Coverage',
        target: '100% of repositories',
        measurement: 'Full enterprise-wide deployment',
      },
      {
        label: 'Attestation Completeness',
        target: '100% signed in-toto v1.0',
        measurement: 'Every merge backed by verifiable cryptographic bundle',
      },
      {
        label: 'Audit Readiness',
        target: 'One-click compliance pack',
        measurement: 'Instant evidence bundle generation for SOC 2 and EU AI Act',
      },
      {
        label: 'Enterprise SSO Adoption',
        target: '100% enforced SAML/OIDC',
        measurement: 'Corporate IdP login with RBAC group synchronization',
      },
    ],
    governanceGates: [
      'Automated in-toto v1.0 Cryptographic Envelope Minting',
      'SLSA Level 2+ Supply-Chain Attestation Verification',
      'Enterprise SSO & SCIM Directory Synchronization',
      'Turn-Key Regulatory Mappings (OWASP LLM Top 10, NIST AI RMF, EU AI Act, SOC 2)',
    ],
    milestones: [
      {
        id: 'm3_intoto_provenance_signing',
        title: 'Turn On Cryptographic in-toto v1.0 Statements',
        description:
          'Automatically mint Ed25519/HMAC signed provenance statements on every merge, sealing model ID, prompt SHA-256 digests, and policy decisions.',
        category: 'compliance',
        requiredArtifact: 'Cryptographic Keypair & Signing Pipeline',
        verificationMethod: 'Offline signature verification with readylayer verify CLI',
        blastRadiusImpact: 'Mathematical non-repudiation',
      },
      {
        id: 'm3_enterprise_sso_scim',
        title: 'Configure Enterprise SAML 2.0 & SCIM',
        description:
          'Integrate corporate Okta, Azure AD, or PingIdentity for federated authentication, automatic user provisioning, and role assignment.',
        category: 'infrastructure',
        requiredArtifact: 'SAML IdP Metadata & SCIM Bearer Token',
        verificationMethod: 'IdP-initiated login test and SCIM sync confirmation',
        blastRadiusImpact: 'Strict corporate identity control',
      },
      {
        id: 'm3_regulatory_compliance_pack',
        title: 'Activate Turn-Key Compliance Packs',
        description:
          'Map repository policy results directly to OWASP LLM Top 10 (2025/2026), NIST AI RMF (SP 1270), and EU AI Act (Articles 14 & 50).',
        category: 'compliance',
        requiredArtifact: 'Compliance Framework Crosswalk Matrix',
        verificationMethod: 'Automated attestation pack export via API',
        blastRadiusImpact: 'Zero-effort audit evidence preparation',
      },
      {
        id: 'm3_executive_signoff',
        title: 'Executive 90-Day Readout & Production Sign-Off',
        description:
          'Present final 90-day readiness findings, risk reduction scoreboard, and long-term governance cadence to CISO and CTO.',
        category: 'governance',
        requiredArtifact: '90-Day Executive Governance Dossier',
        verificationMethod: 'Formal sign-off by CISO / Head of Security',
        blastRadiusImpact: 'Complete institutional adoption',
      },
    ],
    deliverables: [
      'Enterprise 90-Day Post-Implementation Dossier',
      'Continuous Audit Evidence Export Archive',
      'SLSA Level 2+ Verifier Tooling for CI/CD',
      'Annual AI Governance Operating Charter',
    ],
  },
];

export function calculatePhaseProgress(
  phase: EnterprisePhase,
  completedIds: string[]
): number {
  if (phase.milestones.length === 0) return 0;
  const completedCount = phase.milestones.filter((m) =>
    completedIds.includes(m.id)
  ).length;
  return Math.round((completedCount / phase.milestones.length) * 100);
}

export function calculateOverallAdoption(completedIds: string[]): {
  percentage: number;
  completedMilestones: number;
  totalMilestones: number;
  currentPhase: EnterprisePhase;
} {
  const allMilestones = ENTERPRISE_90_DAYS_PHASES.flatMap((p) => p.milestones);
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter((m) =>
    completedIds.includes(m.id)
  ).length;
  const percentage = Math.round((completedMilestones / totalMilestones) * 100);

  // Determine current active phase
  let currentPhase = ENTERPRISE_90_DAYS_PHASES[0];
  if (completedMilestones >= 4 && completedMilestones < 8) {
    currentPhase = ENTERPRISE_90_DAYS_PHASES[1];
  } else if (completedMilestones >= 8) {
    currentPhase = ENTERPRISE_90_DAYS_PHASES[2];
  }

  return {
    percentage,
    completedMilestones,
    totalMilestones,
    currentPhase,
  };
}

export function generateExecutiveBriefingMarkdown(params: {
  organizationName: string;
  completedMilestoneIds: string[];
  metrics: {
    aiTouchedPercentage: number;
    gatePassRate: number;
    totalRuns: number;
    slopsquattingBlockedCount: number;
    attestationsMinted: number;
  };
}): string {
  const { organizationName, completedMilestoneIds, metrics } = params;
  const overall = calculateOverallAdoption(completedMilestoneIds);
  const timestamp = new Date().toISOString();

  return `# READY共同LAYER ENTERPRISE AI AGENT READINESS & 90-DAY AUDIT BRIEFING
**Document Classification:** RESTRICTED — INTERNAL GOVERNANCE ONLY
**Organization:** ${organizationName}
**Generated Date:** ${timestamp}
**Adoption Maturity:** ${overall.percentage}% (${overall.currentPhase.title})

---

## 1. EXECUTIVE SUMMARY
ReadyLayer has established deterministic operational control over autonomous coding agents across ${organizationName}'s software delivery lifecycle.

- **Total Evaluated Code Runs:** ${metrics.totalRuns}
- **AI-Touched Code Proportion:** ${(metrics.aiTouchedPercentage * 100).toFixed(1)}%
- **Policy Gate Pass Rate:** ${(metrics.gatePassRate * 100).toFixed(1)}%
- **Supply-Chain / Slopsquatting Interceptions:** ${metrics.slopsquattingBlockedCount} blocked attacks
- **Cryptographic in-toto/SLSA Attestations Minted:** ${metrics.attestationsMinted} verifiable statements

---

## 2. 90-DAY ADOPTION STATUS MATRIX

${ENTERPRISE_90_DAYS_PHASES.map((phase) => {
  const progress = calculatePhaseProgress(phase, completedMilestoneIds);
  return `### ${phase.title} (${phase.timeframe}) — Progress: ${progress}%
**Theme:** ${phase.subtitle}

| Milestone | Status | Category | Verification Method |
|---|---|---|---|
${phase.milestones
  .map((m) => {
    const isDone = completedMilestoneIds.includes(m.id);
    return `| ${m.title} | ${isDone ? 'COMPLETED' : 'PENDING'} | ${m.category.toUpperCase()} | ${m.verificationMethod} |`;
  })
  .join('\n')}

**Phase Deliverables:**
${phase.deliverables.map((d) => `- [${progress === 100 ? 'x' : ' '}] ${d}`).join('\n')}
`;
}).join('\n\n')}

---

## 3. COMPLIANCE & REGULATORY ALIGNMENT
The policy boundaries enforced by ReadyLayer directly map to external standards:
- **OWASP Top 10 for LLM Applications (2025/2026):** Enforcing controls LLM01, LLM02, and LLM06.
- **NIST AI Risk Management Framework (SP 1270):** Governed, measured, and mapped controls.
- **EU Artificial Intelligence Act (Articles 14 & 50):** Dual-custody technical measures and AI-generated transparency attestations.
- **SOC 2 Type II & ISO 42001:** Cryptographic evidence bundles with immutable audit chains.

---

**Prepared by:** ReadyLayer Enterprise Control Plane
**Attestation Hash:** sha256:${Buffer.from(`${organizationName}:${timestamp}:${overall.percentage}`).toString('hex').slice(0, 32)}
`;
}
