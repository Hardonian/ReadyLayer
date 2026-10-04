import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  signWaiver,
  verifyWaiverSignature,
  verifyWaiverToken,
  serializeCanonicalWaiver,
  WaiverPayload,
} from '../../lib/waivers';

describe('Cryptographically Signed Policy Waivers', () => {
  const signingKey = 'test-waiver-signing-key-with-at-least-32-bytes';
  const originalSigningKey = process.env.WAIVER_SIGNING_KEY;

  beforeAll(() => {
    process.env.WAIVER_SIGNING_KEY = signingKey;
  });

  afterAll(() => {
    if (originalSigningKey === undefined) {
      delete process.env.WAIVER_SIGNING_KEY;
    } else {
      process.env.WAIVER_SIGNING_KEY = originalSigningKey;
    }
  });

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

  it('verifies waiver token via POST /api/v1/waivers/verify endpoint', async () => {
    const { POST } = await import('../../app/api/v1/waivers/verify/route');
    const { NextRequest } = await import('next/server');

    const cert = signWaiver(samplePayload);
    const req = new NextRequest('http://localhost:3000/api/v1/waivers/verify', {
      method: 'POST',
      body: JSON.stringify({ token: cert.token, checkDatabase: false }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.isExpired).toBe(false);
    expect(data.payload.ruleId).toBe(samplePayload.ruleId);
  });
});
