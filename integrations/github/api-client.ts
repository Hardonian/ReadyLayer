/**
 * GitHub API Client
 * 
 * Wrapper for GitHub REST API with rate limiting and retries
 */

// API client doesn't need Prisma

export interface GitHubAPIClient {
  getPR(repo: string, prNumber: number, token: string): Promise<any>;
  getPRDiff(repo: string, prNumber: number, token: string): Promise<string>;
  postPRComment(repo: string, prNumber: number, body: string, token: string): Promise<any>;
  updateStatusCheck(
    repo: string,
    sha: string,
    state: 'success' | 'failure' | 'pending' | 'error',
    description: string,
    context: string,
    token: string
  ): Promise<any>;
  getFileContent(repo: string, path: string, ref: string, token: string): Promise<string>;
}

export class GitHubAPIClientImpl implements GitHubAPIClient {
  private baseUrl = 'https://api.github.com';

  /**
   * Get PR details
   */
  async getPR(repo: string, prNumber: number, token: string): Promise<any> {
    const url = `${this.baseUrl}/repos/${repo}/pulls/${prNumber}`;
    return this.request(url, token);
  }

  /**
   * Get PR diff
   */
  async getPRDiff(repo: string, prNumber: number, token: string): Promise<string> {
    const url = `${this.baseUrl}/repos/${repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Post PR comment
   */
  async postPRComment(
    repo: string,
    prNumber: number,
    body: string,
    token: string
  ): Promise<any> {
    const url = `${this.baseUrl}/repos/${repo}/issues/${prNumber}/comments`;
    return this.request(url, token, {
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
  ): Promise<any> {
    const url = `${this.baseUrl}/repos/${repo}/statuses/${sha}`;
    return this.request(url, token, {
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
    const response = await this.request(url, token);
    
    // GitHub returns base64 encoded content
    if (response.content) {
      return Buffer.from(response.content, 'base64').toString('utf-8');
    }

    throw new Error('File content not found');
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
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
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
}

export const githubAPIClient = new GitHubAPIClientImpl();
