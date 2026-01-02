/**
 * Policy Engine Service
 * 
 * Deterministic Policy-as-Code evaluation layer
 * Governs Review Guard / Test Engine / Doc Sync decisions
 */

import { prisma } from '../../lib/prisma';
import { createHash } from 'crypto';
import { Issue } from '../static-analysis';

export interface PolicyPack {
  id: string;
  organizationId: string;
  repositoryId: string | null;
  version: string;
  source: string;
  checksum: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  ruleId: string;
  severityMapping: Record<string, 'block' | 'warn' | 'allow'>;
  enabled: boolean;
  params?: Record<string, any>;
}

export interface EffectivePolicy {
  pack: PolicyPack;
  rules: Map<string, PolicyRule>;
  waivers: Waiver[];
}

export interface Waiver {
  id: string;
  ruleId: string;
  scope: 'repo' | 'branch' | 'path';
  scopeValue?: string;
  expiresAt?: Date;
}

export interface EvaluationResult {
  blocked: boolean;
  score: number; // 0-100 deterministic score
  rulesFired: string[];
  waivedFindings: Issue[];
  nonWaivedFindings: Issue[];
  blockingReason?: string;
}

export interface EvidenceInputs {
  diffHash?: string;
  fileListHash?: string;
  commitSha?: string;
  branch?: string;
  prNumber?: number;
  [key: string]: any;
}

export interface EvidenceOutputs {
  findings: Issue[];
  evaluationResult: EvaluationResult;
  [key: string]: any;
}

export interface EvidenceBundle {
  id: string;
  reviewId?: string;
  testId?: string;
  docId?: string;
  inputsMetadata: EvidenceInputs;
  rulesFired: string[];
  deterministicScore: number;
  artifacts?: Record<string, string>;
  policyChecksum: string;
  toolVersions?: Record<string, string>;
  timings?: Record<string, number>;
  createdAt: Date;
}

export interface EvidenceExport {
  schemaVersion: string;
  evidenceBundle: EvidenceBundle;
  policy: {
    checksum: string;
    version: string;
    rules: PolicyRule[];
  };
  inputs: EvidenceInputs;
  outputs: EvidenceOutputs;
  timestamps: {
    createdAt: string;
    evaluatedAt: string;
  };
}

export class PolicyEngineService {
  /**
   * Load effective policy for org/repo/branch
   * Merges org-level defaults with repo-level overrides
   */
  async loadEffectivePolicy(
    organizationId: string,
    repositoryId: string | null,
    _ref?: string,
    _branch?: string
  ): Promise<EffectivePolicy> {
    // Load repo-level policy if repositoryId provided
    let repoPolicyPack: PolicyPack | null = null;
    if (repositoryId) {
      repoPolicyPack = await this.loadLatestPolicyPack(organizationId, repositoryId);
    }

    // Load org-level policy (fallback/defaults)
    const orgPolicyPack = await this.loadLatestPolicyPack(organizationId, null);

    // Use repo policy if available, otherwise org policy
    const activePack = repoPolicyPack || orgPolicyPack;

    if (!activePack) {
      // Return safe defaults if no policy configured (respects tier enforcement strength)
      return await this.getDefaultPolicy(organizationId, repositoryId);
    }

    // Load active waivers
    const waivers = await this.loadActiveWaivers(organizationId, repositoryId, _branch);

    // Build rules map
    const rulesMap = new Map<string, PolicyRule>();
    for (const rule of activePack.rules) {
      if (rule.enabled) {
        rulesMap.set(rule.ruleId, rule);
      }
    }

    return {
      pack: activePack,
      rules: rulesMap,
      waivers,
    };
  }

