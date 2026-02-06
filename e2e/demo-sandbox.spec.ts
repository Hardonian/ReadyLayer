import { test, expect } from '@playwright/test';

/**
 * Demo Mode E2E Tests
 *
 * Exercises the deterministic demo pipeline end-to-end via the real
 * Next.js server.  No external secrets, no database, no LLM keys required.
 *
 * Requires the server to start with DEMO_MODE_ENABLED=true.
 */

// ─── Types mirroring lib/demo/pipeline.ts ────────────────────────────────────

interface DemoFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line: number;
  checkId: string;
  checkName: string;
}

interface DemoCheckResult {
  id: string;
  name: string;
  category: 'review-guard' | 'test-engine' | 'doc-sync';
  status: 'success' | 'failure' | 'error';
  duration: number;
  findings?: DemoFinding[];
  metrics?: {
    findingsCount?: number;
    testsGenerated?: number;
    coverageDelta?: number;
    docsUpdated?: number;
  };
  artifacts?: Array<{
    type: 'openapi' | 'readme' | 'changelog' | 'test';
    summary: string;
    content: string;
    diff?: string;
  }>;
}

interface DemoPipelineResult {
  runId: string;
  timestamp: string;
  pr: { number: number; sha: string; title: string };
  checks: DemoCheckResult[];
  decision: { status: 'ready' | 'blocked'; reason?: string };
  artifacts: Array<{ type: string; summary: string; content: string }>;
}

interface DemoAPIResponse {
  success: boolean;
  data: DemoPipelineResult;
  requestId: string;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FROZEN_TIMESTAMP = '2024-01-15T10:30:00.000Z';
const EXPECTED_RUN_ID = 'demo_sandbox_demo_abc123def456';

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Demo mode E2E – full pipeline via API', () => {
  test('GET /api/demo returns a complete, deterministic pipeline result', async ({
    request,
  }) => {
    const res = await request.get('/api/demo');
    expect(res.status()).toBe(200);

    const body = (await res.json()) as DemoAPIResponse;

    // Envelope
    expect(body.success).toBe(true);
    expect(body.requestId).toBe(EXPECTED_RUN_ID);
    expect(body.timestamp).toBe(FROZEN_TIMESTAMP);

    const data = body.data;

    // Run metadata
    expect(data.runId).toBe(EXPECTED_RUN_ID);
    expect(data.timestamp).toBe(FROZEN_TIMESTAMP);
    expect(data.pr.number).toBe(42);
    expect(data.pr.sha).toBe('sandbox_demo_abc123def456');
    expect(data.pr.title).toBe('Sandbox Demo: Add user authentication');

    // Decision: blocked because of critical findings
    expect(data.decision.status).toBe('blocked');
    expect(data.decision.reason).toContain('Critical findings');

    // 8 checks total: 3 review-guard + 2 test-engine + 3 doc-sync
    expect(data.checks).toHaveLength(8);

    // ── Review Guard ───────────────────────────────────────────
    const rgChecks = data.checks.filter(
      (c) => c.category === 'review-guard'
    );
    expect(rgChecks).toHaveLength(3);

    const securityCheck = rgChecks.find((c) => c.id === 'rg-security')!;
    expect(securityCheck.status).toBe('failure');
    expect(securityCheck.findings!.length).toBeGreaterThanOrEqual(2);
    expect(
      securityCheck.findings!.some((f) =>
        f.title.includes('SQL injection')
      )
    ).toBe(true);
    expect(
      securityCheck.findings!.some((f) =>
        f.title.includes('Hardcoded secret')
      )
    ).toBe(true);

    const perfCheck = rgChecks.find((c) => c.id === 'rg-performance')!;
    expect(perfCheck.status).toBe('success');
    expect(perfCheck.metrics!.findingsCount).toBe(0);

    const qualityCheck = rgChecks.find((c) => c.id === 'rg-quality')!;
    expect(qualityCheck.status).toBe('failure');
    expect(
      qualityCheck.findings!.some(
        (f) =>
          f.title.includes('regex') || f.title.includes('ReDoS')
      )
    ).toBe(true);

    // ── Test Engine ────────────────────────────────────────────
    const teChecks = data.checks.filter(
      (c) => c.category === 'test-engine'
    );
    expect(teChecks).toHaveLength(2);

    const unitCheck = teChecks.find((c) => c.id === 'te-unit')!;
    expect(unitCheck.status).toBe('success');
    expect(unitCheck.metrics!.testsGenerated).toBeGreaterThan(0);
    expect(unitCheck.artifacts!.length).toBeGreaterThan(0);
    expect(unitCheck.artifacts![0].content).toContain('describe');

    const covCheck = teChecks.find((c) => c.id === 'te-coverage')!;
    expect(covCheck.status).toBe('success');
    expect(covCheck.metrics!.coverageDelta).toBe(5);

    // ── Doc Sync ───────────────────────────────────────────────
    const dsChecks = data.checks.filter(
      (c) => c.category === 'doc-sync'
    );
    expect(dsChecks).toHaveLength(3);

    const openapiCheck = dsChecks.find((c) => c.id === 'ds-openapi')!;
    expect(openapiCheck.status).toBe('success');
    expect(
      openapiCheck.artifacts!.some((a) =>
        a.content.includes('openapi:')
      )
    ).toBe(true);

    const readmeCheck = dsChecks.find((c) => c.id === 'ds-readme')!;
    expect(readmeCheck.status).toBe('success');

    const changelogCheck = dsChecks.find((c) => c.id === 'ds-changelog')!;
    expect(changelogCheck.status).toBe('success');
    expect(changelogCheck.artifacts![0].content).toContain(
      '## [1.0.0] - 2024-01-15'
    );

    // ── Artifacts ──────────────────────────────────────────────
    expect(data.artifacts.length).toBeGreaterThanOrEqual(4);
    const artifactTypes = data.artifacts.map((a) => a.type);
    expect(artifactTypes).toContain('test');
    expect(artifactTypes).toContain('openapi');
    expect(artifactTypes).toContain('readme');
    expect(artifactTypes).toContain('changelog');
  });

