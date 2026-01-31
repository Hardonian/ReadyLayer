import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadyLayerClient } from '../client';
import {
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionError,
  PaymentRequiredError,
  RateLimitError,
  ServerError,
  RetryExhaustedError,
  TimeoutError,
  NetworkError,
} from '../errors';

function createMockFetch(responses: Array<{ status: number; body?: unknown; ok?: boolean }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      status: resp.status,
      ok: resp.ok ?? (resp.status >= 200 && resp.status < 300),
      json: async () => resp.body,
      headers: new Headers(),
    } as unknown as Response;
  });
}

describe('ReadyLayerClient', () => {
  describe('constructor', () => {
    it('throws AuthenticationError when no API key is provided', () => {
      expect(() => new ReadyLayerClient()).toThrow(AuthenticationError);
    });

    it('creates client with valid API key', () => {
      const client = new ReadyLayerClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(ReadyLayerClient);
    });
  });

  describe('health endpoints', () => {
    it('getHealth returns health response', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { status: 'healthy', timestamp: '2026-01-30T00:00:00Z' } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getHealth();
      expect(result.status).toBe('healthy');
      // Health endpoints skip auth
      const callArgs = mockFetch.mock.calls[0];
      const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('getReady returns readiness response', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { ready: true, dependencies: { database: true, redis: true } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getReady();
      expect(result.ready).toBe(true);
    });
  });

  describe('repository endpoints', () => {
    let client: ReadyLayerClient;
    let mockFetch: ReturnType<typeof createMockFetch>;

    beforeEach(() => {
      mockFetch = createMockFetch([
        {
          status: 200,
          body: {
            repositories: [{ id: 'repo-1', name: 'test', fullName: 'org/test', provider: 'github', enabled: true, createdAt: '', updatedAt: '' }],
            pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
          },
        },
      ]);
      client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
    });

    it('listRepositories sends correct request', async () => {
      const result = await client.listRepositories({ organizationId: 'org-1', limit: 10 });
      expect(result.repositories).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/repos');
      expect(url).toContain('organizationId=org-1');
      expect(url).toContain('limit=10');
    });

    it('getRepository encodes path parameter', async () => {
      mockFetch = createMockFetch([
        { status: 200, body: { id: 'repo-1', name: 'test' } },
      ]);
      client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getRepository('repo/special');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/repos/repo%2Fspecial');
    });

    it('deleteRepository returns void on 204', async () => {
      mockFetch = createMockFetch([{ status: 204 }]);
      client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteRepository('repo-1');
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws BadRequestError on 400', async () => {
      const mockFetch = createMockFetch([
        { status: 400, ok: false, body: { error: { code: 'BAD_REQUEST', message: 'Invalid input' } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.listRepositories()).rejects.toThrow(BadRequestError);
    });

    it('throws AuthenticationError on 401', async () => {
      const mockFetch = createMockFetch([
        { status: 401, ok: false, body: { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.listRepositories()).rejects.toThrow(AuthenticationError);
    });

    it('throws PaymentRequiredError on 402', async () => {
      const mockFetch = createMockFetch([
        { status: 402, ok: false, body: { error: { code: 'PAYMENT_REQUIRED', message: 'Upgrade required' } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.createRepository({ organizationId: 'o', name: 'n', fullName: 'f', provider: 'github' })).rejects.toThrow(PaymentRequiredError);
    });

    it('throws PermissionError on 403', async () => {
      const mockFetch = createMockFetch([
        { status: 403, ok: false, body: { error: { code: 'FORBIDDEN', message: 'No access' } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.listRepositories()).rejects.toThrow(PermissionError);
    });

    it('throws NotFoundError on 404', async () => {
      const mockFetch = createMockFetch([
        { status: 404, ok: false, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.getRepository('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('retry logic', () => {
    it('retries on 500 errors', async () => {
      const mockFetch = createMockFetch([
        { status: 500, ok: false, body: { error: { code: 'SERVER_ERROR', message: 'Fail' } } },
        { status: 500, ok: false, body: { error: { code: 'SERVER_ERROR', message: 'Fail' } } },
        { status: 200, body: { status: 'healthy', timestamp: '' } },
      ]);
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        maxRetries: 3,
        retryDelayMs: 1,
        maxRetryDelayMs: 5,
      });
      const result = await client.getHealth();
      expect(result.status).toBe('healthy');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('throws RetryExhaustedError after max retries', async () => {
      const mockFetch = createMockFetch([
        { status: 500, ok: false, body: { error: { code: 'SERVER_ERROR', message: 'Fail' } } },
      ]);
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        maxRetries: 2,
        retryDelayMs: 1,
        maxRetryDelayMs: 5,
      });
      await expect(client.getHealth()).rejects.toThrow(RetryExhaustedError);
      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry 4xx errors (except 408/429)', async () => {
      const mockFetch = createMockFetch([
        { status: 400, ok: false, body: { error: { code: 'BAD_REQUEST', message: 'Bad' } } },
      ]);
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        maxRetries: 3,
        retryDelayMs: 1,
      });
      await expect(client.listRepositories()).rejects.toThrow(BadRequestError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 rate limit', async () => {
      const mockFetch = createMockFetch([
        { status: 429, ok: false, body: { error: { code: 'RATE_LIMITED', message: 'Too many' } } },
        { status: 200, body: { status: 'healthy', timestamp: '' } },
      ]);
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        maxRetries: 2,
        retryDelayMs: 1,
        maxRetryDelayMs: 5,
      });
      const result = await client.getHealth();
      expect(result.status).toBe('healthy');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout', () => {
    it('throws TimeoutError when request exceeds timeout', async () => {
      const slowFetch = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { status: 200, ok: true, json: async () => ({}) } as unknown as Response;
      });
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: slowFetch,
        timeoutMs: 50,
        maxRetries: 0,
      });
      await expect(client.getHealth()).rejects.toThrow(RetryExhaustedError);
    });
  });

  describe('authentication', () => {
    it('sends Bearer token in Authorization header', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { repositories: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } } },
      ]);
      const client = new ReadyLayerClient({ apiKey: 'my-secret-key', fetch: mockFetch });
      await client.listRepositories();
      const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-secret-key');
    });

    it('includes custom headers', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { status: 'healthy', timestamp: '' } },
      ]);
      const client = new ReadyLayerClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        headers: { 'X-Custom': 'value' },
      });
      await client.getHealth();
      const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
      expect(headers['X-Custom']).toBe('value');
    });
  });

  describe('all endpoints coverage', () => {
    let client: ReadyLayerClient;
    let mockFetch: ReturnType<typeof createMockFetch>;

    beforeEach(() => {
      mockFetch = createMockFetch([{ status: 200, body: {} }]);
      client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
    });

    it('policy endpoints call correct paths', async () => {
      await client.listPolicyPacks();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/policies');

      mockFetch.mockClear();
      mockFetch = createMockFetch([{ status: 200, body: {} }]);
      client = new ReadyLayerClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getPolicyPack('p1');
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/policies/p1');
    });

    it('review endpoints call correct paths', async () => {
      await client.listReviews();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/reviews');
    });

    it('waiver endpoints call correct paths', async () => {
      await client.listWaivers();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/waivers');
    });

    it('evidence endpoints call correct paths', async () => {
      await client.listEvidence();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/evidence');
    });

    it('run endpoints call correct paths', async () => {
      await client.listRuns();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/runs');
    });

    it('billing endpoints call correct paths', async () => {
      await client.getBillingTier();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/billing/tier');
    });

    it('metrics endpoint calls correct path', async () => {
      await client.getMetrics();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/metrics');
    });

    it('api key endpoints call correct paths', async () => {
      await client.listApiKeys();
      expect((mockFetch.mock.calls[0][0] as string)).toContain('/api-keys');
    });
  });
});

describe('Error classes', () => {
  it('ReadyLayerError serializes to JSON', () => {
    const err = new BadRequestError('test error', {
      validationErrors: [{ path: ['field'], message: 'required' }],
    });
    const json = err.toJSON();
    expect(json.name).toBe('BadRequestError');
    expect(json.code).toBe('BAD_REQUEST');
    expect(json.statusCode).toBe(400);
    expect(json.validationErrors).toHaveLength(1);
  });

  it('RetryExhaustedError includes attempts', () => {
    const cause = new Error('network fail');
    const err = new RetryExhaustedError(3, cause);
    expect(err.attempts).toBe(3);
    expect(err.lastError).toBe(cause);
    const json = err.toJSON();
    expect(json.attempts).toBe(3);
  });

  it('TimeoutError includes timeout value', () => {
    const err = new TimeoutError(5000);
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toContain('5000ms');
  });

  it('NetworkError sets correct code', () => {
    const err = new NetworkError('Connection refused');
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