  /**
   * Evaluate findings against policy
   * Deterministic: same inputs + same policy = same result
   */
  evaluate(findings: Issue[], policy: EffectivePolicy): EvaluationResult {
    const waivedFindings: Issue[] = [];
    const nonWaivedFindings: Issue[] = [];
    const rulesFired = new Set<string>();

    // Apply waivers
    for (const finding of findings) {
      const waiver = this.findApplicableWaiver(finding, policy.waivers);
      if (waiver) {
        waivedFindings.push(finding);
      } else {
        nonWaivedFindings.push(finding);
        rulesFired.add(finding.ruleId);
      }
    }

    // Evaluate non-waived findings against policy rules
    let blocked = false;
    let blockingReason: string | undefined;
    let totalScore = 100; // Start at 100, deduct for issues

    for (const finding of nonWaivedFindings) {
      // Try to find specific rule for this ruleId, fallback to wildcard rule
      const rule = policy.rules.get(finding.ruleId) || policy.rules.get('*');
      const action = rule
        ? rule.severityMapping[finding.severity] || 'block'
        : this.getDefaultActionSync(finding.severity);

      if (action === 'block') {
        blocked = true;
        if (!blockingReason) {
          blockingReason = `${finding.severity} issue found: ${finding.ruleId} in ${finding.file}:${finding.line}`;
        }
      }

      // Deduct score based on severity
      const severityPenalty: Record<string, number> = {
        critical: 20,
        high: 10,
        medium: 5,
        low: 2,
      };
      totalScore -= severityPenalty[finding.severity] || 0;
    }

    // Ensure score is in valid range
    const score = Math.max(0, Math.min(100, totalScore));

    return {
      blocked,
      score,
      rulesFired: Array.from(rulesFired),
      waivedFindings,
      nonWaivedFindings,
      blockingReason,
    };
  }

  /**
   * Produce evidence bundle with stable hashing
   */
  async produceEvidence(
    inputs: EvidenceInputs,
    outputs: EvidenceOutputs,
    policy: EffectivePolicy,
    timings?: Record<string, number>,
    resourceId?: { reviewId?: string; testId?: string; docId?: string }
  ): Promise<EvidenceBundle> {
    // Calculate stable hashes for inputs
    const diffHash = inputs.diffHash || this.hashContent(JSON.stringify(inputs));
    const fileListHash = inputs.fileListHash || this.hashContent(JSON.stringify(inputs.files || []));

    // Build inputs metadata
    const inputsMetadata: EvidenceInputs = {
      ...inputs,
      diffHash,
      fileListHash,
    };

    // Get tool versions
    const toolVersions = {
      policyEngine: '1.0.0',
      nodeVersion: process.version,
      ...(inputs.toolVersions || {}),
    };

    // Create evidence bundle
    const bundle = await prisma.evidenceBundle.create({
      data: {
        reviewId: resourceId?.reviewId,
        testId: resourceId?.testId,
        docId: resourceId?.docId,
        inputsMetadata: inputsMetadata as any,
        rulesFired: outputs.evaluationResult.rulesFired as any,
        deterministicScore: outputs.evaluationResult.score,
        artifacts: outputs.artifacts as any,
        policyChecksum: policy.pack.checksum,
        toolVersions: toolVersions as any,
        timings: timings as any,
      },
    });

    return {
      id: bundle.id,
      reviewId: bundle.reviewId || undefined,
      testId: bundle.testId || undefined,
      docId: bundle.docId || undefined,
      inputsMetadata,
      rulesFired: outputs.evaluationResult.rulesFired,
      deterministicScore: Number(bundle.deterministicScore),
      artifacts: bundle.artifacts as Record<string, string> | undefined,
      policyChecksum: bundle.policyChecksum,
      toolVersions: bundle.toolVersions as Record<string, string> | undefined,
      timings: bundle.timings as Record<string, number> | undefined,
      createdAt: bundle.createdAt,
    };
  }

