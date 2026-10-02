import { describe, it, expect } from 'vitest';
import {
  signWaiver,
  verifyWaiverSignature,
  verifyWaiverToken,
  serializeCanonicalWaiver,
  WaiverPayload,
} from '../../lib/waivers';

describe('Cryptographically Signed Policy Waivers', () => {
  const samplePayload: WaiverPayload = {
    waiverId: 'waiver_test_123',
    organizationId: 'org_enterprise_456',
    repositoryId: 'repo_backend_789',
    ruleId: 'security.sql-injection',
    scope: 'path',
    scopeValue: 'src/legacy/**',
    reason: 'Legacy database query pending ORM refactor in sprint 44',
    createdBy: 'usr_sec_lead',
    createdAt: '2026-10-01T12:00:00.000Z',
    expiresAt: '2026-12-31T23:59:59.000Z',
  };

  it('deterministically serializes waiver payload into canonical format', () => {
    const canonical = serializeCanonicalWaiver(samplePayload);
    expect(canonical).toContain('id:waiver_test_123');
    expect(canonical).toContain('org:org_enterprise_456');
    expect(canonical).toContain('rule:security.sql-injection');
    expect(canonical).toContain('reason:Legacy database query pending ORM refactor in sprint 44');
  });

  it('signs waiver payload and returns HMAC signature and token', () => {
    const cert = signWaiver(samplePayload);

    expect(cert.algorithm).toBe('HMAC-SHA256');
    expect(cert.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.token).toMatch(/^rlw_v1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(cert.payload.waiverId).toBe(samplePayload.waiverId);
  });

  it('verifies valid waiver signature', () => {
    const cert = signWaiver(samplePayload);
    const result = verifyWaiverSignature(samplePayload, cert.signature, { issuedAt: cert.issuedAt });

    expect(result.valid).toBe(true);
    expect(result.isExpired).toBe(false);
  });

  it('verifies standalone signed waiver token', () => {
    const cert = signWaiver(samplePayload);
    const result = verifyWaiverToken(cert.token);

    expect(result.valid).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.payload?.ruleId).toBe('security.sql-injection');
  });

  it('detects tampering when payload fields are modified', () => {
    const cert = signWaiver(samplePayload);

    // Attacker tampers with the ruleId or scope to bypass different policies
    const tamperedPayload: WaiverPayload = {
      ...samplePayload,
      ruleId: 'security.rce-execution',
    };

    const result = verifyWaiverSignature(tamperedPayload, cert.signature, { issuedAt: cert.issuedAt });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('mismatch');
  });

  it('flags expired waivers as expired and invalid', () => {
    const expiredPayload: WaiverPayload = {
      ...samplePayload,
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    const cert = signWaiver(expiredPayload);
    const result = verifyWaiverSignature(expiredPayload, cert.signature, { issuedAt: cert.issuedAt });

    expect(result.valid).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.reason).toContain('expired');
  });
});
