/**
 * Bitbucket API Client
 * 
 * Wrapper for Bitbucket REST API with rate limiting and retries
 */

export interface PipelineVariable {
  key: string;
  value: string;
}

export interface Pipeline {
  uuid: string;
  state: {
    name: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED';
    type: string;
  };
  build_number: number;
  commit: {
    hash: string;
  };
  created_on: string;
  completed_on?: string;
}

export interface BitbucketPR {
  id: number;
  title: string;
  source: {
    commit: {
      hash: string;
    };
    branch: {
      name: string;
    };
  };
  destination: {
    branch: {
      name: string;
    };
  };
  state: string;
  created_on: string;
  updated_on: string;
}

export interface BitbucketPRComment {
  id: number;
  content: {
    raw: string;
  };
  created_on: string;
}

export interface BitbucketBuildStatus {
  state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED';
  key: string;
  name: string;
  description: string;
  url: string;
}

export interface BitbucketPipelineStep {
  uuid: string;
  state?: {
    name: string;
  };
}

export interface BitbucketPipelineStepsResponse {
  values?: BitbucketPipelineStep[];
}

export interface BitbucketAPIClient {
  getPR(workspace: string, repoSlug: string, prId: number, token: string): Promise<BitbucketPR>;
  getPRDiff(workspace: string, repoSlug: string, prId: number, token: string): Promise<string>;
  postPRComment(
    workspace: string,
    repoSlug: string,
    prId: number,
    body: string,
    token: string
  ): Promise<BitbucketPRComment>;
  updateBuildStatus(
    workspace: string,
    repoSlug: string,
    sha: string,
    state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED',
    key: string,
    name: string,
    description: string,
    url: string,
    token: string
  ): Promise<BitbucketBuildStatus>;
  getFileContent(
    workspace: string,
    repoSlug: string,
    path: string,
    ref: string,
    token: string
  ): Promise<string>;
  triggerPipeline(
    workspace: string,
    repoSlug: string,
    ref: string,
    token: string,
    variables?: PipelineVariable[]
  ): Promise<Pipeline>;
  getPipeline(
    workspace: string,
    repoSlug: string,
    pipelineUuid: string,
    token: string
  ): Promise<Pipeline>;
  listPipelines(
    workspace: string,
    repoSlug: string,
    token: string,
    ref?: string
  ): Promise<{ values: Pipeline[] }>;
  getPipelineArtifacts(
    workspace: string,
    repoSlug: string,
    pipelineUuid: string,
    token: string
  ): Promise<Blob>;
}

export class BitbucketAPIClientImpl implements BitbucketAPIClient {
  private baseUrl = 'https://api.bitbucket.org/2.0';

  /**
   * Get PR details
   */
  async getPR(workspace: string, repoSlug: string, prId: number, token: string): Promise<BitbucketPR> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`;
    return this.request<BitbucketPR>(url, token);
  }

  /**
   * Get PR diff
   */
  async getPRDiff(workspace: string, repoSlug: string, prId: number, token: string): Promise<string> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`;
    
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/plain',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Bitbucket API error: ${response.status} ${errorText}`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Bitbucket API request timed out');
      }
      throw error;
    }
  }

  /**
   * Post PR comment
   */
  async postPRComment(
    workspace: string,
    repoSlug: string,
    prId: number,
    body: string,
    token: string
  ): Promise<BitbucketPRComment> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`;
    return this.request<BitbucketPRComment>(url, token, {
      method: 'POST',
      body: JSON.stringify({
        content: {
          raw: body,
        },
      }),
    });
  }

  /**
   * Update build status
   */
  async updateBuildStatus(
    workspace: string,
    repoSlug: string,
    sha: string,
    state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED',
    key: string,
    name: string,
    description: string,
    url: string,
    token: string
  ): Promise<BitbucketBuildStatus> {
    const statusUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/commit/${sha}/statuses/build`;
    return this.request<BitbucketBuildStatus>(statusUrl, token, {
      method: 'POST',
      body: JSON.stringify({
        state,
        key,
        name,
        description,
        url,
      }),
    });
  }

  /**
   * Get file content
   */
  async getFileContent(
    workspace: string,
    repoSlug: string,
    path: string,
    ref: string,
    token: string
  ): Promise<string> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/src/${ref}/${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Trigger a pipeline
   */
  async triggerPipeline(
    workspace: string,
    repoSlug: string,
    ref: string,
    token: string,
    variables: PipelineVariable[] = []
  ): Promise<Pipeline> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pipelines/`;
    const payload: {
      target: {
        ref_type: string;
        type: string;
        ref_name: string;
      };
      variables?: Array<{
        key: string;
        value: string;
        secured: boolean;
      }>;
    } = {
      target: {
        ref_type: 'branch',
        type: 'pipeline_ref_target',
        ref_name: ref,
      },
    };

    if (variables.length > 0) {
      payload.variables = variables.map(v => ({
        key: v.key,
        value: v.value,
        secured: false,
      }));
    }

    return this.request<Pipeline>(url, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get pipeline details
   */
  async getPipeline(
    workspace: string,
    repoSlug: string,
    pipelineUuid: string,
    token: string
  ): Promise<Pipeline> {
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pipelines/${pipelineUuid}`;
    return this.request<Pipeline>(url, token);
  }

  /**
   * List pipelines
   */
  async listPipelines(
    workspace: string,
    repoSlug: string,
    token: string,
    ref?: string
  ): Promise<{ values: Pipeline[] }> {
    let url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pipelines/`;
    if (ref) {
      url += `?target.ref_name=${encodeURIComponent(ref)}`;
    }
    return this.request<{ values: Pipeline[] }>(url, token);
  }

  /**
   * Get pipeline artifacts
   */
  async getPipelineArtifacts(
    workspace: string,
    repoSlug: string,
    pipelineUuid: string,
    token: string
  ): Promise<Blob> {
    // Bitbucket Pipelines artifacts are accessed via steps
    const stepsUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pipelines/${pipelineUuid}/steps/`;
    const steps = await this.request<BitbucketPipelineStepsResponse>(stepsUrl, token);
    
    // Find the step with artifacts (usually the test step)
    const stepWithArtifacts = steps.values?.find((step) => step.state?.name === 'COMPLETED');
    
    if (!stepWithArtifacts) {
      throw new Error(`No completed steps found in pipeline ${pipelineUuid}`);
    }

    // Download artifacts (Bitbucket returns a redirect URL)
    const artifactsUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pipelines/${pipelineUuid}/steps/${stepWithArtifacts.uuid}/artifacts`;
    const response = await fetch(artifactsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return await response.blob();
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const errorData = await response.json() as { error?: { message?: string } };
            errorMessage = errorData.error?.message ?? errorMessage;
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(`Bitbucket API error: ${errorMessage}`);
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await response.json() as T;
        } catch {
          throw new Error('Failed to parse Bitbucket API response as JSON');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await this.sleep(delay);
            continue;
          }
          throw new Error('Bitbucket API request timed out after retries');
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

export const bitbucketAPIClient = new BitbucketAPIClientImpl();
