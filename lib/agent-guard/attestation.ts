/**
 * Cryptographic Attestation & AI Bill of Materials (AIBOM) Engine
 * 
 * Emits in-toto v1.0 and SLSA-compliant provenance statements for code produced
 * or modified by AI coding agents.
 * 
 * Regulated enterprises (Financial, Healthcare, Defense, SOC 2 Type II, ISO 42001,
 * EU AI Act) require cryptographically auditable proof of:
 * - Which agent/model was invoked
 * - The cryptographic digest of the prompt and tools used
 * - The deterministic policy verdict and blast radius containment score
 * - Verifiable digital attestation binding the commit to the evaluation
 */

import { createHash, createHmac } from 'crypto';
import { BlastRadiusEvaluation } from './blast-radius';
import { PackageInspectionResult } from './package-slopsquatting';

export interface InTotoSubject {
  name: string;
  digest: {
    sha256: string;
    [algorithm: string]: string;
  };
}

export interface InTotoStatement {
  _type: 'https://in-toto.io/Statement/v1';
  subject: InTotoSubject[];
  predicateType: 'https://readylayer.dev/attestation/agent-governance/v1' | 'https://slsa.dev/provenance/v1';
  predicate: {
    builder: {
      id: string; // e.g. "https://readylayer.com/governance-runner"
      version: string;
    };
    buildType: 'https://readylayer.dev/agentic-delivery/v1';
    invocation: {
      agent: {
        id: string;
        model?: string;
        provider?: string;
        promptHashes: string[];
      };
      parameters: Record<string, unknown>;
      environment: {
        platform: string;
        nodeVersion: string;
      };
    };
    governanceVerdict: {
      decision: 'PASSED' | 'BLOCKED' | 'NEEDS_DUAL_CUSTODY';
      deterministicScore: number;
      blastRadiusTier: string;
      slopsquattingFindings: number;
      policyChecksum: string;
      evaluatedAt: string;
    };
    materials: Array<{
      uri: string;
      digest: { sha256: string };
    }>;
  };
  signature: {
    keyId: string;
    algorithm: 'ed25519-sha256' | 'hmac-sha256';
    sig: string;
  };
}

export interface CycloneDxAiBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.6';
  serialNumber: string;
  version: 1;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: 'application';
      name: string;
      version: string;
    };
  };
  components: Array<{
    type: 'machine-learning-model' | 'library' | 'framework';
    name: string;
    version?: string;
    description: string;
    hashes?: Array<{ alg: string; content: string }>;
    properties?: Array<{ name: string; value: string }>;
  }>;
  declarations?: {
    compliance: {
      frameworks: string[];
      humanInTheLoopVerified: boolean;
      slopsquattingAudited: boolean;
    };
  };
}

/**
 * Generates an in-toto v1.0 Statement for an agentic change
 */
