/**
 * Policy Engine Determinism Tests
 *
 * Ensures same inputs + same policy = identical results
 */

import { describe, it, expect, vi } from 'vitest';
import { policyEngineService, type EffectivePolicy, type EvaluationResult } from '../index';
import type { Issue } from '../../services/static-analysis';

// Mock prisma to avoid DATABASE_URL requirement
vi.mock('../../lib/prisma', () => ({
  prisma: {
    policyPack: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    waiver: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock billing service
vi.mock('../../billing', () => ({
  billingService: {
    getEnforcementStrength: vi.fn().mockResolvedValue('moderate'),
  },
  BILLING_TIERS: {
    starter: { limits: { llmTokensPerDay: 10000 } },
  },
}));

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

  // Create a mock policy that doesn't require database
  const createMockPolicy = (): EffectivePolicy => ({
    pack: {
      id: 'test-pack',
      organizationId: 'test-org',
      repositoryId: null,
      version: '1.0.0',
      source: JSON.stringify({ version: '1.0.0', rules: [] }),
      checksum: 'abc123',
      rules: [
        {
          id: 'default',
          ruleId: '*',
          severityMapping: {
            critical: 'block',
            high: 'block',
            medium: 'warn',
            low: 'allow',
          },
          enabled: true,
        },
      ],
    },
    rules: new Map([
      [
        '*',
        {
          id: 'default',
          ruleId: '*',
          severityMapping: {
            critical: 'block',
            high: 'block',
            medium: 'warn',
            low: 'allow',
          },
          enabled: true,
        },
      ],
    ]),
    waivers: [],
  });

  it('should produce identical results for same inputs and policy', () => {
    const policy = createMockPolicy();

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

  it('should produce identical scores for same findings', () => {
    const policy = createMockPolicy();

    const result1 = policyEngineService.evaluate(mockFindings, policy);
    const result2 = policyEngineService.evaluate([...mockFindings], policy); // Copy array

    expect(result1.score).toBe(result2.score);
  });

  it('should handle empty findings deterministically', () => {
    const policy = createMockPolicy();

    const result1 = policyEngineService.evaluate([], policy);
    const result2 = policyEngineService.evaluate([], policy);

    expect(result1.blocked).toBe(false);
    expect(result1.score).toBe(100);
    expect(result1).toEqual(result2);
  });
});
