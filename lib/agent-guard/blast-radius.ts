/**
 * Agent Blast Radius & Privilege Escalation Containment Engine
 * 
 * Enforces boundaries on autonomous coding agents (Claude Code, Cursor, Devin, Aider).
 * When an agent operates in an enterprise codebase, changes to critical perimeter files
 * (CI workflows, Terraform, IAM, database migrations, authentication guards, crypto)
 * cannot be merged autonomously.
 * 
 * ReadyLayer deterministically computes a Blast Radius Score (0-100) and enforces
 * dual-custody gating.
 */

import { createHash } from 'crypto';

export type BlastRadiusTier = 'TIER_0_CRITICAL' | 'TIER_1_PERSISTENCE' | 'TIER_2_APPLICATION' | 'TIER_3_SAFE';

export interface FileRiskClassification {
  filePath: string;
  tier: BlastRadiusTier;
  riskWeight: number; // 0 - 100
  reason: string;
  requiresDualCustody: boolean;
}

export interface BlastRadiusEvaluation {
  overallScore: number; // 0 to 100
  highestTier: BlastRadiusTier;
  requiresDualCustody: boolean;
  blockedAutonomousMerge: boolean;
  criticalFileCount: number;
  fileClassifications: FileRiskClassification[];
  summary: string;
  remediation: string;
  evaluationSha256: string;
}

