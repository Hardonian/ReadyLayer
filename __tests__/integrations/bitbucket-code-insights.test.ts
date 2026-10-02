import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BitbucketCodeInsights } from '../../integrations/bitbucket/code-insights';

describe('BitbucketCodeInsights', () => {
  let insights: BitbucketCodeInsights;
  const originalFetch = global.fetch;

  beforeEach(() => {
    insights = new BitbucketCodeInsights();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('creates or updates a report successfully', async () => {
    const mockReportResponse = {
      uuid: 'rep-123',
      key: 'readylayer-governance',
      title: 'ReadyLayer Policy Verification',
      result: 'PASSED' as const,
      report_type: 'SECURITY' as const,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportResponse,
    });

    const res = await insights.createOrUpdateReport(
      'workspace-test',
      'repo-test',
      'abc1234',
      'readylayer-governance',
      {
        title: 'ReadyLayer Policy Verification',
        result: 'PASSED',
        report_type: 'SECURITY',
      },
      'bb-token-123'
    );

    expect(res).toEqual(mockReportResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.bitbucket.org/2.0/repositories/workspace-test/repo-test/commit/abc1234/reports/readylayer-governance',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer bb-token-123',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('creates annotations in batches', async () => {
    const mockAnnotationsResponse = [
      {
        uuid: 'anno-1',
        external_id: 'rl-rule-1-0',
        title: 'No Hardcoded Secrets',
        annotation_type: 'VULNERABILITY' as const,
        severity: 'CRITICAL' as const,
        summary: 'Secret detected',
        path: 'src/secret.ts',
        line: 10,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnnotationsResponse,
    });

    const res = await insights.createAnnotations(
      'workspace-test',
      'repo-test',
      'abc1234',
      'readylayer-governance',
      [
        {
          external_id: 'rl-rule-1-0',
          title: 'No Hardcoded Secrets',
          annotation_type: 'VULNERABILITY',
          severity: 'CRITICAL',
          summary: 'Secret detected',
          path: 'src/secret.ts',
          line: 10,
        },
      ],
      'bb-token-123'
    );

    expect(res).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.bitbucket.org/2.0/repositories/workspace-test/repo-test/commit/abc1234/reports/readylayer-governance/annotations',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('orchestrates report and annotations via postPolicyEvaluationInsights', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('/annotations')) {
        return {
          ok: true,
          json: async () => [{ uuid: 'anno-violation-1' }],
        };
      }
      return {
        ok: true,
        json: async () => ({
          uuid: 'report-uuid',
          key: 'readylayer-governance',
          title: 'ReadyLayer Policy Verification',
          result: 'FAILED',
          report_type: 'SECURITY',
        }),
      };
    });

    const result = await insights.postPolicyEvaluationInsights({
      workspace: 'ws',
      repoSlug: 'repo',
      commitSha: 'commit-999',
      token: 'tok-xyz',
      findings: [
        {
          ruleId: 'SEC-001',
          ruleName: 'Disallow API Key',
          passed: false,
          severity: 'HIGH',
          message: 'Found potential API key',
          filePath: 'config.ts',
          lineNumber: 4,
        },
        {
          ruleId: 'DOC-001',
          ruleName: 'Require Documentation',
          passed: true,
        },
      ],
      dashboardUrl: 'https://readylayer.io/runs/123',
    });

    expect(result.report.result).toBe('FAILED');
    expect(result.annotationsCreated).toBe(1);
    expect(callCount).toBe(2);
  });
});
