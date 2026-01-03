/**
 * Git Provider PR Operations Adapter
 * 
 * Provider-agnostic abstraction for PR/MR operations
 */

import { githubAPIClient } from './github/api-client';
import { gitlabAPIClient } from './gitlab/api-client';
import { bitbucketAPIClient } from './bitbucket/api-client';
import type { GitProvider } from './git-provider-adapter';

export interface PRDetails {
  number: number;
  title: string;
  sha: string;
  baseBranch: string;
  headBranch: string;
  files?: Array<{ filename: string; status?: string }>;
}

export interface PRComment {
  body: string;
  path?: string;
  line?: number;
}

export interface StatusCheck {
  state: 'success' | 'failure' | 'pending' | 'error' | 'cancelled';
  description: string;
  context: string;
  targetUrl?: string;
}

export interface CheckRunAnnotation {
  path: string;
  start_line: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  message: string;
  title?: string;
  raw_details?: string;
}

export interface CheckRunDetails {
  name: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  output?: {
    title: string;
    summary: string;
    text?: string;
    annotations?: CheckRunAnnotation[];
  };
  details_url?: string;
  external_id?: string;
}

export interface GitProviderPRAdapter {
  /**
   * Get PR/MR details
   */
  getPR(repo: string, prNumber: number, token: string): Promise<PRDetails>;

  /**
   * Get PR/MR diff
   */
  getPRDiff(repo: string, prNumber: number, token: string): Promise<string>;

  /**
   * Post PR/MR comment
   */
  postPRComment(repo: string, prNumber: number, comment: PRComment, token: string): Promise<void>;

  /**
   * Update commit status / check run
   */
  updateStatusCheck(repo: string, sha: string, status: StatusCheck, token: string): Promise<void>;

  /**
   * Create or update check run (GitHub) / commit status (GitLab/Bitbucket)
   */
  createOrUpdateCheckRun(repo: string, sha: string, details: CheckRunDetails, token: string): Promise<void>;

  /**
   * Get file content
   */
  getFileContent(repo: string, path: string, ref: string, token: string): Promise<string>;
}

/**
 * GitHub PR Adapter Implementation
 */
class GitHubPRAdapter implements GitProviderPRAdapter {
  async getPR(repo: string, prNumber: number, token: string): Promise<PRDetails> {
    const pr = await githubAPIClient.getPR(repo, prNumber, token);
    return {
      number: pr.number,
      title: pr.title,
      sha: pr.head.sha,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      files: pr.files?.map((f) => ({ filename: f.filename, status: f.status })),
    };
  }

  async getPRDiff(repo: string, prNumber: number, token: string): Promise<string> {
    return githubAPIClient.getPRDiff(repo, prNumber, token);
  }

  async postPRComment(repo: string, prNumber: number, comment: PRComment, token: string): Promise<void> {
    await githubAPIClient.postPRComment(repo, prNumber, comment.body, token);
  }

  async updateStatusCheck(repo: string, sha: string, status: StatusCheck, token: string): Promise<void> {
    // Map 'cancelled' to 'error' for GitHub API compatibility
    const githubState = status.state === 'cancelled' ? 'error' : status.state;
    await githubAPIClient.updateStatusCheck(
      repo,
      sha,
      githubState as 'success' | 'failure' | 'pending' | 'error',
      status.description,
      status.context,
      token
    );
  }

  async createOrUpdateCheckRun(repo: string, sha: string, details: CheckRunDetails, token: string): Promise<void> {
    await githubAPIClient.createOrUpdateCheckRun(repo, sha, details, token);
  }

  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string> {
    return githubAPIClient.getFileContent(repo, path, ref, token);
  }
}

/**
 * GitLab PR Adapter Implementation
 */
class GitLabPRAdapter implements GitProviderPRAdapter {
  async getPR(repo: string, prNumber: number, token: string): Promise<PRDetails> {
    const mr = await gitlabAPIClient.getMR(repo, prNumber, token);
    return {
      number: mr.iid ?? mr.id,
      title: mr.title,
      sha: mr.sha ?? mr.last_commit?.id ?? '',
      baseBranch: mr.target_branch,
      headBranch: mr.source_branch,
    };
  }

  async getPRDiff(repo: string, prNumber: number, token: string): Promise<string> {
    return gitlabAPIClient.getMRDiff(repo, prNumber, token);
  }

