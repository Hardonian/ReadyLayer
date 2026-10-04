/**
 * Cryptographic Attestation & AI Bill of Materials (AIBOM) Engine
 * 
 * Emits signed in-toto v1.0 governance statements and CycloneDX 1.6 AI-BOMs
 * for code produced or modified by AI coding agents. The statement carries
 * SLSA-aligned evidence, but does not claim a SLSA build level by itself.
 * 
 * Regulated enterprises (Financial, Healthcare, Defense, SOC 2 Type II, ISO 42001,
 * EU AI Act) require cryptographically auditable proof of:
 * - Which agent/model was invoked
 * - The cryptographic digest of the prompt and tools used
 * - The deterministic policy verdict and blast radius containment score
 * - Verifiable digital attestation binding the commit to the evaluation
 */

import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign as signPayload,
  timingSafeEqual,
  verify as verifyPayload,
} from 'crypto';
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
      policyChecksum: string | null;
      evaluatedAt: string;
    };
    materials: Array<{
      uri: string;
      digest: Record<string, string>;
    }>;
  };
  signature: {
    keyId: string;
    algorithm: 'ed25519' | 'hmac-sha256';
    sig: string;
  };
}

export type AttestationSigningOptions =
  | {
      algorithm: 'hmac-sha256';
      secret: string;
      keyId?: string;
    }
  | {
      algorithm: 'ed25519';
      privateKey: string;
      keyId?: string;
    };

export type AttestationVerificationOptions =
  | {
      algorithm: 'hmac-sha256';
      secret: string;
    }
  | {
      algorithm: 'ed25519';
      publicKey: string;
    };

type ResolvedAttestationSigningOptions =
  | {
      algorithm: 'hmac-sha256';
      secret: string;
      keyId: string;
    }
  | {
      algorithm: 'ed25519';
      privateKey: string;
      keyId: string;
    };

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

const MINIMUM_HMAC_SECRET_BYTES = 32;

function assertHmacSecret(secret: string): void {
  if (Buffer.byteLength(secret, 'utf8') < MINIMUM_HMAC_SECRET_BYTES) {
    throw new Error(
      `Attestation HMAC key must contain at least ${MINIMUM_HMAC_SECRET_BYTES} bytes`
    );
  }
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n');
}

function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function resolveSigningOptions(
  configured?: AttestationSigningOptions
): ResolvedAttestationSigningOptions {
  if (configured?.algorithm === 'ed25519') {
    return {
      ...configured,
      privateKey: normalizePem(configured.privateKey),
      keyId: configured.keyId || 'readylayer-ed25519-v1',
    };
  }

  if (configured?.algorithm === 'hmac-sha256') {
    assertHmacSecret(configured.secret);
    return {
      ...configured,
      keyId: configured.keyId || 'readylayer-hmac-v1',
    };
  }

  const ed25519PrivateKey = process.env.READYLAYER_ATTESTATION_ED25519_PRIVATE_KEY;
  if (ed25519PrivateKey) {
    return {
      algorithm: 'ed25519',
      privateKey: normalizePem(ed25519PrivateKey),
      keyId: process.env.READYLAYER_ATTESTATION_KEY_ID || 'readylayer-ed25519-v1',
    };
  }

  const hmacSecret =
    process.env.READYLAYER_ATTESTATION_SIGNING_KEY ||
    process.env.READY_LAYER_MASTER_KEY ||
    process.env.READY_LAYER_KMS_KEY;
  if (!hmacSecret) {
    throw new Error(
      'Attestation signing is not configured. Set READYLAYER_ATTESTATION_SIGNING_KEY or READYLAYER_ATTESTATION_ED25519_PRIVATE_KEY.'
    );
  }

  assertHmacSecret(hmacSecret);
  return {
    algorithm: 'hmac-sha256',
    secret: hmacSecret,
    keyId: process.env.READYLAYER_ATTESTATION_KEY_ID || 'readylayer-hmac-v1',
  };
}

export function isAttestationSigningConfigured(): boolean {
  return Boolean(
    process.env.READYLAYER_ATTESTATION_ED25519_PRIVATE_KEY ||
      process.env.READYLAYER_ATTESTATION_SIGNING_KEY ||
      process.env.READY_LAYER_MASTER_KEY ||
      process.env.READY_LAYER_KMS_KEY
  );
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
  materials?: Array<{ uri: string; digest: Record<string, string> }>;
  signing?: AttestationSigningOptions;
}): InTotoStatement {
  const diffHash = createHash('sha256').update(options.diffContent).digest('hex');
  const promptHashes = (options.agent.prompts || []).map((p) =>
    createHash('sha256').update(p).digest('hex')
  );

  const policyChecksum = options.policyChecksum || null;
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
      materials: options.materials || [
        {
          uri: `git:commit:${options.commitSha}`,
          digest: /^[0-9a-f]{64}$/i.test(options.commitSha)
            ? { sha256: options.commitSha.toLowerCase() }
            : /^[0-9a-f]{40}$/i.test(options.commitSha)
              ? { sha1: options.commitSha.toLowerCase() }
              : { ref: options.commitSha },
        },
      ],
    },
  };

  const signing = resolveSigningOptions(options.signing);
  const payloadString = canonicalJson(statementWithoutSig);
  const sig = signing.algorithm === 'ed25519'
    ? signPayload(
        null,
        Buffer.from(payloadString, 'utf8'),
        createPrivateKey(signing.privateKey)
      ).toString('base64')
    : createHmac('sha256', signing.secret).update(payloadString).digest('hex');

  return {
    ...statementWithoutSig,
    signature: {
      keyId: signing.keyId,
      algorithm: signing.algorithm,
      sig,
    },
  };
}

/**
 * Verifies the detached signature on a ReadyLayer in-toto statement.
 */
export function verifyInTotoAttestation(
  statement: InTotoStatement,
  verification: AttestationVerificationOptions
): boolean {
  if (statement.signature.algorithm !== verification.algorithm) return false;

  const { signature, ...unsignedStatement } = statement;
  const payload = Buffer.from(canonicalJson(unsignedStatement), 'utf8');

  try {
    if (verification.algorithm === 'ed25519') {
      return verifyPayload(
        null,
        payload,
        createPublicKey(normalizePem(verification.publicKey)),
        Buffer.from(signature.sig, 'base64')
      );
    }

    assertHmacSecret(verification.secret);
    const expected = createHmac('sha256', verification.secret).update(payload).digest();
    const provided = Buffer.from(signature.sig, 'hex');
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
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
    modelVersion?: string;
    provider?: string;
    prompts?: string[];
  };
  dependencies?: PackageInspectionResult[];
  humanVerified?: boolean;
}): CycloneDxAiBom {
  const serialNumber = `urn:uuid:${randomUUID()}`;

  const components: CycloneDxAiBom['components'] = [
    {
      type: 'machine-learning-model',
      name: options.agent.model || options.agent.id,
      ...(options.agent.modelVersion ? { version: options.agent.modelVersion } : {}),
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
        humanInTheLoopVerified: options.humanVerified ?? false,
        slopsquattingAudited: options.dependencies !== undefined,
      },
    },
  };
}
