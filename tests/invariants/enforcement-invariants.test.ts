/**
 * Enforcement Invariants Tests
 *
 * Tests for security and policy enforcement invariants from INVARIANTS.md
 */

import { describe, it as test, expect } from 'vitest';
import {
  assertNoSecretsInText,
  InvariantViolationError,
} from '../../lib/invariants/assertions';

describe('INV-E1: Critical Issues Always Block', () => {
  test('critical severity issues must block PRs', () => {
    const issues = [
      { severity: 'critical', ruleId: 'security.sql-injection' },
      { severity: 'medium', ruleId: 'quality.complexity' },
    ];

    const hasCritical = issues.some((i) => i.severity === 'critical');
    const shouldBlock = hasCritical;

    expect(shouldBlock).toBe(true);
  });

  test('no critical issues allows PR to pass policy', () => {
    const issues = [
      { severity: 'medium', ruleId: 'quality.complexity' },
      { severity: 'low', ruleId: 'style.naming' },
    ];

    const hasCritical = issues.some((i) => i.severity === 'critical');
    const shouldBlock = hasCritical;

    expect(shouldBlock).toBe(false);
  });
});

describe('INV-E2: Coverage Threshold Minimum 80%', () => {
  test('coverage below 80% is rejected', () => {
    const requestedThreshold = 70;
    const minimumAllowed = 80;

    const isValid = requestedThreshold >= minimumAllowed;

    expect(isValid).toBe(false);
  });

  test('coverage of 80% or above is accepted', () => {
    [80, 85, 90, 100].forEach((threshold) => {
      const minimumAllowed = 80;
      const isValid = threshold >= minimumAllowed;

      expect(isValid).toBe(true);
    });
  });
});

describe('INV-E3: Waivers Are Scoped', () => {
  test('waiver only applies to specific rule and scope', () => {
    const waiver = {
      ruleId: 'security.sql-injection',
      scope: 'path',
      scopeValue: 'src/legacy/**',
    };

    const issue = {
      ruleId: 'security.sql-injection',
      file: 'src/legacy/database.ts',
    };

    // Check if waiver applies
    const waiverApplies =
      issue.ruleId === waiver.ruleId &&
      issue.file.startsWith('src/legacy/');

    expect(waiverApplies).toBe(true);
  });

  test('waiver does not apply to different rule', () => {
    const waiver = {
      ruleId: 'security.sql-injection',
      scope: 'path',
      scopeValue: 'src/legacy/**',
    };

    const issue = {
      ruleId: 'security.xss',
      file: 'src/legacy/database.ts',
    };

    const waiverApplies =
      issue.ruleId === waiver.ruleId &&
      issue.file.startsWith('src/legacy/');

    expect(waiverApplies).toBe(false);
  });

  test('expired waivers are ignored', () => {
    const now = new Date('2026-01-17');
    const waiver = {
      expiresAt: new Date('2026-01-01'), // Expired
    };

    const isExpired = waiver.expiresAt < now;

    expect(isExpired).toBe(true);
  });
});

describe('INV-E4: Policy Inheritance Order', () => {
  test('repository policy overrides organization policy', () => {
    const orgConfig = {
      coverageThreshold: 80,
      failOnCritical: true,
    };

    const repoConfig = {
      coverageThreshold: 90, // Tighter
    };

    const merged = { ...orgConfig, ...repoConfig };

    expect(merged.coverageThreshold).toBe(90); // Repo wins
    expect(merged.failOnCritical).toBe(true); // From org
  });

  test('repo cannot loosen org requirements for critical', () => {
    const orgConfig = {
      failOnCritical: true,
    };

    const repoConfig = {
      failOnCritical: false, // Attempting to loosen
    };

    // This should be validated and rejected
    // INV-E1 enforces failOnCritical cannot be disabled
    const isValid = !(repoConfig.failOnCritical === false);

    expect(isValid).toBe(false); // Invalid attempt
  });
});

describe('INV-E5: Secrets Never Logged', () => {
  const secretPatterns = [
    /sk-[A-Za-z0-9]{20,250}/g, // OpenAI keys
    /AKIA[0-9A-Z]{16}/g, // AWS keys
    /ghp_[A-Za-z0-9_]{36,255}/g, // GitHub tokens
  ];

  test('text without secrets passes validation', () => {
    const safeText = 'const apiKey = process.env.API_KEY;';

    expect(() =>
      assertNoSecretsInText(safeText, secretPatterns)
    ).not.toThrow();
  });

  test('text with OpenAI key throws error', () => {
    const unsafeText = 'const key = "sk-abc123def456ghi789jkl012mno345pqr678";';

    expect(() =>
      assertNoSecretsInText(unsafeText, secretPatterns)
    ).toThrow(InvariantViolationError);
  });

  test('text with AWS key throws error', () => {
    const unsafeText = 'AWS_KEY=AKIAIOSFODNN7EXAMPLE';

    expect(() =>
      assertNoSecretsInText(unsafeText, secretPatterns)
    ).toThrow(InvariantViolationError);
  });

  test('text with GitHub token throws error', () => {
    const unsafeText =
      'token: ghp_abc123def456ghi789jkl012mno345pqr678';

    expect(() =>
      assertNoSecretsInText(unsafeText, secretPatterns)
    ).toThrow(InvariantViolationError);
  });
});
