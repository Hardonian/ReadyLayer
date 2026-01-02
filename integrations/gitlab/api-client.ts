/**
 * GitLab API Client
 * 
 * Wrapper for GitLab REST API with rate limiting and retries
 */

export interface PipelineVariable {
  key: string;
  value: string;
}

export interface Pipeline {
  id: number;
  status: 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped';
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineArtifact {
  file_type: string;
  size: number;
  filename: string;
  file_format?: string;
}

export interface GitLabAPIClient {
  getMR(repo: string, mrIid: number, token: string): Promise<any>;
  getMRDiff(repo: string, mrIid: number, token: string): Promise<string>;
  postMRComment(repo: string, mrIid: number, body: string, token: string): Promise<any>;
  updateCommitStatus(
    repo: string,
    sha: string,
    state: 'success' | 'failed' | 'pending' | 'canceled',
    description: string,
    name: string,
    token: string
  ): Promise<any>;
  getFileContent(repo: string, path: string, ref: string, token: string): Promise<string>;
  triggerPipeline(
    repo: string,
    ref: string,
    variables?: PipelineVariable[],
    token: string
  ): Promise<Pipeline>;
  getPipeline(repo: string, pipelineId: number, token: string): Promise<Pipeline>;
  listPipelines(
    repo: string,
    ref?: string,
    token: string
  ): Promise<Pipeline[]>;
  getPipelineArtifacts(repo: string, pipelineId: number, jobName: string, token: string): Promise<Blob>;
}

export class GitLabAPIClientImpl implements GitLabAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://gitlab.com/api/v4') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get MR details
   */
  async getMR(repo: string, mrIid: number, token: string): Promise<any> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}`;
    return this.request(url, token);
  }

  /**
   * Get MR diff
   */
  async getMRDiff(repo: string, mrIid: number, token: string): Promise<string> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/diffs`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'PRIVATE-TOKEN': token,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`GitLab API error: ${response.status} ${errorText}`);
      }

      const diffs = await response.json();
      // Convert diff objects to unified diff format
      return diffs.map((diff: any) => {
        return `diff --git a/${diff.old_path} b/${diff.new_path}\n${diff.diff}`;
      }).join('\n');
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('GitLab API request timed out');
      }
      throw error;
    }
  }

  /**
   * Post MR comment
   */
  async postMRComment(
    repo: string,
    mrIid: number,
    body: string,
    token: string
  ): Promise<any> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/merge_requests/${mrIid}/notes`;
    return this.request(url, token, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  /**
   * Update commit status
   */
  async updateCommitStatus(
    repo: string,
    sha: string,
    state: 'success' | 'failed' | 'pending' | 'canceled',
    description: string,
    name: string,
    token: string
  ): Promise<any> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/statuses/${sha}`;
    return this.request(url, token, {
      method: 'POST',
      body: JSON.stringify({
        state,
        description,
        name,
        target_url: `https://readylayer.com/reviews/${name}`,
      }),
    });
  }

  /**
   * Get file content
   */
  async getFileContent(repo: string, path: string, ref: string, token: string): Promise<string> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/repository/files/${encodeURIComponent(path)}/raw?ref=${ref}`;
    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': token,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Trigger a pipeline
   */
  async triggerPipeline(
    repo: string,
    ref: string,
    variables: PipelineVariable[] = [],
    token: string
  ): Promise<Pipeline> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/pipeline`;
    return this.request(url, token, {
      method: 'POST',
      body: JSON.stringify({
        ref,
        variables: variables.map(v => ({ key: v.key, value: v.value })),
      }),
    });
  }

  /**
   * Get pipeline details
   */
  async getPipeline(repo: string, pipelineId: number, token: string): Promise<Pipeline> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}`;
    return this.request(url, token);
  }

  /**
   * List pipelines
   */
  async listPipelines(
    repo: string,
    ref: string | undefined,
    token: string
  ): Promise<Pipeline[]> {
    let url = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/pipelines`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }
    const response = await this.request(url, token);
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get pipeline artifacts
   */
  async getPipelineArtifacts(
    repo: string,
    pipelineId: number,
    jobName: string,
    token: string
  ): Promise<Blob> {
    // First, get the job ID
    const jobsUrl = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/pipelines/${pipelineId}/jobs`;
    const jobs = await this.request(jobsUrl, token);
    const job = Array.isArray(jobs) ? jobs.find((j: any) => j.name === jobName) : null;

    if (!job) {
      throw new Error(`Job ${jobName} not found in pipeline ${pipelineId}`);
    }

    const artifactsUrl = `${this.baseUrl}/projects/${encodeURIComponent(repo)}/jobs/${job.id}/artifacts`;
    const response = await fetch(artifactsUrl, {
      headers: {
        'PRIVATE-TOKEN': token,
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return await response.blob();
  }

  /**
   * Make API request with retries
   */
  private async request(
    url: string,
    token: string,
    options: RequestInit = {}
  ): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000),
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
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(`GitLab API error: ${errorMessage}`);
        }

        try {
          return await response.json();
        } catch (jsonError) {
          throw new Error('Failed to parse GitLab API response as JSON');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await this.sleep(delay);
            continue;
          }
          throw new Error('GitLab API request timed out after retries');
        }
        
        if (attempt < maxRetries - 1 && this.isRetryableError(lastError)) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT'];
    return retryableMessages.some((msg) => error.message.toLowerCase().includes(msg));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gitlabAPIClient = new GitLabAPIClientImpl();
