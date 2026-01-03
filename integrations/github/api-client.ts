/**
 * GitHub API Client
 * 
 * Wrapper for GitHub REST API with rate limiting and retries
 */

// API client doesn't need Prisma

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

export interface WorkflowDispatchInputs {
  [key: string]: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  workflow_id: number;
  head_sha: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
  files?: Array<{
    filename: string;
    status?: string;
  }>;
}

export interface GitHubAPIClient {
  getPR(repo: string, prNumber: number, token: string): Promise<GitHubPR>;
  getPRDiff(repo: string, prNumber: number, token: string): Promise<string>;
  postPRComment(repo: string, prNumber: number, body: string, token: string): Promise<{ id: number }>;
  updateStatusCheck(
    repo: string,
    sha: string,
    state: 'success' | 'failure' | 'pending' | 'error',
    description: string,
    context: string,
    token: string
  ): Promise<{ state: string }>;
  createOrUpdateCheckRun(
    repo: string,
    sha: string,
    details: CheckRunDetails,
    token: string
  ): Promise<{ id: number; name: string }>;
  getFileContent(repo: string, path: string, ref: string, token: string): Promise<string>;
  dispatchWorkflow(
    repo: string,
    workflowId: string,
    ref: string,
    token: string,
    inputs?: WorkflowDispatchInputs
  ): Promise<void>;
  getWorkflowRun(repo: string, runId: number, token: string): Promise<WorkflowRun>;
  listWorkflowRuns(
    repo: string,
    workflowId: string,
    token: string,
    branch?: string
  ): Promise<{ workflow_runs: WorkflowRun[] }>;
  listWorkflowRunArtifacts(repo: string, runId: number, token: string): Promise<{ artifacts: WorkflowArtifact[] }>;
  downloadArtifact(repo: string, artifactId: number, token: string): Promise<ArrayBuffer>;
}

export class GitHubAPIClientImpl implements GitHubAPIClient {
  private baseUrl = 'https://api.github.com';

  /**
   * Get PR details
   */
  async getPR(repo: string, prNumber: number, token: string): Promise<GitHubPR> {
    const url = `${this.baseUrl}/repos/${repo}/pulls/${prNumber}`;
    return this.request<GitHubPR>(url, token);
  }

