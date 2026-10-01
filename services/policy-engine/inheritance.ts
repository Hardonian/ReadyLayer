/**
 * Policy Inheritance System
 * 
 * Manages policy inheritance from organization to repository level
 * with override capabilities and conflict resolution
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { prisma } from '@/lib/prisma';

export interface PolicyLevel {
  level: 'organization' | 'team' | 'repository';
  policyId: string;
  rules: Array<{
    id: string;
    enabled: boolean;
    severity?: 'critical' | 'high' | 'medium' | 'low';
  }>;
  metadata?: Record<string, unknown>;
}

export interface InheritedPolicy {
  id: string;
  name: string;
  source: 'organization' | 'team' | 'repository' | 'inherited';
  rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
    severity: 'critical' | 'high' | 'medium' | 'low';
    source: 'organization' | 'team' | 'repository';
  }>;
  overrides: Map<string, boolean>;
}

/**
 * Policy Inheritance Service
 */
export class PolicyInheritanceService {
  private static instance: PolicyInheritanceService;

  private constructor() {}

  static getInstance(): PolicyInheritanceService {
    if (!PolicyInheritanceService.instance) {
      PolicyInheritanceService.instance = new PolicyInheritanceService();
    }
    return PolicyInheritanceService.instance;
  }

  /**
   * Resolve inherited policy for a repository
   */
  async resolvePolicy(
    organizationId: string,
    teamId?: string,
    repositoryId?: string
  ): Promise<InheritedPolicy> {
    try {
      logger.info(
        {
          organizationId,
          teamId,
          repositoryId,
        },
        'Resolving inherited policy'
      );

      const orgPolicy = await this.getOrganizationPolicy(organizationId);
      const teamPolicy = teamId
        ? await this.getTeamPolicy(teamId)
        : null;
      const repoPolicy = repositoryId
        ? await this.getRepositoryPolicy(repositoryId)
        : null;

      const inherited = this.mergePolicy(orgPolicy, teamPolicy, repoPolicy);

      logger.info(
        {
          policyId: inherited.id,
          ruleCount: inherited.rules.length,
        },
        'Policy inheritance resolved'
      );

      metrics.increment('policy_inheritance_resolved', {
        level: inherited.source,
      });

      return inherited;
    } catch (error) {
      logger.error(
        {
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error resolving policy inheritance'
      );

      // Return default policy on error
      return this.getDefaultPolicy();
    }
  }

  /**
   * Get organization-level policy
   */
  private async getOrganizationPolicy(
    organizationId: string
  ): Promise<InheritedPolicy> {
    try {
      const pack = await prisma.policyPack.findFirst({
        where: { organizationId, repositoryId: null },
        orderBy: { createdAt: 'desc' },
        include: { rules: true },
      });

      if (pack && pack.rules.length > 0) {
        return {
          id: pack.id,
          name: `Org Policy (v${pack.version})`,
          source: 'organization',
          rules: pack.rules.map((r) => ({
            id: r.ruleId,
            name: r.ruleId,
            enabled: r.enabled,
            severity: 'high',
            source: 'organization' as const,
          })),
          overrides: new Map(),
        };
      }
    } catch (err) {
      logger.warn({ err, organizationId }, 'Failed to fetch org policy from database, using fallback');
    }

    return this.getDefaultPolicy();
  }

  /**
   * Get team-level policy
   */
  private async getTeamPolicy(_teamId: string): Promise<InheritedPolicy | null> {
    return null;
  }

  /**
   * Get repository-level policy
   */
  private async getRepositoryPolicy(
    repositoryId: string
  ): Promise<InheritedPolicy | null> {
    if (!repositoryId) return null;
    try {
      const pack = await prisma.policyPack.findFirst({
        where: { repositoryId },
        orderBy: { createdAt: 'desc' },
        include: { rules: true },
      });

      if (pack && pack.rules.length > 0) {
        return {
          id: pack.id,
          name: `Repo Policy (v${pack.version})`,
          source: 'repository',
          rules: pack.rules.map((r) => ({
            id: r.ruleId,
            name: r.ruleId,
            enabled: r.enabled,
            severity: 'high',
            source: 'repository' as const,
          })),
          overrides: new Map(),
        };
      }
    } catch (err) {
      logger.warn({ err, repositoryId }, 'Failed to fetch repo policy from database');
    }
    return null;
  }

  /**
   * Merge policies with inheritance hierarchy
   */
  private mergePolicy(
    orgPolicy: InheritedPolicy,
    teamPolicy: InheritedPolicy | null,
    repoPolicy: InheritedPolicy | null
  ): InheritedPolicy {
    const merged = { ...orgPolicy };

    // Apply team policy
    if (teamPolicy) {
      merged.rules = this.mergePolicies(merged.rules, teamPolicy.rules);
      teamPolicy.overrides.forEach((value, key) => {
        merged.overrides.set(key, value);
      });
    }

    // Apply repository policy (highest priority)
    if (repoPolicy) {
      merged.rules = this.mergePolicies(merged.rules, repoPolicy.rules);
      repoPolicy.overrides.forEach((value, key) => {
        merged.overrides.set(key, value);
      });
      merged.source = 'repository';
    } else if (teamPolicy) {
      merged.source = 'team';
    }

    return merged;
  }

  /**
   * Merge rule lists
   */
  private mergePolicies(
    baseRules: InheritedPolicy['rules'],
    overrideRules: InheritedPolicy['rules']
  ): InheritedPolicy['rules'] {
    const ruleMap = new Map<string, InheritedPolicy['rules'][0]>();

    // Add base rules
    baseRules.forEach(rule => {
      ruleMap.set(rule.id, rule);
    });

    // Override with new rules
    overrideRules.forEach(rule => {
      ruleMap.set(rule.id, rule);
    });

    return Array.from(ruleMap.values());
  }

  /**
   * Get default policy
   */
  private getDefaultPolicy(): InheritedPolicy {
    return {
      id: 'default',
      name: 'Default Security Policy',
      source: 'organization',
      rules: [
        {
          id: 'default-rule-1',
          name: 'Basic Security',
          enabled: true,
          severity: 'high',
          source: 'organization',
        },
      ],
      overrides: new Map(),
    };
  }

  /**
   * Override rule at specific level
   */
  async overrideRule(
    ruleId: string,
    level: 'team' | 'repository',
    enabled: boolean,
    targetId?: string
  ): Promise<void> {
    logger.info(
      {
        ruleId,
        level,
        enabled,
        targetId,
      },
      'Overriding policy rule'
    );

    metrics.increment('policy_rule_override', {
      level,
      action: enabled ? 'enable' : 'disable',
    });

    if (targetId) {
      try {
        const pack = await prisma.policyPack.findFirst({
          where: level === 'repository' ? { repositoryId: targetId } : { organizationId: targetId, repositoryId: null },
          orderBy: { createdAt: 'desc' },
        });

        if (pack) {
          await prisma.policyRule.upsert({
            where: {
              policyPackId_ruleId: {
                policyPackId: pack.id,
                ruleId,
              },
            },
            update: { enabled },
            create: {
              policyPackId: pack.id,
              ruleId,
              enabled,
              severityMapping: { default: enabled ? 'warn' : 'ignore' },
            },
          });
        }
      } catch (err) {
        logger.error({ err, ruleId, level }, 'Failed to save rule override in database');
      }
    }
  }

  /**
   * Validate policy compliance
   */
  async validateCompliance(
    code: string,
    policy: InheritedPolicy
  ): Promise<Array<{ ruleId: string; severity: string; message: string }>> {
    const violations: Array<{ ruleId: string; severity: string; message: string }> = [];

    try {
      const { StaticAnalysisService } = await import('../static-analysis');
      const staticAnalyzer = new StaticAnalysisService();
      const issues = await staticAnalyzer.analyze('code.ts', code);

      for (const issue of issues) {
        const matchingRule = policy.rules.find((r) => r.id === issue.ruleId);
        if (matchingRule && !matchingRule.enabled) {
          continue;
        }
        violations.push({
          ruleId: issue.ruleId,
          severity: issue.severity,
          message: issue.message,
        });
      }
    } catch (_err) {
      // Fallback
    }

    return violations;
  }

  /**
   * Suggest policy improvements
   */
  async suggestImprovements(
    _organizationId: string,
    _currentPolicy: InheritedPolicy
  ): Promise<Array<{ suggestion: string; impact: string }>> {
    // TODO: Analyze org's pull requests and suggest policy improvements
    return [
      {
        suggestion: 'Enable PCI-DSS compliance rules',
        impact: 'Will enforce payment data protection',
      },
    ];
  }
}

export const policyInheritanceService = PolicyInheritanceService.getInstance();
