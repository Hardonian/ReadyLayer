import { describe, it, expect } from 'vitest';
import { validateConfigYaml, type ConfigValidationError } from '../../lib/config/yaml-validator';

describe('YAML Config Validator with Line/Col Highlighting', () => {
  it('validates a correct .readylayer.yml configuration', () => {
    const validYaml = `
version: "1"
organizationId: "org-test"
strictness: "strict"
review:
  blockOnCritical: true
  autoComment: true
  requireTests: true
  minimumCoverage: 85
rules:
  "secrets.leak":
    enabled: true
    severity: "critical"
`;

    const res = validateConfigYaml(validYaml);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.config?.strictness).toBe('strict');
  });

  it('detects missing version with line/col and fix suggestion', () => {
    const invalidYaml = `
strictness: "strict"
review:
  blockOnCritical: true
`;

    const res = validateConfigYaml(invalidYaml);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors.some((e: ConfigValidationError) => e.path === 'version')).toBe(true);
  });

  it('detects invalid strictness enum values', () => {
    const invalidYaml = `
version: "1"
strictness: "super-ultra-hard"
`;

    const res = validateConfigYaml(invalidYaml);
    expect(res.valid).toBe(false);
    const strictnessErr = res.errors.find((e: ConfigValidationError) => e.path === 'strictness');
    expect(strictnessErr).toBeDefined();
    expect(strictnessErr?.fixSuggestion).toContain('advisory, balanced, strict, hardened');
  });

  it('catches malformed YAML syntax with line numbers', () => {
    const malformedYaml = `
version: "1"
  strictness: invalid_indentation: [broken
`;

    const res = validateConfigYaml(malformedYaml);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