  /**
   * Get PR diff
   */
  async getPRDiff(repo: string, prNumber: number, token: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${repo}/pulls/${prNumber}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3.diff',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`GitHub API error: ${response.status} ${errorText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('GitHub API request timed out');
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('GitHub API request was aborted');
      }
      throw error;
    }
  }

  /**
   * Post PR comment
   */
  async postPRComment(
    repo: string,
    prNumber: number,
    body: string,
    token: string
  ): Promise<{ id: number }> {
    const url = `${this.baseUrl}/repos/${repo}/issues/${prNumber}/comments`;
    return this.request<{ id: number }>(url, token, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  /**
   * Update status check
   */
  async updateStatusCheck(
    repo: string,
    sha: string,
    state: 'success' | 'failure' | 'pending' | 'error',
    description: string,
    context: string,
    token: string
  ): Promise<{ state: string }> {
    const url = `${this.baseUrl}/repos/${repo}/statuses/${sha}`;
    return this.request<{ state: string }>(url, token, {
      method: 'POST',
      body: JSON.stringify({
        state,
        description,
        context,
        target_url: `https://readylayer.com/reviews/${context}`,
      }),
    });
  }

  /**
   * Get file content
   */
  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${repo}/contents/${path}?ref=${ref}`;
    const response = await this.request<{ content?: string }>(url, token);
    
    // GitHub returns base64 encoded content
    if (response.content) {
      return Buffer.from(response.content, 'base64').toString('utf-8');
    }

    throw new Error('File content not found');
  }

  /**
   * Create or update check run (idempotent)
   * Uses check-run name to find existing check-run and update it, or create new one
   * 
   * Rate limiting and retries are handled by the request() method
   */
  async createOrUpdateCheckRun(
    repo: string,
    sha: string,
    details: CheckRunDetails,
    token: string
  ): Promise<{ id: number; name: string }> {
    // Try to find existing check-run by name
    try {
      const checkRunsUrl = `${this.baseUrl}/repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(details.name)}`;
      const checkRunsResponse = await fetch(checkRunsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(10000),
      });

      // Handle rate limiting
      if (checkRunsResponse.status === 429) {
        const retryAfter = parseInt(checkRunsResponse.headers.get('Retry-After') || '60', 10);
        await this.sleep(retryAfter * 1000);
        // Retry lookup after rate limit delay
        return this.createOrUpdateCheckRun(repo, sha, details, token);
      }

      if (checkRunsResponse.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const checkRunsData = await checkRunsResponse.json() as {
          check_runs?: Array<{ id: number; name: string; head_sha: string }>;
        };
        const existingCheckRun = checkRunsData.check_runs?.find(
          (cr) => cr.name === details.name && cr.head_sha === sha
        );

        if (existingCheckRun) {
          // Update existing check-run (idempotent)
          const updateUrl = `${this.baseUrl}/repos/${repo}/check-runs/${existingCheckRun.id}`;
          return this.request<{ id: number; name: string }>(updateUrl, token, {
            method: 'PATCH',
            body: JSON.stringify({
              name: details.name,
              head_sha: sha,
              status: details.status,
              conclusion: details.conclusion,
              output: details.output,
              details_url: details.details_url,
              external_id: details.external_id,
            }),
          });
        }
      }
    } catch (error) {
      // If lookup fails, proceed to create new check-run
      // This is safe - worst case we create a duplicate which GitHub will handle gracefully
      // The request() method will handle retries and rate limiting for the create call
    }

    // Create new check-run
    const createUrl = `${this.baseUrl}/repos/${repo}/check-runs`;
    return this.request<{ id: number; name: string }>(createUrl, token, {
      method: 'POST',
      body: JSON.stringify({
        name: details.name,
        head_sha: sha,
        status: details.status,
        conclusion: details.conclusion,
        output: details.output,
        details_url: details.details_url,
        external_id: details.external_id,
      }),
    });
  }

  /**
   * Make API request with retries
   */
  private async request<T>(
    url: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          let errorMessage = `${response.status} ${response.statusText}`;
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const errorData = await response.json() as { message?: string };
            errorMessage = errorData.message ?? errorMessage;
          } catch {
            // Ignore JSON parse errors, use status text
          }
          throw new Error(`GitHub API error: ${errorMessage}`);
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await response.json() as T;
        } catch {
          throw new Error('Failed to parse GitHub API response as JSON');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Handle timeout/abort errors
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await this.sleep(delay);
            continue;
          }
          throw new Error('GitHub API request timed out after retries');
        }
        
        // Retry on transient errors
        if (attempt < maxRetries - 1 && this.isRetryableError(lastError)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableMessages = ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT'];
    return retryableMessages.some((msg) => error.message.toLowerCase().includes(msg));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Dispatch a workflow
   */
  async dispatchWorkflow(
    repo: string,
    workflowId: string,
    ref: string,
    token: string,
    inputs: WorkflowDispatchInputs = {}
  ): Promise<void> {
    const url = `${this.baseUrl}/repos/${repo}/actions/workflows/${workflowId}/dispatches`;
    await this.request(url, token, {
      method: 'POST',
      body: JSON.stringify({
        ref,
        inputs,
      }),
    });
  }

  /**
   * Get workflow run details
   */
  async getWorkflowRun(repo: string, runId: number, token: string): Promise<WorkflowRun> {
    const url = `${this.baseUrl}/repos/${repo}/actions/runs/${runId}`;
    return this.request(url, token);
  }

  /**
   * List workflow runs
   */
  async listWorkflowRuns(
    repo: string,
    workflowId: string,
    token: string,
    branch?: string
  ): Promise<{ workflow_runs: WorkflowRun[] }> {
    let url = `${this.baseUrl}/repos/${repo}/actions/workflows/${workflowId}/runs`;
    if (branch) {
      url += `?branch=${encodeURIComponent(branch)}`;
    }
    return this.request(url, token);
  }

  /**
   * List workflow run artifacts
   */
  async listWorkflowRunArtifacts(
    repo: string,
    runId: number,
    token: string
  ): Promise<{ artifacts: WorkflowArtifact[] }> {
    const url = `${this.baseUrl}/repos/${repo}/actions/runs/${runId}/artifacts`;
    return this.request(url, token);
  }

  /**
   * Download artifact
   */
  async downloadArtifact(repo: string, artifactId: number, token: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/repos/${repo}/actions/artifacts/${artifactId}/zip`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(60000), // 60 second timeout for downloads
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    return await response.arrayBuffer();
  }
}

export const githubAPIClient = new GitHubAPIClientImpl();
