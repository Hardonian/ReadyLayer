import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as gitHubWebhookPost } from '@/app/api/webhooks/github/route';
import { GET as reposGet } from '@/app/api/v1/repos/route';

describe('Chaos lite failure injection', () => {
  it('returns a stable readiness error when a dependency check fails upstream', async () => {
    vi.resetModules();
    vi.doMock('@/observability/health', () => ({
      healthChecker: {
        checkReady: vi.fn(async () => {
          throw new Error('upstream failure');
        }),
      },
    }));

    const { GET: readinessGet } = await import('@/app/api/ready/route');
    const response = await readinessGet();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('not_ready');

    vi.resetModules();
  });

  it('rejects invalid webhook payloads with a validation error', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': 'sha256=invalid',
        'x-github-event': 'pull_request',
        'x-github-installation-id': '123',
        'content-type': 'application/json',
      },
      body: '{not-json',
    });

    const response = await gitHubWebhookPost(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error?.code).toBe('INVALID_JSON');
  });

  it('rejects unauthorized API access with a consistent error code', async () => {
    const request = new NextRequest('http://localhost/api/v1/repos');
    const response = await reposGet(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });
});