  test('POST /api/demo with checkIds filters the result', async ({
    request,
  }) => {
    const res = await request.post('/api/demo', {
      data: { checkIds: ['rg-security', 'te-unit'] },
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as DemoAPIResponse;
    expect(body.success).toBe(true);

    // Only the two requested checks should be present
    expect(body.data.checks).toHaveLength(2);
    const ids = body.data.checks.map((c) => c.id);
    expect(ids).toContain('rg-security');
    expect(ids).toContain('te-unit');
  });

  test('running the pipeline twice produces identical results', async ({
    request,
  }) => {
    const [res1, res2] = await Promise.all([
      request.get('/api/demo'),
      request.get('/api/demo'),
    ]);
    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);

    const body1 = (await res1.json()) as DemoAPIResponse;
    const body2 = (await res2.json()) as DemoAPIResponse;

    // Identical run IDs and timestamps
    expect(body1.data.runId).toBe(body2.data.runId);
    expect(body1.data.timestamp).toBe(body2.data.timestamp);
    expect(body1.timestamp).toBe(body2.timestamp);

    // Same check count and IDs
    expect(body1.data.checks.length).toBe(body2.data.checks.length);
    expect(body1.data.checks.map((c) => c.id).sort()).toEqual(
      body2.data.checks.map((c) => c.id).sort()
    );

    // Same findings count
    const count = (checks: DemoCheckResult[]) =>
      checks.reduce((n, c) => n + (c.findings?.length ?? 0), 0);
    expect(count(body1.data.checks)).toBe(count(body2.data.checks));

    // Same decision
    expect(body1.data.decision).toEqual(body2.data.decision);
  });
});

test.describe('Demo sandbox UI entry point', () => {
  test('renders the sandbox demo page with start button', async ({
    page,
  }) => {
    await page.goto('/dashboard/runs/sandbox');

    await expect(
      page.getByRole('heading', { name: 'Sandbox Demo' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Start Sandbox Demo/i })
    ).toBeVisible();
  });
});
