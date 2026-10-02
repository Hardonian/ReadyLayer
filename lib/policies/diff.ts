/**
 * Semantic Policy Diff Utility
 * 
 * Compares two policy pack configurations and produces a structured,
 * semantic diff of added, removed, and modified rules.
 */

export interface RuleComparison {
  ruleId: string;
  enabled?: boolean;
  severityMapping?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface RuleChange {
  ruleId: string;
  field: 'enabled' | 'severityMapping' | 'params';
  from: unknown;
  to: unknown;
}

export interface PolicySemanticDiff {
  hasChanges: boolean;
  baseVersion: string;
  targetVersion: string;
  addedRules: RuleComparison[];
  removedRules: RuleComparison[];
  modifiedRules: Array<{
    ruleId: string;
    changes: RuleChange[];
  }>;
  unchangedRules: string[];
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

/**
 * Parse raw policy source (JSON or YAML-like key-value) into structured rules
 */
export function extractRulesFromSource(source: string): RuleComparison[] {
  try {
    const parsed = JSON.parse(source) as { rules?: unknown };
    if (parsed && Array.isArray(parsed.rules)) {
      return parsed.rules as RuleComparison[];
    }
  } catch {
    // If not JSON, attempt basic parsing or return empty
  }
  return [];
}

/**
 * Compare two sets of rules to produce a semantic diff.
 */
export function comparePolicyRules(
  baseRules: RuleComparison[],
  targetRules: RuleComparison[],
  baseVersion = 'base',
  targetVersion = 'target'
): PolicySemanticDiff {
  const baseMap = new Map<string, RuleComparison>();
  const targetMap = new Map<string, RuleComparison>();

  for (const r of baseRules) {
    baseMap.set(r.ruleId, r);
  }
  for (const r of targetRules) {
    targetMap.set(r.ruleId, r);
  }

  const addedRules: RuleComparison[] = [];
  const removedRules: RuleComparison[] = [];
  const modifiedRules: Array<{ ruleId: string; changes: RuleChange[] }> = [];
  const unchangedRules: string[] = [];

  // Check for additions and modifications
  for (const [ruleId, targetRule] of targetMap.entries()) {
    const baseRule = baseMap.get(ruleId);
    if (!baseRule) {
      addedRules.push(targetRule);
      continue;
    }

    const changes: RuleChange[] = [];

    // Compare enabled
    if (baseRule.enabled !== targetRule.enabled && targetRule.enabled !== undefined) {
      changes.push({
        ruleId,
        field: 'enabled',
        from: baseRule.enabled,
        to: targetRule.enabled,
      });
    }

    // Compare severity mapping
    const baseSev = JSON.stringify(baseRule.severityMapping || {});
    const targetSev = JSON.stringify(targetRule.severityMapping || {});
    if (baseSev !== targetSev) {
      changes.push({
        ruleId,
        field: 'severityMapping',
        from: baseRule.severityMapping || {},
        to: targetRule.severityMapping || {},
      });
    }

    // Compare params
    const baseParams = JSON.stringify(baseRule.params || {});
    const targetParams = JSON.stringify(targetRule.params || {});
    if (baseParams !== targetParams) {
      changes.push({
        ruleId,
        field: 'params',
        from: baseRule.params || {},
        to: targetRule.params || {},
      });
    }

    if (changes.length > 0) {
      modifiedRules.push({ ruleId, changes });
    } else {
      unchangedRules.push(ruleId);
    }
  }

  // Check for removals
  for (const [ruleId, baseRule] of baseMap.entries()) {
    if (!targetMap.has(ruleId)) {
      removedRules.push(baseRule);
    }
  }

  const hasChanges = addedRules.length > 0 || removedRules.length > 0 || modifiedRules.length > 0;

  return {
    hasChanges,
    baseVersion,
    targetVersion,
    addedRules,
    removedRules,
    modifiedRules,
    unchangedRules,
    summary: {
      addedCount: addedRules.length,
      removedCount: removedRules.length,
      modifiedCount: modifiedRules.length,
      unchangedCount: unchangedRules.length,
    },
  };
}
