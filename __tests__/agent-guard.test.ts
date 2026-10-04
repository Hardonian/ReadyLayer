import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  inspectPackage,
  scanDiffForSlopsquatting,
  classifyFileRisk,
  evaluateAgentBlastRadius,
  generateInTotoAttestation,
  generateCycloneDxAiBom,
  verifyInTotoAttestation,
} from '../lib/agent-guard';

const ATTESTATION_SECRET = 'test-attestation-secret-with-at-least-32-bytes';

describe('AI Package Slopsquatting & Hallucination Detector', () => {
  it('identifies verified high-reputation packages as SAFE', () => {
    const result = inspectPackage('react', 'npm');
    expect(result.riskLevel).toBe('SAFE');
    expect(result.isKnownPopular).toBe(true);
    expect(result.score).toBe(0);
  });

  it('flags suspicious synthetic stems common in AI hallucinations', () => {
    const result = inspectPackage('fast-auth-vault-client', 'npm');
    expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.reasons.some((r) => r.includes('synthetic token signature'))).toBe(true);
  });

  it('detects 1-character typosquatting on popular packages', () => {
    // 'reakt' instead of 'react'
    const result = inspectPackage('reakt', 'npm');
    expect(result.riskLevel).toBe('HIGH');
    expect(result.reasons.some((r) => r.includes('typo-distance'))).toBe(true);
  });

  it('scans a git diff containing a hallucinated dependency addition', () => {
    const mockDiff = `
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,2 +10,3 @@
     "react": "^19.0.0",
+    "super-logger-fast-auth": "^1.0.0",
     "zod": "^3.0.0"
`;
    const scan = scanDiffForSlopsquatting(mockDiff);
    expect(scan.passed).toBe(false);
    expect(scan.criticalCount + scan.highCount).toBeGreaterThan(0);
  });
});

describe('Agent Blast Radius & Containment Engine', () => {
  it('classifies CI workflows as Tier 0 Critical Perimeter', () => {
    const file = classifyFileRisk('.github/workflows/deploy.yml');
    expect(file.tier).toBe('TIER_0_CRITICAL');
    expect(file.requiresDualCustody).toBe(true);
  });

  it('classifies database migrations as Tier 1 Persistence', () => {
    const file = classifyFileRisk('prisma/migrations/20260201000000_init/migration.sql');
    expect(file.tier).toBe('TIER_1_PERSISTENCE');
    expect(file.requiresDualCustody).toBe(true);
  });

  it('classifies documentation and tests as Tier 3 Safe', () => {
    const docFile = classifyFileRisk('docs/ARCHITECTURE.md');
    expect(docFile.tier).toBe('TIER_3_SAFE');
    expect(docFile.requiresDualCustody).toBe(false);

    const testFile = classifyFileRisk('__tests__/unit.test.ts');
    expect(testFile.tier).toBe('TIER_3_SAFE');
    expect(testFile.requiresDualCustody).toBe(false);
  });

  it('blocks autonomous merge when agent modifies Tier 0 files', () => {
    const evaluation = evaluateAgentBlastRadius([
      'app/page.tsx',
      '.github/workflows/ci.yml',
    ]);
    expect(evaluation.highestTier).toBe('TIER_0_CRITICAL');
    expect(evaluation.blockedAutonomousMerge).toBe(true);
    expect(evaluation.requiresDualCustody).toBe(true);
    expect(evaluation.criticalFileCount).toBe(1);
  });
});

describe('Cryptographic in-toto Attestation & CycloneDX AIBOM', () => {
  it('generates a valid in-toto v1.0 Statement with HMAC signature', () => {
    const blastRadius = evaluateAgentBlastRadius(['components/Button.tsx']);
    const attestation = generateInTotoAttestation({
      commitSha: 'a1b2c3d4e5f6',
      diffContent: '+ const Button = () => <button>Click</button>;',
      agent: {
        id: 'claude-code',
        model: 'claude-3-7-sonnet',
        prompts: ['create a button component'],
      },
      blastRadius,
      policyChecksum: 'policy-sha256-test',
      signing: {
        algorithm: 'hmac-sha256',
        secret: ATTESTATION_SECRET,
        keyId: 'test-key-v1',
      },
    });

    expect(attestation._type).toBe('https://in-toto.io/Statement/v1');
    expect(attestation.predicateType).toBe('https://readylayer.dev/attestation/agent-governance/v1');
    expect(attestation.subject.length).toBeGreaterThan(0);
    expect(attestation.predicate.invocation.agent.id).toBe('claude-code');
    expect(attestation.predicate.invocation.agent.promptHashes.length).toBe(1);
    expect(attestation.signature.algorithm).toBe('hmac-sha256');
    expect(attestation.signature.sig.length).toBe(64);
    expect(
      verifyInTotoAttestation(attestation, {
        algorithm: 'hmac-sha256',
        secret: ATTESTATION_SECRET,
      })
    ).toBe(true);
  });

  it('rejects a tampered attestation', () => {
    const attestation = generateInTotoAttestation({
      commitSha: 'a1b2c3d4e5f6',
      diffContent: '+ secure change',
      agent: { id: 'test-agent' },
      blastRadius: evaluateAgentBlastRadius(['components/Button.tsx']),
      signing: { algorithm: 'hmac-sha256', secret: ATTESTATION_SECRET },
    });
    const tampered = {
      ...attestation,
      predicate: {
        ...attestation.predicate,
        governanceVerdict: {
          ...attestation.predicate.governanceVerdict,
          decision: 'PASSED' as const,
          deterministicScore: 0,
        },
      },
    };

    expect(
      verifyInTotoAttestation(tampered, {
        algorithm: 'hmac-sha256',
        secret: ATTESTATION_SECRET,
      })
    ).toBe(false);
  });

  it('signs and verifies attestations with Ed25519 key material', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const attestation = generateInTotoAttestation({
      commitSha: 'a1b2c3d4e5f6',
      diffContent: '+ cryptographically verified change',
      agent: { id: 'test-agent' },
      blastRadius: evaluateAgentBlastRadius(['components/Button.tsx']),
      signing: {
        algorithm: 'ed25519',
        privateKey: privatePem,
        keyId: 'test-ed25519-v1',
      },
    });

    expect(attestation.signature.algorithm).toBe('ed25519');
    expect(
      verifyInTotoAttestation(attestation, {
        algorithm: 'ed25519',
        publicKey: publicPem,
      })
    ).toBe(true);
  });

  it('generates a compliant CycloneDX 1.6 AIBOM', () => {
    const aibom = generateCycloneDxAiBom({
      repoName: 'ReadyLayer',
      agent: {
        id: 'cursor-agent',
        model: 'claude-3-7-sonnet',
        prompts: ['add feature flag'],
      },
    });

    expect(aibom.bomFormat).toBe('CycloneDX');
    expect(aibom.specVersion).toBe('1.6');
    expect(aibom.components.some((c) => c.type === 'machine-learning-model')).toBe(true);
    expect(aibom.declarations?.compliance.frameworks).toContain('NIST AI RMF 1.0 (SP 1270)');
    expect(aibom.declarations?.compliance.humanInTheLoopVerified).toBe(false);
    expect(aibom.declarations?.compliance.slopsquattingAudited).toBe(false);
  });
});