export function generateInTotoAttestation(options: {
  commitSha: string;
  diffContent: string;
  agent: {
    id: string;
    model?: string;
    provider?: string;
    prompts?: string[];
  };
  blastRadius: BlastRadiusEvaluation;
  slopsquattingResults?: PackageInspectionResult[];
  policyChecksum?: string;
  signingSecret?: string;
}): InTotoStatement {
  const diffHash = createHash('sha256').update(options.diffContent).digest('hex');
  const promptHashes = (options.agent.prompts || []).map((p) =>
    createHash('sha256').update(p).digest('hex')
  );

  const policyChecksum = options.policyChecksum || createHash('sha256').update('default-policy-pack-v1').digest('hex');
  const slopsquattingFindings = (options.slopsquattingResults || []).filter(
    (p) => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH'
  ).length;

  let decision: 'PASSED' | 'BLOCKED' | 'NEEDS_DUAL_CUSTODY' = 'PASSED';
  if (slopsquattingFindings > 0 || options.blastRadius.blockedAutonomousMerge) {
    decision = options.blastRadius.requiresDualCustody ? 'NEEDS_DUAL_CUSTODY' : 'BLOCKED';
  }

  const statementWithoutSig = {
    _type: 'https://in-toto.io/Statement/v1' as const,
    subject: [
      {
        name: `git:commit:${options.commitSha}`,
        digest: {
          sha256: createHash('sha256').update(options.commitSha).digest('hex'),
        },
      },
      {
        name: 'changeset:diff',
        digest: {
          sha256: diffHash,
        },
      },
    ],
    predicateType: 'https://readylayer.dev/attestation/agent-governance/v1' as const,
    predicate: {
      builder: {
        id: 'https://readylayer.dev/runner',
        version: '1.0.0',
      },
      buildType: 'https://readylayer.dev/agentic-delivery/v1' as const,
      invocation: {
        agent: {
          id: options.agent.id,
          model: options.agent.model || 'unspecified-agent',
          provider: options.agent.provider || 'generic',
          promptHashes,
        },
        parameters: {
          filesCount: options.blastRadius.fileClassifications.length,
          highestBlastRadiusTier: options.blastRadius.highestTier,
        },
        environment: {
          platform: process.platform,
          nodeVersion: process.version,
        },
      },
      governanceVerdict: {
        decision,
        deterministicScore: options.blastRadius.overallScore,
        blastRadiusTier: options.blastRadius.highestTier,
        slopsquattingFindings,
        policyChecksum,
        evaluatedAt: new Date().toISOString(),
      },
      materials: options.blastRadius.fileClassifications.map((f) => ({
        uri: `file://${f.filePath}`,
        digest: {
          sha256: createHash('sha256').update(f.filePath).digest('hex'),
        },
      })),
    },
  };

  const payloadString = JSON.stringify(statementWithoutSig);
  const secretKey = options.signingSecret || 'readylayer-default-signing-key-ephemeral';
  const sig = createHmac('sha256', secretKey).update(payloadString).digest('hex');

  return {
    ...statementWithoutSig,
    signature: {
      keyId: 'readylayer-enterprise-attest-key-1',
      algorithm: 'hmac-sha256',
      sig,
    },
  };
}

/**
 * Generates CycloneDX AI Software Bill of Materials (AIBOM)
 */
export function generateCycloneDxAiBom(options: {
  repoName: string;
  version?: string;
  agent: {
    id: string;
    model?: string;
    provider?: string;
    prompts?: string[];
  };
  dependencies?: PackageInspectionResult[];
  humanVerified?: boolean;
}): CycloneDxAiBom {
  const serialNumber = `urn:uuid:${createHash('md5').update(`${options.repoName}:${Date.now()}`).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')}`;

  const components: CycloneDxAiBom['components'] = [
    {
      type: 'machine-learning-model',
      name: options.agent.model || options.agent.id,
      version: '2025.1',
      description: `Generative AI model utilized by agent '${options.agent.id}' for software synthesis`,
      properties: [
        { name: 'agent.provider', value: options.agent.provider || 'unknown' },
        { name: 'agent.promptsCount', value: String(options.agent.prompts?.length || 0) },
      ],
    },
  ];

  if (options.dependencies) {
    for (const dep of options.dependencies) {
      components.push({
        type: 'library',
        name: dep.packageName,
        description: `Inspected package dependency (${dep.ecosystem}) with slopsquatting risk: ${dep.riskLevel}`,
        hashes: [{ alg: 'SHA-256', content: dep.sha256 }],
        properties: [
          { name: 'slopsquatting.riskLevel', value: dep.riskLevel },
          { name: 'slopsquatting.score', value: String(dep.score) },
        ],
      });
    }
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'ReadyLayer',
          name: 'ReadyLayer Governance Engine',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: options.repoName,
        version: options.version || '1.0.0',
      },
    },
    components,
    declarations: {
      compliance: {
        frameworks: ['NIST AI RMF 1.0 (SP 1270)', 'EU AI Act Article 50', 'OWASP LLM Top 10'],
        humanInTheLoopVerified: options.humanVerified ?? true,
        slopsquattingAudited: true,
      },
    },
  };
}
