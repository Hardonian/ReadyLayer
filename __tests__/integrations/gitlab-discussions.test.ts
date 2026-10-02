import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitLabMRDiscussionService } from '../../integrations/gitlab/merge-request-discussions';

describe('GitLab MR Discussions & Policy Gate Service', () => {
  let service: GitLabMRDiscussionService;

  beforeEach(() => {
    service = new GitLabMRDiscussionService('https://gitlab.example.com/api/v4');
    vi.restoreAllMocks();
  });

  it('posts inline discussion with suggested fix and proper position coordinates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'disc_123',
        individual_note: false,
        notes: [{ id: 1, body: 'Note body', author: { name: 'ReadyLayer Bot', username: 'readylayer' } }],
      }),
    });
    global.fetch = fetchMock;

    const res = await service.createInlineDiscussion(
      'group/project',
      42,
      {
        ruleId: 'security.sql-injection',
        severity: 'critical',
        message: 'Unsanitized user input in query',
        file: 'src/db.ts',
        line: 18,
        fix: 'const result = await db.query(sql, [id]);',
      },
      {
        baseSha: 'base_sha_111',
        startSha: 'start_sha_222',
        headSha: 'head_sha_333',
      },
      'glpat_secret_token'
    );

    expect(res).not.toBeNull();
    expect(res?.id).toBe('disc_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, req] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gitlab.example.com/api/v4/projects/group%2Fproject/merge_requests/42/discussions');
    const body = JSON.parse(req.body);
    expect(body.position.new_path).toBe('src/db.ts');
    expect(body.position.new_line).toBe(18);
    expect(body.body).toContain('```suggestion');
    expect(body.body).toContain('ReadyLayer Finding: `security.sql-injection`');
  });

  it('updates GitLab commit status for blocked policy gate', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const success = await service.updatePolicyGateCommitStatus(
      'group/project',
      'sha_444',
      {
        blocked: true,
        score: 45,
        rulesFired: ['security.sql-injection'],
        findingsCount: 1,
      },
      'https://app.readylayer.com/runs/run_123',
      'glpat_secret_token'
    );

    expect(success).toBe(true);
    const [url, req] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gitlab.example.com/api/v4/projects/group%2Fproject/statuses/sha_444');
    const body = JSON.parse(req.body);
    expect(body.state).toBe('failed');
    expect(body.name).toBe('readylayer/policy-gate');
  });
});
