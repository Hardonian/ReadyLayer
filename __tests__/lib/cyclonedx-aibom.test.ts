import { describe, it, expect } from 'vitest';
import { generateCycloneDXAiBom, validateCycloneDXAiBom } from '../../lib/provenance/cyclonedx';

describe('CycloneDX 1.6 AI-BOM Generator', () => {
  it('generates a valid CycloneDX 1.6 document with ML models and components', () => {
    const aibom = generateCycloneDXAiBom({
      organizationId: 'org_acme_corp',
      organizationName: 'Acme AI Security Corp',
      repositoryName: 'acme/payment-agent',
      commitSha: 'a1b2c3d4e5f6',
      models: [
        {
          modelName: 'claude-3-5-sonnet',
          modelVersion: '20241022',
          provider: 'Anthropic',
          task: 'agentic-reasoning',
          architecture: 'transformer-hybrid',
        },
      ],
      findings: [
        {
          ruleId: 'security.secret-leak',
          severity: 'CRITICAL',
          message: 'Potential secret key exposure detected in environment block',
          file: 'src/config.ts',
          line: 42,
        },
      ],
    });

    expect(aibom.bomFormat).toBe('CycloneDX');
    expect(aibom.specVersion).toBe('1.6');
    expect(aibom.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]+$/);
    expect(aibom.metadata.component.name).toBe('acme/payment-agent');

    // Check ML Model Component
    const mlModel = aibom.components.find((c) => c.type === 'machine-learning-model');
    expect(mlModel).toBeDefined();
    expect(mlModel?.name).toBe('claude-3-5-sonnet');
    expect((mlModel as any)?.modelCard?.modelParameters?.architectureFamily).toBe('transformer-hybrid');

    // Check Vulnerability mapping
    expect(aibom.vulnerabilities).toBeDefined();
    expect(aibom.vulnerabilities?.length).toBe(1);
    expect(aibom.vulnerabilities?.[0].id).toBe('security.secret-leak');

    // Validation
    const validation = validateCycloneDXAiBom(aibom);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
