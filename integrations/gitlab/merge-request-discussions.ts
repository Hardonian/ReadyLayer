/**
 * GitLab Merge Request Inline Discussions & Policy Gate Service
 * 
 * Provides:
 * - Direct inline diff discussions on MR lines for policy findings
 * - Code fix suggestions with GitLab markdown format
 * - Commit status reporting (readylayer/policy-gate)
 * - Automated MR approval / unapproval according to policy decisions
 */

import { logger } from '../../observability/logging';

export interface DiffRefs {
  baseSha: string;
  startSha: string;
  headSha: string;
}

export interface MRFinding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
  fix?: string;
  confidence?: number;
}

export interface PolicyGateStatusResult {
  blocked: boolean;
  score: number;
  rulesFired: string[];
  findingsCount: number;
  runId?: string;
}

export interface GitLabDiscussionResponse {
  id: string;
  individual_note: boolean;
  notes: Array<{
    id: number;
    body: string;
    author: { name: string; username: string };
  }>;
}

export class GitLabMRDiscussionService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://gitlab.com/api/v4') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Post an inline discussion thread on a specific file and line of a GitLab MR
   */
  async createInlineDiscussion(
    projectId: string | number,
    mrIid: number,
    finding: MRFinding,
    diffRefs: DiffRefs,
    token: string
  ): Promise<GitLabDiscussionResponse | null> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/discussions`;

    const severityEmoji =
      finding.severity === 'critical' ? '🔴' :
      finding.severity === 'high' ? '🟠' :
      finding.severity === 'medium' ? '🟡' : '🔵';

    let body = `### ${severityEmoji} **ReadyLayer Finding: \`${finding.ruleId}\`**\n\n`;
    body += `**Severity:** \`${finding.severity.toUpperCase()}\`\n\n`;
    body += `${finding.message}\n\n`;

    if (finding.fix) {
      body += `**Suggested Fix:**\n\`\`\`suggestion\n${finding.fix}\n\`\`\`\n\n`;
    }

    body += `_Deterministic Governance Policy Engine • [ReadyLayer](https://readylayer.com)_`;

    const payload = {
      body,
      position: {
        base_sha: diffRefs.baseSha,
        start_sha: diffRefs.startSha,
        head_sha: diffRefs.headSha,
        position_type: 'text',
        new_path: finding.file,
        new_line: finding.line,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        logger.warn({ errorText, status: response.status, finding }, 'Failed to post GitLab inline discussion, falling back to general note');
        return null;
      }

      const data = (await response.json()) as GitLabDiscussionResponse;
      return data;
    } catch (error) {
      logger.error({ error, finding }, 'Error posting GitLab inline discussion');
      return null;
    }
  }

  /**
   * Update GitLab commit status for policy gate
   */
  async updatePolicyGateCommitStatus(
    projectId: string | number,
    sha: string,
    result: PolicyGateStatusResult,
    dashboardUrl: string,
    token: string
  ): Promise<boolean> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/statuses/${sha}`;

    const state = result.blocked ? 'failed' : 'success';
    const description = result.blocked
      ? `Blocked by policy gate (${result.findingsCount} findings, score: ${result.score})`
      : `All policy gates passed (score: ${result.score}/100)`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          name: 'readylayer/policy-gate',
          description,
          target_url: dashboardUrl,
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error({ error, sha }, 'Failed to update GitLab commit status');
      return false;
    }
  }

  /**
   * Approve or unapprove GitLab MR based on policy gate
   */
  async setMergeRequestApproval(
    projectId: string | number,
    mrIid: number,
    approved: boolean,
    token: string
  ): Promise<boolean> {
    const action = approved ? 'approve' : 'unapprove';
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/${action}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
      });

      return response.ok || response.status === 400; // 400 might mean already approved/unapproved
    } catch (error) {
      logger.warn({ error, mrIid, action }, 'Failed to modify GitLab MR approval state');
      return false;
    }
  }

  /**
   * Publish batch findings discussions on MR
   */
  async publishBatchDiscussions(
    projectId: string | number,
    mrIid: number,
    findings: MRFinding[],
    diffRefs: DiffRefs,
    token: string,
    maxDiscussions = 15
  ): Promise<{ postedCount: number; fallbackCount: number }> {
    let postedCount = 0;
    let fallbackCount = 0;

    const slice = findings.slice(0, maxDiscussions);
    for (const finding of slice) {
      const res = await this.createInlineDiscussion(projectId, mrIid, finding, diffRefs, token);
      if (res) {
        postedCount++;
      } else {
        fallbackCount++;
      }
    }

    return { postedCount, fallbackCount };
  }
}

export const gitLabMRDiscussionService = new GitLabMRDiscussionService();
