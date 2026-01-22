import { describe, it, expect } from 'vitest';
import {
  policyEngineService,
  type EffectivePolicy,
  type PolicyPack,
  type PolicyRule,
} from '../../services/policy-engine';
import type { Issue } from '../../services/static-analysis';

describe('Policy Gate Integration', () => {
  it('blocks when policy maps critical findings to block', () => {
    const rule: PolicyRule = {
      id: 'rule-1',
      ruleId: '*',
      severityMapping: {
        critical: 'block',
        high: 'warn',
        medium: 'warn',
        low: 'allow',
      },
      enabled: true,
    };

    const pack: PolicyPack = {
      id: 'pack-1',
      organizationId: 'org-1',
      repositoryId: null,
      version: '1.0.0',
      source: 'test',
      checksum: 'checksum',
      rules: [rule],
    };

    const policy: EffectivePolicy = {
      pack,
      rules: new Map([[rule.ruleId, rule]]),
      waivers: [],
    };

    const findings: Issue[] = [
      {
        ruleId: 'security.sql-injection',
        severity: 'critical',
        file: 'src/api.ts',
        line: 10,
        message: 'SQL injection risk',
        confidence: 0.9,
      },
    ];

    const result = policyEngineService.evaluate(findings, policy);

    expect(result.blocked).toBe(true);
    expect(result.rulesFired).toContain('security.sql-injection');
  });
});
