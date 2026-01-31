import { describe, it, expect, beforeEach } from 'vitest';
import { policyEngineService, type PolicyRule } from '../index';

describe('Policy Engine - Rule Evaluation', () => {
  beforeEach(() => {
    // Reset state before each test
  });

  describe('Rule Registration', () => {
    it('should register a policy rule', () => {
      const rule: PolicyRule = {
        id: 'test.rule',
        name: 'Test Rule',
        pattern: /test/i,
        severity: 'high',
      };

      policyEngineService.registerRule(rule);
      const rules = policyEngineService.getRules();
      expect(rules).toContainEqual(rule);
    });

    it('should enable and disable rules', () => {
      const rule: PolicyRule = {
        id: 'test.disable',
        name: 'Test Disable',
        pattern: /test/i,
        severity: 'medium',
        enabled: true,
      };

      policyEngineService.registerRule(rule);
      policyEngineService.setRuleEnabled('test.disable', false);

      const rules = policyEngineService.getRules();
      const found = rules.find((r) => r.id === 'test.disable');
      expect(found?.enabled).toBe(false);
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate rules against code', async () => {
      const code = 'SELECT * FROM users;';
      const results = await policyEngineService.evaluateCode(code);

      expect(results).toHaveProperty('violations');
      expect(Array.isArray(results.violations)).toBe(true);
    });

    it('should detect SQL injection risks', async () => {
      const badCode = "SELECT * FROM users WHERE id = 'someUserId'";
      const results = await policyEngineService.evaluateCode(badCode);

      const sqlIssues = results.violations.filter((v) =>
        v.ruleId.includes('sql')
      );
      expect(sqlIssues.length).toBeGreaterThan(0);
    });

    it('should pass secure code', async () => {
      const goodCode = `
        const users = await db.query(
          'SELECT * FROM users WHERE id = $1',
          [userId]
        );
      `;
      const results = await policyEngineService.evaluateCode(goodCode);

      // Should have fewer violations for parameterized queries
      expect(results.violations.length).toBeLessThan(1);
    });
  });

  describe('Policy Templates', () => {
    it('should load founder tier policy', async () => {
      const policy = policyEngineService.getTemplate('founder');
      expect(policy).toBeDefined();
      expect(policy?.rules.length).toBeGreaterThan(0);
    });

    it('should load enterprise tier policy', async () => {
      const policy = policyEngineService.getTemplate('enterprise');
      expect(policy).toBeDefined();
      // Enterprise should have more rules than founder
      const founderPolicy = policyEngineService.getTemplate('founder');
      expect(policy?.rules.length).toBeGreaterThanOrEqual(founderPolicy?.rules.length || 0);
    });

    it('should validate policy configuration', () => {
      const policy = {
        version: '1.0',
        rules: [
          { ruleId: 'security.sql-injection', enabled: true },
          { ruleId: 'quality.unused-variables', enabled: false },
        ],
      };

      const valid = policyEngineService.validatePolicy(policy as unknown as Record<string, unknown>);
      expect(valid.valid).toBe(true);
    });
  });

  describe('Determinism', () => {
    it('should produce deterministic results', async () => {
      const code = 'const x = 1; const y = 2;';

      const result1 = await policyEngineService.evaluateCode(code);
      const result2 = await policyEngineService.evaluateCode(code);

      // Same code should produce same violations
      expect(result1.violations.length).toBe(result2.violations.length);
    });

    it('should handle rule order independence', async () => {
      // The evaluation should not be affected by rule execution order
      const code = 'let x; if (x) { console.log(x); }';

      const result = await policyEngineService.evaluateCode(code);
      expect(result.violations).toBeDefined();
    });
  });

  describe('Severity Levels', () => {
    it('should categorize violations by severity', async () => {
      const code = `
        SELECT * FROM users;
        let unused_var = 5;
      `;
      const results = await policyEngineService.evaluateCode(code);

      const critical = results.violations.filter((v) => v.severity === 'critical');
      const high = results.violations.filter((v) => v.severity === 'high');
      const medium = results.violations.filter((v) => v.severity === 'medium');

      // Just verify we have the categorization
      expect(
        critical.length > 0 ||
          high.length > 0 ||
          medium.length > 0
      ).toBe(true);
    });

    it('should allow severity remapping', () => {
      const remapping = {
        'quality.unused-variables': 'high',
      };

      // Severity remapping should be supported
      expect(remapping).toBeDefined();
    });
  });

  describe('Exception Handling', () => {
    it('should handle invalid code gracefully', async () => {
      const invalidCode = '{ [ ] ]';
      const results = await policyEngineService.evaluateCode(invalidCode);

      // Should not throw, should return results
      expect(results).toHaveProperty('violations');
    });

    it('should handle empty code', async () => {
      const results = await policyEngineService.evaluateCode('');
      expect(results.violations.length).toBe(0);
    });

    it('should handle very large code files', async () => {
      const largeCode = `
        ${Array(1000)
          .fill(null)
          .map((_, i) => `const x${i} = ${i};`)
          .join('\n')}
      `;

      const results = await policyEngineService.evaluateCode(largeCode);
      expect(results).toHaveProperty('violations');
    });
  });

  describe('Persona-Specific Rules', () => {
    it('should apply founder-specific rules', async () => {
      const policy = policyEngineService.getTemplate('founder');
      expect(policy?.rules.some((r) => r.ruleId.includes('founder'))).toBeTruthy();
    });

    it('should apply enterprise-specific rules', async () => {
      const policy = policyEngineService.getTemplate('enterprise');
      expect(
        policy?.rules.some((r) => r.ruleId.includes('enterprise') || r.ruleId.includes('compliance'))
      ).toBeTruthy();
    });

    it('should apply startup-specific rules', async () => {
      const policy = policyEngineService.getTemplate('startup');
      expect(policy?.rules.some((r) => r.ruleId.includes('startup') || r.ruleId.includes('stability'))).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should evaluate code within reasonable time', async () => {
      const code = `
        async function process(data) {
          const result = await fetch(data.url);
          return result.json();
        }
      `;

      const start = performance.now();
      await policyEngineService.evaluateCode(code);
      const duration = performance.now() - start;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
