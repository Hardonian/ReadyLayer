/**
 * CycloneDX 1.6 AI-BOM (Artificial Intelligence Software Bill of Materials) Generator
 * 
 * Implements the CycloneDX 1.6 specification with support for:
 * - Machine Learning Models (model cards, parameters, considerations)
 * - Data components (datasets, governance, sensitivity)
 * - Cryptographic hashes and provenance tracking
 * - Policy findings mapped to CycloneDX vulnerabilities
 */

import { randomUUID } from 'crypto';
import { sha256OfText } from '../provenance';

export interface ModelCardMetadata {
  modelName: string;
  modelVersion?: string;
  provider?: string;
  task?: string;
  architecture?: string;
  parametersCount?: string;
  inputs?: string[];
  outputs?: string[];
}

export interface DatasetMetadata {
  datasetName: string;
  version?: string;
  classification?: string;
  sensitiveData?: boolean;
}

export interface FindingViolation {
  ruleId: string;
  severity: string;
  message: string;
  file?: string;
  line?: number;
}

export interface CycloneDXAiBomOptions {
  organizationId: string;
  organizationName?: string;
  repositoryName?: string;
  commitSha?: string;
  models?: ModelCardMetadata[];
  datasets?: DatasetMetadata[];
  findings?: FindingViolation[];
  toolVersions?: Record<string, string>;
  timestamp?: string;
}

export interface CycloneDX16AiBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.6';
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: {
      components: Array<{
        type: 'application';
        name: string;
        version: string;
        vendor?: string;
      }>;
    };
    component: {
      type: 'application';
      name: string;
      version: string;
      hashes?: Array<{ alg: string; content: string }>;
    };
    manufacture?: {
      name: string;
      id?: string;
    };
  };
  components: Array<Record<string, unknown>>;
  dependencies: Array<{
    ref: string;
    dependsOn: string[];
  }>;
  vulnerabilities?: Array<Record<string, unknown>>;
}

/**
 * Generate a standard-compliant CycloneDX 1.6 AI-BOM document.
 */
export function generateCycloneDXAiBom(options: CycloneDXAiBomOptions): CycloneDX16AiBom {
  const serialNumber = `urn:uuid:${randomUUID()}`;
  const timestamp = options.timestamp || new Date().toISOString();
  const repoName = options.repositoryName || 'unnamed-project';
  const rootBomRef = `pkg:generic/${repoName}@${options.commitSha || 'latest'}`;

  const components: Array<Record<string, unknown>> = [];
  const dependencies: Array<{ ref: string; dependsOn: string[] }> = [];
  const rootDependsOn: string[] = [];

  // Default models if none provided
  const models = options.models && options.models.length > 0
    ? options.models
    : [
        {
          modelName: 'gpt-4o',
          modelVersion: '2024-11-20',
          provider: 'OpenAI',
          task: 'code-review-and-synthesis',
          architecture: 'transformer-decoder',
        },
      ];

  // 1. Process AI Models
  models.forEach((m, idx) => {
    const bomRef = `pkg:mlmodel/${m.provider || 'unknown'}/${m.modelName}@${m.modelVersion || 'latest'}-${idx}`;
    rootDependsOn.push(bomRef);

    components.push({
      type: 'machine-learning-model',
      'bom-ref': bomRef,
      name: m.modelName,
      version: m.modelVersion || '1.0.0',
      supplier: {
        name: m.provider || 'AI Provider',
      },
      modelCard: {
        modelParameters: {
          task: m.task || 'code-generation',
          architectureFamily: m.architecture || 'transformer',
          parametersCount: m.parametersCount || 'unspecified',
          inputs: (m.inputs || ['source_code_diff', 'prompt']).map((i) => ({ format: i })),
          outputs: (m.outputs || ['suggestions', 'policy_evaluation']).map((o) => ({ format: o })),
        },
        considerations: {
          ethicalConsiderations: 'Evaluated against ReadyLayer deterministic governance policies.',
          users: ['software-engineers', 'platform-reviewers'],
        },
      },
    });
  });

  // 2. Process Datasets
  if (options.datasets && options.datasets.length > 0) {
    options.datasets.forEach((d, idx) => {
      const bomRef = `pkg:data/${d.datasetName}@${d.version || 'v1'}-${idx}`;
      rootDependsOn.push(bomRef);

      components.push({
        type: 'data',
        'bom-ref': bomRef,
        name: d.datasetName,
        version: d.version || '1.0.0',
        data: {
          classification: d.classification || 'public',
          sensitiveData: d.sensitiveData ? ['PII_PHI_EVALUATED'] : [],
        },
      });
    });
  }

  // Set up dependency graph
  dependencies.push({
    ref: rootBomRef,
    dependsOn: rootDependsOn,
  });

  // 3. Process Vulnerabilities / Findings
  const vulnerabilities: Array<Record<string, unknown>> = [];
  if (options.findings && options.findings.length > 0) {
    options.findings.forEach((f, idx) => {
      vulnerabilities.push({
        'bom-ref': `vuln-${f.ruleId}-${idx}`,
        id: f.ruleId,
        source: {
          name: 'ReadyLayer Governance Engine',
          url: 'https://readylayer.com',
        },
        ratings: [
          {
            severity: f.severity.toLowerCase(),
            method: 'other',
          },
        ],
        description: f.message,
        affects: [
          {
            ref: rootBomRef,
            target: f.file ? `${f.file}:${f.line || 1}` : undefined,
          },
        ],
      });
    });
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: {
        components: [
          {
            type: 'application',
            name: 'ReadyLayer',
            version: '1.0.0',
            vendor: 'ReadyLayer',
          },
        ],
      },
      component: {
        type: 'application',
        name: repoName,
        version: options.commitSha ? options.commitSha.slice(0, 7) : '1.0.0',
        hashes: options.commitSha
          ? [{ alg: 'SHA-256', content: sha256OfText(options.commitSha) }]
          : undefined,
      },
      manufacture: {
        name: options.organizationName || options.organizationId,
        id: options.organizationId,
      },
    },
    components,
    dependencies,
    ...(vulnerabilities.length > 0 && { vulnerabilities }),
  };
}

/**
 * Validate that an object adheres to minimum CycloneDX 1.6 AI-BOM requirements.
 */
export function validateCycloneDXAiBom(doc: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['BOM document must be an object'] };
  }

  const bom = doc as Partial<CycloneDX16AiBom>;
  if (bom.bomFormat !== 'CycloneDX') {
    errors.push('bomFormat must be "CycloneDX"');
  }
  if (bom.specVersion !== '1.6') {
    errors.push('specVersion must be "1.6"');
  }
  if (!bom.serialNumber?.startsWith('urn:uuid:')) {
    errors.push('serialNumber must be a valid urn:uuid');
  }
  if (!bom.metadata?.component?.name) {
    errors.push('metadata.component.name is required');
  }
  if (!Array.isArray(bom.components)) {
    errors.push('components array is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