// File patterns defining perimeter boundaries
const TIER_0_PATTERNS = [
  { pattern: /^\.github\/workflows\//i, reason: 'CI/CD pipeline workflow definitions (RCE / Supply Chain attack vector)' },
  { pattern: /^\.gitlab-ci\.yml$/i, reason: 'GitLab CI pipeline definition' },
  { pattern: /(?:^|\/)Dockerfile(?:$|\.)/i, reason: 'Container image build specification' },
  { pattern: /(?:^|\/)docker-compose(?:\.[^/]+)?\.ya?ml$/i, reason: 'Container orchestration composition' },
  { pattern: /(?:^|\/)terraform\/|(?:\.tf|\.tfvars)$/i, reason: 'Infrastructure as Code / Cloud Resource provisioning' },
  { pattern: /(?:^|\/)k8s\/|(?:^|\/)kubernetes\/|\.ya?ml$/i, isK8s: true, reason: 'Kubernetes cluster deployment specs' },
  { pattern: /(?:^|\/)lib\/secrets\/|(?:^|\/)lib\/auth\/|(?:^|\/)middleware\.ts$/i, reason: 'Authentication guards, session token handler, secret redaction' },
  { pattern: /(?:^|\/)crypto\/|(?:^|\/)certificates\/|\.pem$|\.key$/i, reason: 'Cryptographic primitives and secret key material' },
];

const TIER_1_PATTERNS = [
  { pattern: /(?:^|\/)prisma\/migrations\/|(?:^|\/)supabase\/migrations\//i, reason: 'Database schema migration DDL scripts' },
  { pattern: /(?:^|\/)prisma\/schema\.prisma$/i, reason: 'Core database domain model schema' },
  { pattern: /(?:^|\/)services\/billing\/|(?:^|\/)app\/api\/billing\//i, reason: 'Billing, Stripe webhooks, subscription ledger' },
];

const TIER_3_PATTERNS = [
  { pattern: /(?:^|\/)docs\/|\.md$/i, reason: 'Documentation and markdown files' },
  { pattern: /(?:^|\/)__tests__\/|(?:^|\/)tests\/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$/i, reason: 'Unit, integration, and E2E test files' },
  { pattern: /(?:^|\/)content\/|assets\//i, reason: 'Static visual assets and marketing content' },
];

/**
 * Classifies an individual file into risk tiers
 */
export function classifyFileRisk(filePath: string): FileRiskClassification {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Check Tier 0
  for (const rule of TIER_0_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return {
        filePath: normalized,
        tier: 'TIER_0_CRITICAL',
        riskWeight: 100,
        reason: rule.reason,
        requiresDualCustody: true,
      };
    }
  }

  // Check Tier 1
  for (const rule of TIER_1_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return {
        filePath: normalized,
        tier: 'TIER_1_PERSISTENCE',
        riskWeight: 75,
        reason: rule.reason,
        requiresDualCustody: true,
      };
    }
  }

  // Check Tier 3
  for (const rule of TIER_3_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return {
        filePath: normalized,
        tier: 'TIER_3_SAFE',
        riskWeight: 5,
        reason: rule.reason,
        requiresDualCustody: false,
      };
    }
  }

  // Default: Tier 2 Application Code
  return {
    filePath: normalized,
    tier: 'TIER_2_APPLICATION',
    riskWeight: 35,
    reason: 'Application logic, component, or service code',
    requiresDualCustody: false,
  };
}

/**
 * Evaluates the blast radius of a set of files touched by an AI agent or PR
 */
export function evaluateAgentBlastRadius(filePaths: string[]): BlastRadiusEvaluation {
  if (!filePaths || filePaths.length === 0) {
    return {
      overallScore: 0,
      highestTier: 'TIER_3_SAFE',
      requiresDualCustody: false,
      blockedAutonomousMerge: false,
      criticalFileCount: 0,
      fileClassifications: [],
      summary: 'No files modified in changeset.',
      remediation: 'None required.',
      evaluationSha256: createHash('sha256').update('empty').digest('hex'),
    };
  }

  const classifications = filePaths.map(classifyFileRisk);

  let highestTier: BlastRadiusTier = 'TIER_3_SAFE';
  let criticalCount = 0;

  for (const c of classifications) {
    if (c.tier === 'TIER_0_CRITICAL') {
      highestTier = 'TIER_0_CRITICAL';
      criticalCount += 1;
    } else if (c.tier === 'TIER_1_PERSISTENCE' && highestTier !== 'TIER_0_CRITICAL') {
      highestTier = 'TIER_1_PERSISTENCE';
    } else if (c.tier === 'TIER_2_APPLICATION' && highestTier === 'TIER_3_SAFE') {
      highestTier = 'TIER_2_APPLICATION';
    }
  }

  // Composite score: maximum risk tier weight (70%) + scale based on count of files (30%)
  const maxIndividualRisk = Math.max(...classifications.map((c) => c.riskWeight));
  const fileVolumeFactor = Math.min(30, classifications.length * 3);
  const overallScore = Math.min(100, Math.round(maxIndividualRisk * 0.7 + fileVolumeFactor));

  const requiresDualCustody = highestTier === 'TIER_0_CRITICAL' || highestTier === 'TIER_1_PERSISTENCE';
  const blockedAutonomousMerge = requiresDualCustody;

  let summary = '';
  let remediation = '';

  if (highestTier === 'TIER_0_CRITICAL') {
    summary = `CRITICAL BLAST RADIUS: AI Agent modified ${criticalCount} Tier-0 perimeter file(s). Autonomous merge BLOCKED.`;
    remediation = 'Requires cryptographic dual-custody approval from a platform engineer or designated security custodian before merge.';
  } else if (highestTier === 'TIER_1_PERSISTENCE') {
    summary = 'HIGH BLAST RADIUS: Agent modified persistence schema or ledger logic. Autonomous merge BLOCKED.';
    remediation = 'Database migration / ledger review required by a database administrator or senior engineer.';
  } else if (highestTier === 'TIER_2_APPLICATION') {
    summary = 'MODERATE BLAST RADIUS: Agent modified application domain services. Standard PR review gates apply.';
    remediation = 'Verify unit tests pass and code conforms to repo style guidelines.';
  } else {
    summary = 'LOW BLAST RADIUS: Safe changes limited to tests, documentation, or static content.';
    remediation = 'Autonomous merge eligible if automated CI checks pass.';
  }

  const evaluationSha256 = createHash('sha256')
    .update(JSON.stringify({ filePaths: filePaths.sort(), overallScore, highestTier }))
    .digest('hex');

  return {
    overallScore,
    highestTier,
    requiresDualCustody,
    blockedAutonomousMerge,
    criticalFileCount: criticalCount,
    fileClassifications: classifications,
    summary,
    remediation,
    evaluationSha256,
  };
}
