/**
 * Policy Engine Determinism Tests
 * 
 * Ensures same inputs + same policy = identical results
 */

import { policyEngineService, Issue } from '../index';

describe('Policy Engine Determinism', () => {
  const mockFindings: Issue[] = [
    {
      ruleId: 'security.sql-injection',
      severity: 'critical',
      file: 'src/api/users.ts',
      line: 42,
      message: 'Potential SQL injection vulnerability',
      fix: 'Use parameterized queries',
      confidence: 0.9,
    },
    {
      ruleId: 'quality.unused-variable',
      severity: 'low',
      file: 'src/utils/helpers.ts',
      line: 15,
      message: 'Unused variable detected',
      fix: 'Remove unused variable',
      confidence: 0.8,
    },
  ];

  it('should produce identical results for same inputs and policy', async () => {
    const orgId = 'test-org';
    const repoId = 'test-repo';

    // Create a mock policy
    const policy = await policyEngineService.loadEffectivePolicy(orgId, repoId);

    // Evaluate findings twice
    const result1 = policyEngineService.evaluate(mockFindings, policy);
    const result2 = policyEngineService.evaluate(mockFindings, policy);

    // Results should be identical
    expect(result1.blocked).toBe(result2.blocked);
    expect(result1.score).toBe(result2.score);
    expect(result1.rulesFired).toEqual(result2.rulesFired);
    expect(result1.waivedFindings.length).toBe(result2.waivedFindings.length);
    expect(result1.nonWaivedFindings.length).toBe(result2.nonWaivedFindings.length);
  });

  it('should produce identical scores for same findings', async () => {
    const orgId = 'test-org';
    const repoId = 'test-repo';

    const policy = await policyEngineService.loadEffectivePolicy(orgId, repoId);

    const result1 = policyEngineService.evaluate(mockFindings, policy);
    const result2 = policyEngineService.evaluate([...mockFindings], policy); // Copy array

    expect(result1.score).toBe(result2.score);
  });

  it('should handle empty findings deterministically', async () => {
    const orgId = 'test-org';
    const repoId = 'test-repo';

    const policy = await policyEngineService.loadEffectivePolicy(orgId, repoId);

    const result1 = policyEngineService.evaluate([], policy);
    const result2 = policyEngineService.evaluate([], policy);

    expect(result1.blocked).toBe(false);
    expect(result1.score).toBe(100);
    expect(result1).toEqual(result2);
  });
});
