import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as shadowModePost } from '../../app/api/v1/shadow-mode/route';
import { GET as failureIntelGet, POST as failureIntelPost } from '../../app/api/v1/failure-intelligence/route';
import { GET as privacyGet, POST as privacyPost } from '../../app/api/v1/privacy/route';
import { POST as driftPost } from '../../app/api/v1/drift/route';
import { GET as modelVersioningGet, POST as modelVersioningPost } from '../../app/api/v1/model-versioning/route';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'user_test_123',
    email: 'test@example.com',
    name: 'Test User',
    organizationIds: ['org_test_123'],
  }),
}));

// Mock authz middleware
vi.mock('@/lib/authz', () => ({
  createAuthzMiddleware: () => vi.fn().mockResolvedValue(null),
}));

// Mock prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      create: vi.fn().mockResolvedValue({ id: 'job_test_1' }),
    },
    userConsent: {
      findFirst: vi.fn().mockResolvedValue({ id: 'consent_1', granted: true }),
    },
    aIAnomaly: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'anomaly_1', metadata: { frequency: 1 } }),
    },
    aggregatedInsight: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'insight_1' }),
      update: vi.fn().mockResolvedValue({ id: 'insight_1' }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'insight_1',
          insightType: 'pattern',
          confidence: 0.95,
          dataPoints: 12,
          metadata: { ruleId: 'security.sql-injection', patternType: 'security' },
        },
      ]),
    },
    patternOccurrence: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'occ_1' }),
    },
  },
}));

describe('Advanced Platform Features API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shadow Mode API', () => {
    it('runs shadow mode analysis without blocking', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shadow-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: 'repo-123',
          prNumber: 42,
          files: [
            {
              path: 'src/index.ts',
              content: 'console.log("hello shadow mode");',
            },
          ],
        }),
      });

      const res = await shadowModePost(req);
      const json = await res.json() as { data?: { summary?: { totalIssues: number } }; meta?: { mode: string } };

      expect(res.status).toBe(200);
      expect(json.data?.summary).toBeDefined();
      expect(json.meta?.mode).toBe('shadow');
    });

    it('rejects invalid payload without repositoryId', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shadow-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [] }),
      });

      const res = await shadowModePost(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Failure Intelligence API', () => {
    it('fetches aggregated failure insights for organization', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/failure-intelligence?organizationId=org_test_123');
      const res = await failureIntelGet(req);
      const json = await res.json() as { data?: { totalInsights: number; anonymized: boolean } };

      expect(res.status).toBe(200);
      expect(json.data?.anonymized).toBe(true);
      expect(json.data?.totalInsights).toBeGreaterThanOrEqual(0);
    });

    it('records an anonymized failure pattern', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/failure-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: 'repo-123',
          finding: {
            ruleId: 'security.sql-injection',
            severity: 'critical',
            file: 'src/db.ts',
            line: 12,
            message: 'Potential SQL injection risk',
          },
        }),
      });

      const res = await failureIntelPost(req);
      const json = await res.json() as { data?: { success: boolean } };

      expect(res.status).toBe(200);
      expect(json.data?.success).toBe(true);
    });
  });

  describe('Privacy & GDPR Compliance API', () => {
    it('anonymizes text containing emails and IPs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anonymize',
          data: 'Contact alex@company.com at IP 10.0.0.1 for details',
        }),
      });

      const res = await privacyPost(req);
      const json = await res.json() as { data?: { result: string; anonymized: boolean } };

      expect(res.status).toBe(200);
      expect(json.data?.anonymized).toBe(true);
      expect(json.data?.result).not.toContain('alex@company.com');
    });

    it('detects PII correctly', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect',
          data: 'Reach me at support@readylayer.com',
        }),
      });

      const res = await privacyPost(req);
      const json = await res.json() as { data?: { hasPII: boolean } };

      expect(res.status).toBe(200);
      expect(json.data?.hasPII).toBe(true);
    });

    it('fetches privacy compliance configuration', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/privacy');
      const res = await privacyGet(req);
      const json = await res.json() as { data?: { gdprEnabled: boolean; dataRetentionDays: number } };

      expect(res.status).toBe(200);
      expect(json.data?.gdprEnabled).toBe(true);
      expect(json.data?.dataRetentionDays).toBe(365);
    });
  });

  describe('Statistical Feature Drift API', () => {
    it('evaluates distribution drift with PSI and KS statistics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributions: [
            {
              featureName: 'token_count',
              featureType: 'numerical',
              baseline: { count: 1000, mean: 500, std: 50 },
              current: { count: 200, mean: 510, std: 52 },
            },
          ],
        }),
      });

      const res = await driftPost(req);
      const json = await res.json() as { data?: { results: Array<{ featureName: string; driftDetected: boolean }>; summary: { overallHealth: string } } };

      expect(res.status).toBe(200);
      expect(json.data?.results[0].featureName).toBe('token_count');
      expect(json.data?.summary.overallHealth).toBeDefined();
    });
  });

  describe('Model Versioning & A/B Experimentation API', () => {
    it('registers a model version and retrieves registered versions', async () => {
      const postReq = new NextRequest('http://localhost:3000/api/v1/model-versioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          modelVersion: {
            id: 'v-2-0-0',
            version: '2.0.0',
            modelType: 'review_guard_classifier',
            artifactUrl: 'https://models.readylayer.com/v2.0.0.tar.gz',
            checksum: 'sha256:abc123456',
            metadata: {
              createdAt: new Date(),
              trainingDataHash: 'hash_abc123',
              metrics: { accuracy: 0.96 },
              parameters: { temp: 0 },
              framework: 'transformers',
            },
          },
        }),
      });

      const postRes = await modelVersioningPost(postReq);
      expect(postRes.status).toBe(200);

      const getReq = new NextRequest('http://localhost:3000/api/v1/model-versioning?modelType=review_guard_classifier');
      const getRes = await modelVersioningGet(getReq);
      const getJson = await getRes.json() as { data?: { totalVersions: number } };

      expect(getRes.status).toBe(200);
      expect(getJson.data?.totalVersions).toBeGreaterThanOrEqual(1);
    });
  });
});