  /**
   * Export evidence in stable JSON format
   */
  exportEvidence(bundle: EvidenceBundle, policy: EffectivePolicy, inputs: EvidenceInputs, outputs: EvidenceOutputs): EvidenceExport {
    return {
      schemaVersion: '1.0.0',
      evidenceBundle: bundle,
      policy: {
        checksum: policy.pack.checksum,
        version: policy.pack.version,
        rules: Array.from(policy.rules.values()),
      },
      inputs,
      outputs,
      timestamps: {
        createdAt: bundle.createdAt.toISOString(),
        evaluatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Load latest policy pack for org/repo
   */
  private async loadLatestPolicyPack(
    organizationId: string,
    repositoryId: string | null
  ): Promise<PolicyPack | null> {
    const pack = await prisma.policyPack.findFirst({
      where: {
        organizationId,
        repositoryId: repositoryId || null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        rules: true,
      },
    });

    if (!pack) {
      return null;
    }

    return {
      id: pack.id,
      organizationId: pack.organizationId,
      repositoryId: pack.repositoryId,
      version: pack.version,
      source: pack.source,
      checksum: pack.checksum,
      rules: pack.rules.map((r) => ({
        id: r.id,
        ruleId: r.ruleId,
        severityMapping: r.severityMapping as Record<string, 'block' | 'warn' | 'allow'>,
        enabled: r.enabled,
        params: r.params as Record<string, any> | undefined,
      })),
    };
  }

  /**
   * Load active waivers
   */
  private async loadActiveWaivers(
    organizationId: string,
    repositoryId: string | null,
    _branch?: string
  ): Promise<Waiver[]> {
    const now = new Date();
    const waivers = await prisma.waiver.findMany({
      where: {
        organizationId,
        repositoryId: repositoryId || null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });

    return waivers.map((w) => ({
      id: w.id,
      ruleId: w.ruleId,
      scope: w.scope as 'repo' | 'branch' | 'path',
      scopeValue: w.scopeValue || undefined,
      expiresAt: w.expiresAt || undefined,
    }));
  }

  /**
   * Find applicable waiver for a finding
   */
  private findApplicableWaiver(finding: Issue, waivers: Waiver[]): Waiver | null {
    for (const waiver of waivers) {
      if (waiver.ruleId !== finding.ruleId) {
        continue;
      }

      // Check if waiver applies based on scope
      if (waiver.scope === 'repo') {
        return waiver;
      }

      if (waiver.scope === 'branch' && waiver.scopeValue) {
        // Would need branch info in finding context
        // For now, assume branch-level waivers apply
        return waiver;
      }

      if (waiver.scope === 'path' && waiver.scopeValue) {
        // Simple pattern matching
        const pattern = new RegExp(waiver.scopeValue.replace(/\*/g, '.*'));
        if (pattern.test(finding.file)) {
          return waiver;
        }
      }
    }

    return null;
  }

  /**
   * Get default action for severity (synchronous version for evaluate method)
   * Note: This uses conservative defaults. Tier-specific enforcement is handled
   * by ensuring policy rules are loaded with correct severity mappings.
   */
  private getDefaultActionSync(severity: string): 'block' | 'warn' | 'allow' {
    // Conservative defaults: block critical/high, warn medium, allow low
    // Tier-specific enforcement is handled by policy rules loaded in loadEffectivePolicy
    const defaults: Record<string, 'block' | 'warn' | 'allow'> = {
      critical: 'block',
      high: 'block',
      medium: 'warn',
      low: 'allow',
    };
    return defaults[severity] || 'warn';
  }

  /**
   * Get default policy (safe defaults when no policy configured)
   * Respects tier enforcement strength by creating default rules
   * 
   * DETERMINISTIC: This function always returns the same policy for the same tier.
   * The policy is deterministic because:
   * 1. Tier enforcement strength is read from organization (immutable during request)
   * 2. Severity mappings are hardcoded constants (same input → same output)
   * 3. No random or time-based logic
   */
  private async getDefaultPolicy(
    organizationId: string,
    repositoryId: string | null
  ): Promise<EffectivePolicy> {
    // Get tier enforcement strength (deterministic - reads from database, doesn't change during request)
    const { billingService } = await import('../../billing');
    const enforcementStrength = await billingService.getEnforcementStrength(organizationId);

    // DETERMINISTIC: Hardcoded severity mappings - same tier always produces same mappings
    // These mappings are deterministic constants, not computed dynamically
    const severityMappings: Record<string, Record<string, 'block' | 'warn' | 'allow'>> = {
      basic: {
        critical: 'block',
        high: 'warn', // Basic tier: only critical blocks
        medium: 'allow',
        low: 'allow',
      },
      moderate: {
        critical: 'block',
        high: 'block', // Moderate tier: critical + high block
        medium: 'warn',
        low: 'allow',
      },
      maximum: {
        critical: 'block',
        high: 'block',
        medium: 'block', // Maximum tier: critical + high + medium block
        low: 'warn',
      },
    };

    const defaultMapping = severityMappings[enforcementStrength] || severityMappings.basic;

    // Create a default rule that applies to all rule IDs
    const defaultRule: PolicyRule = {
      id: 'default',
      ruleId: '*', // Wildcard rule ID
      severityMapping: defaultMapping,
      enabled: true,
    };

    const rulesMap = new Map<string, PolicyRule>();
    rulesMap.set('*', defaultRule);

    const defaultSource = JSON.stringify({
      version: '1.0.0',
      rules: [defaultRule],
      enforcementStrength,
    });
    const checksum = this.hashContent(defaultSource);

    return {
      pack: {
        id: 'default',
        organizationId,
        repositoryId,
        version: '1.0.0',
        source: defaultSource,
        checksum,
        rules: [defaultRule],
      },
      rules: rulesMap,
      waivers: [],
    };
  }

  /**
   * Hash content deterministically
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}

export const policyEngineService = new PolicyEngineService();