  async postPRComment(repo: string, prNumber: number, comment: PRComment, token: string): Promise<void> {
    await gitlabAPIClient.postMRComment(repo, prNumber, comment.body, token);
  }

  async updateStatusCheck(repo: string, sha: string, status: StatusCheck, token: string): Promise<void> {
    const gitlabState = status.state === 'success' ? 'success' : 
                        status.state === 'failure' ? 'failed' : 
                        status.state === 'pending' ? 'pending' : 'canceled';
    await gitlabAPIClient.updateCommitStatus(
      repo,
      sha,
      gitlabState,
      status.description,
      status.context,
      token
    );
  }

  async createOrUpdateCheckRun(repo: string, sha: string, details: CheckRunDetails, token: string): Promise<void> {
    // GitLab doesn't have check runs, use commit status instead
    const gitlabState = details.conclusion === 'success' ? 'success' :
                       details.conclusion === 'failure' ? 'failed' :
                       details.status === 'completed' ? 'success' : 'pending';
    await gitlabAPIClient.updateCommitStatus(
      repo,
      sha,
      gitlabState,
      details.output?.summary || details.output?.title || '',
      details.name,
      token
    );
  }

  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string> {
    return gitlabAPIClient.getFileContent(repo, path, ref, token);
  }
}

/**
 * Bitbucket PR Adapter Implementation
 */
class BitbucketPRAdapter implements GitProviderPRAdapter {
  private parseRepo(repo: string): { workspace: string; repoSlug: string } {
    const [workspace, repoSlug] = repo.split('/');
    return { workspace, repoSlug };
  }

  async getPR(repo: string, prNumber: number, token: string): Promise<PRDetails> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    const pr = await bitbucketAPIClient.getPR(workspace, repoSlug, prNumber, token);
    return {
      number: pr.id ?? prNumber,
      title: pr.title,
      sha: pr.source?.commit?.hash ?? pr.fromRef?.latestCommit ?? '',
      baseBranch: pr.destination?.branch?.name ?? pr.toRef?.displayId ?? '',
      headBranch: pr.source?.branch?.name ?? pr.fromRef?.displayId ?? '',
    };
  }

  async getPRDiff(repo: string, prNumber: number, token: string): Promise<string> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    return bitbucketAPIClient.getPRDiff(workspace, repoSlug, prNumber, token);
  }

  async postPRComment(repo: string, prNumber: number, comment: PRComment, token: string): Promise<void> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    await bitbucketAPIClient.postPRComment(workspace, repoSlug, prNumber, comment.body, token);
  }

  async updateStatusCheck(repo: string, sha: string, status: StatusCheck, token: string): Promise<void> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    const bitbucketState = status.state === 'success' ? 'SUCCESSFUL' :
                           status.state === 'failure' ? 'FAILED' :
                           status.state === 'pending' ? 'INPROGRESS' : 'STOPPED';
    await bitbucketAPIClient.updateBuildStatus(
      workspace,
      repoSlug,
      sha,
      bitbucketState,
      status.context,
      status.context,
      status.description,
      status.targetUrl || '',
      token
    );
  }

  async createOrUpdateCheckRun(repo: string, sha: string, details: CheckRunDetails, token: string): Promise<void> {
    // Bitbucket uses build status instead of check runs
    const { workspace, repoSlug } = this.parseRepo(repo);
    const bitbucketState = details.conclusion === 'success' ? 'SUCCESSFUL' :
                          details.conclusion === 'failure' ? 'FAILED' :
                          details.status === 'completed' ? 'SUCCESSFUL' : 'INPROGRESS';
    await bitbucketAPIClient.updateBuildStatus(
      workspace,
      repoSlug,
      sha,
      bitbucketState,
      details.name,
      details.name,
      details.output?.summary || details.output?.title || '',
      details.details_url || '',
      token
    );
  }

  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    return bitbucketAPIClient.getFileContent(workspace, repoSlug, path, ref, token);
  }
}

/**
 * Get PR adapter for provider
 */
export function getGitProviderPRAdapter(provider: GitProvider): GitProviderPRAdapter {
  switch (provider) {
    case 'github':
      return new GitHubPRAdapter();
    case 'gitlab':
      return new GitLabPRAdapter();
    case 'bitbucket':
      return new BitbucketPRAdapter();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
