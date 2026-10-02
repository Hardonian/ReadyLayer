import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/auth/sso/route';
import { resolveEnterpriseSso } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  resolveEnterpriseSso: vi.fn(),
}));

describe('POST /api/v1/auth/sso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns SSO URL for configured corporate domain', async () => {
    vi.mocked(resolveEnterpriseSso).mockResolvedValue({
      ssoUrl: 'https://idp.acme.com/saml/sso',
      provider: 'saml',
      domain: 'acme.com',
    });

    const req = new NextRequest('http://localhost:3000/api/v1/auth/sso', {
      method: 'POST',
      body: JSON.stringify({ domainOrEmail: 'alice@acme.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.ssoUrl).toBe('https://idp.acme.com/saml/sso');
    expect(body.data.domain).toBe('acme.com');
  });

  it('returns 400 on invalid input', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/sso', {
      method: 'POST',
      body: JSON.stringify({ domainOrEmail: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if domain cannot be resolved', async () => {
    vi.mocked(resolveEnterpriseSso).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/sso', {
      method: 'POST',
      body: JSON.stringify({ domainOrEmail: 'unknown.xyz' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
