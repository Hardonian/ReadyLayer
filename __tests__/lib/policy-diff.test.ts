import { describe, it, expect } from 'vitest';
import { comparePolicyRules, RuleComparison } from '../../lib/policies/diff';

describe('Policy Semantic Diff Engine', () => {
  it('detects added, removed, and modified rules between two policy versions', () => {
    const baseRules: RuleComparison[] = [
      {
        ruleId: 'security.sql-injection',
        enabled: true,
        severityMapping: { critical: 'block', high: 'block' },
      },
      {
        ruleId: 'style.redundant-comments',
        enabled: true,
        severityMapping: { medium: 'warn' },
      },
      {
        ruleId: 'quality.dead-code',
        enabled: true,
        severityMapping: { low: 'allow' },
      },
    ];

    const targetRules: RuleComparison[] = [
      // Modified severity mapping
      {
        ruleId: 'security.sql-injection',
        enabled: true,
        severityMapping: { critical: 'block', high: 'warn' },
      },
      // Added rule
      {
        ruleId: 'ai.hallucinated-imports',
        enabled: true,
        severityMapping: { high: 'block' },
      },
      // Unchanged rule
      {
        ruleId: 'quality.dead-code',
        enabled: true,
        severityMapping: { low: 'allow' },
      },
      // (style.redundant-comments was removed)
    ];

    const diff = comparePolicyRules(baseRules, targetRules, '1.0.0', '1.1.0');

    expect(diff.hasChanges).toBe(true);
    expect(diff.summary.addedCount).toBe(1);
    expect(diff.addedRules[0].ruleId).toBe('ai.hallucinated-imports');

    expect(diff.summary.removedCount).toBe(1);
    expect(diff.removedRules[0].ruleId).toBe('style.redundant-comments');

    expect(diff.summary.modifiedCount).toBe(1);
    expect(diff.modifiedRules[0].ruleId).toBe('security.sql-injection');
    expect(diff.modifiedRules[0].changes[0].field).toBe('severityMapping');

    expect(diff.summary.unchangedCount).toBe(1);
    expect(diff.unchangedRules).toContain('quality.dead-code');
  });

  it('reports hasChanges: false when policies are identical', () => {
    const rules: RuleComparison[] = [
      {
        ruleId: 'security.secret-leak',
        enabled: true,
        severityMapping: { critical: 'block' },
      },
    ];

    const diff = comparePolicyRules(rules, rules, '1.0.0', '1.0.0');
    expect(diff.hasChanges).toBe(false);
    expect(diff.summary.addedCount).toBe(0);
    expect(diff.summary.removedCount).toBe(0);
    expect(diff.summary.modifiedCount).toBe(0);
    expect(diff.summary.unchangedCount).toBe(1);
  });
});
