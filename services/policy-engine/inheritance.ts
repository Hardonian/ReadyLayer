import { createClient } from '@/lib/supabase/server';
import type { PolicyRule } from './templates';

export interface PolicyHierarchy {
  organizationPolicy: any;
  repoOverrides: any[];
  effectivePolicy: any;
  inheritanceChain: string[];
}

class PolicyInheritanceEngine {
  /**
   * Get the effective policy for a repository
   * Combines organization policy with repo-level overrides
   */
  async getEffectivePolicy(
    organizationId: string,
    repositoryId: string
  ): Promise<PolicyHierarchy> {
    const supabase = createClient();

    // Get organization-level default policy
    const { data: orgPolicy } = await supabase
      .from('org_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single();

    // Get repository-level policy overrides
    const { data: repoOverrides } = await supabase
      .from('repo_policies')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('organization_id', organizationId);

    // Merge policies
    const effectivePolicy = this.mergePolicy(
      orgPolicy,
      repoOverrides || []
    );

    const inheritanceChain: string[] = [];
    if (orgPolicy) inheritanceChain.push('organization');
    if (repoOverrides && repoOverrides.length > 0)
      inheritanceChain.push('repository');

    return {
      organizationPolicy: orgPolicy,
      repoOverrides: repoOverrides || [],
      effectivePolicy,
      inheritanceChain,
    };
  }

  /**
   * Set organization-level default policy
   */
  async setOrganizationPolicy(
    organizationId: string,
    policyData: any
  ): Promise<any> {
    const supabase = createClient();

    // First, unset any existing default
    await supabase
      .from('org_policies')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true);

    // Insert new default policy
    const { data, error } = await supabase
      .from('org_policies')
      .insert({
        organization_id: organizationId,
        name: policyData.name,
        description: policyData.description,
        rules: policyData.rules,
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Override policy at repository level
   */
  async setRepositoryPolicy(
    organizationId: string,
    repositoryId: string,
    policyData: any,
    inherit: boolean = true
  ): Promise<any> {
    const supabase = createClient();

    // Check if override exists
    const { data: existing } = await supabase
      .from('repo_policies')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('repository_id', repositoryId)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('repo_policies')
        .update({
          rules: policyData.rules,
          inherit_org_policy: inherit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('repo_policies')
        .insert({
          organization_id: organizationId,
          repository_id: repositoryId,
          rules: policyData.rules,
          inherit_org_policy: inherit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  /**
   * Clear repository-level overrides (revert to org policy)
   */
  async clearRepositoryOverrides(
    organizationId: string,
    repositoryId: string
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('repo_policies')
      .delete()
      .eq('organization_id', organizationId)
      .eq('repository_id', repositoryId);

    if (error) throw error;
  }

  /**
   * Get all repositories affected by an organization policy
   */
  async getAffectedRepositories(
    organizationId: string,
    policyId: string
  ): Promise<string[]> {
    const supabase = createClient();

    // Get all repos that inherit from this org policy
    const { data } = await supabase
      .from('repositories')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('policy_id', policyId);

    return (data || []).map((r) => r.id);
  }

  /**
   * Propagate org policy to repositories
   */
  async propagatePolicy(
    organizationId: string,
    policyId: string,
    targetRepos?: string[]
  ): Promise<number> {
    const supabase = createClient();

    if (targetRepos && targetRepos.length > 0) {
      // Update specific repos
      const { data, error } = await supabase
        .from('repositories')
        .update({ policy_id: policyId })
        .in('id', targetRepos)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return targetRepos.length;
    } else {
      // Update all repos in organization
      const { data, error } = await supabase
        .from('repositories')
        .update({ policy_id: policyId })
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data?.length || 0;
    }
  }

  /**
   * Merge organization and repository policies
   */
  private mergePolicy(
    orgPolicy: any,
    repoOverrides: any[]
  ): any {
    if (!orgPolicy) {
      return null;
    }

    let mergedRules = [...(orgPolicy.rules || [])];

    // Apply repository overrides
    for (const override of repoOverrides) {
      if (override.inherit_org_policy) {
        // Merge rules
        const overrideRuleIds = override.rules.map((r: any) => r.id);

        // Remove org rules that are overridden
        mergedRules = mergedRules.filter(
          (r: any) => !overrideRuleIds.includes(r.id)
        );

        // Add override rules
        mergedRules = [...mergedRules, ...override.rules];
      } else {
        // Complete override
        mergedRules = override.rules;
      }
    }

    return {
      id: orgPolicy.id,
      name: orgPolicy.name,
      description: orgPolicy.description,
      rules: mergedRules,
      isDefault: orgPolicy.is_default,
    };
  }

  /**
   * Get policy hierarchy for display
   */
  async getPolicyHierarchy(
    organizationId: string,
    repositoryId: string
  ): Promise<PolicyHierarchy> {
    return this.getEffectivePolicy(organizationId, repositoryId);
  }

  /**
   * Validate policy against code changes
   */
  async validatePolicy(
    effectivePolicy: any,
    files: Array<{ path: string; content: string }>
  ): Promise<Array<{ file: string; rule: string; severity: string }>> {
    const violations: Array<{
      file: string;
      rule: string;
      severity: string;
    }> = [];

    if (!effectivePolicy?.rules) {
      return violations;
    }

    for (const file of files) {
      for (const rule of effectivePolicy.rules) {
        if (!rule.pattern) continue;

        try {
          const regex = new RegExp(rule.pattern, 'gm');
          if (regex.test(file.content)) {
            violations.push({
              file: file.path,
              rule: rule.name || rule.id,
              severity: rule.severity || 'medium',
            });
          }
        } catch (err) {
          console.error(`Invalid regex in rule ${rule.id}:`, err);
        }
      }
    }

    return violations;
  }
}

export const policyInheritanceEngine = new PolicyInheritanceEngine();
