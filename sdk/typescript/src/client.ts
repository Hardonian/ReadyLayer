// ============================================
// ReadyLayer SDK - HTTP Client
// ============================================

import type {
  ApiKey,
  ApiKeyListResponse,
  BillingTierResponse,
  CheckoutSessionResponse,
  CreateApiKeyRequest,
  CreateCheckoutRequest,
  CreatePolicyPackRequest,
  CreatePolicyRuleRequest,
  CreateRepositoryRequest,
  CreateReviewRequest,
  CreateRunRequest,
  CreateSandboxRunRequest,
  CreateWaiverRequest,
  EvidenceBundle,
  EvidenceListResponse,
  GetBillingTierQuery,
  GetMetricsQuery,
  HealthResponse,
  ListEvidenceQuery,
  ListPoliciesQuery,
  ListReposQuery,
  ListReviewsQuery,
  ListRunsQuery,
  ListWaiversQuery,
  MetricsResponse,
  PolicyPack,
  PolicyPackListResponse,
  PolicyRule,
  PolicyRuleListResponse,
  PolicyTemplateListResponse,
  PolicyValidationResult,
  ReadyResponse,
  Repository,
  RepositoryListResponse,
  Review,
  ReviewListResponse,
  Run,
  RunListResponse,
  TestConnectionResponse,
  UpdatePolicyPackRequest,
  UpdatePolicyRuleRequest,
  UpdateRepositoryRequest,
  ValidatePolicyRequest,
  Waiver,
  WaiverListResponse,
} from './types';

import {
  AuthenticationError,
  createErrorFromResponse,
  NetworkError,
  ReadyLayerError,
  RetryExhaustedError,
  TimeoutError,
} from './errors';

/**
 * Configuration options for the ReadyLayer client.
 */
export interface ClientConfig {
  /** API key or Bearer token for authentication */
  apiKey?: string;
  /** Base URL for the API (default: https://readylayer.io/api/v1) */
  baseURL?: string;
  /** Maximum number of retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Maximum delay between retries in milliseconds (default: 10000) */
  maxRetryDelayMs?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Custom fetch implementation (for testing or custom environments) */
  fetch?: typeof fetch;
  /** Additional headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Retry configuration for individual requests.
 */
interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  timeoutMs: number;
}

/**
 * HTTP request options.
 */
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  baseURL: 'https://readylayer.io/api/v1',
  maxRetries: 3,
  retryDelayMs: 1000,
  maxRetryDelayMs: 10000,
  timeoutMs: 30000,
  fetch: globalThis.fetch.bind(globalThis),
} as const;

/**
 * HTTP status codes that should trigger a retry.
 */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Core HTTP client for the ReadyLayer API.
 */
export class ReadyLayerClient {
  private readonly config: Required<ClientConfig>;
  private readonly retryConfig: RetryConfig;

  constructor(config: ClientConfig = {}) {
    if (!config.apiKey) {
      throw new AuthenticationError(
        'API key is required. Provide it via the apiKey option or set READYLAYER_API_KEY environment variable.'
      );
    }

    this.config = {
      apiKey: config.apiKey!,
      baseURL: config.baseURL ?? DEFAULT_CONFIG.baseURL,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_CONFIG.retryDelayMs,
      maxRetryDelayMs: config.maxRetryDelayMs ?? DEFAULT_CONFIG.maxRetryDelayMs,
      timeoutMs: config.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
      fetch: config.fetch ?? DEFAULT_CONFIG.fetch,
      headers: config.headers ?? {},
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      maxRetryDelayMs: this.config.maxRetryDelayMs,
      timeoutMs: this.config.timeoutMs,
    };
  }

  /**
   * Build a URL with query parameters.
   */
  private buildURL(
    baseURL: string,
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, baseURL);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Calculate delay with exponential backoff and jitter.
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.retryDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxRetryDelayMs);
    return Math.round(delay);
  }

  /**
   * Sleep for the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a request with timeout.
   */
  private async executeWithTimeout<T>(
    requestFn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      requestFn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Make an HTTP request with retry logic.
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, query, skipAuth } = options;
    const url = this.buildURL(this.config.baseURL, path, query);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ReadyLayer-TypeScript-SDK/1.0.0',
      ...this.config.headers,
    };

    if (!skipAuth && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeWithTimeout(
          () =>
            this.config.fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            }),
          this.retryConfig.timeoutMs
        );

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        // Handle success responses
        if (response.ok) {
          return (await response.json()) as T;
        }

        // Handle error responses
        const errorData: unknown = await response.json().catch(() => null);
        const errorBody = (errorData ?? {}) as { error?: { code: string; message: string; context?: Record<string, unknown>; errors?: Array<{ path: Array<string | number>; message: string }> } };
        const error = createErrorFromResponse(response.status, errorBody.error);

        // Don't retry client errors (4xx except 408, 429)
        if (response.status >= 400 && response.status < 500) {
          if (!RETRYABLE_STATUS_CODES.has(response.status)) {
            throw error;
          }
        }

        // Retry server errors
        lastError = error;

        // Don't sleep on last attempt
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      } catch (error) {
        // Don't retry if it's a client error we already handled
        if (error instanceof ReadyLayerError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Network or timeout errors should be retried
        if (error instanceof TimeoutError) {
          lastError = error;
        } else if (error instanceof Error) {
          lastError = new NetworkError(error.message, { cause: error });
        } else {
          lastError = new NetworkError(String(error));
        }

        // Don't sleep on last attempt
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new RetryExhaustedError(this.retryConfig.maxRetries + 1, lastError!);
  }

  // ============================================
  // Health Endpoints
  // ============================================

  /**
   * Check service health status.
   * Does not require authentication.
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>({
      method: 'GET',
      path: '/health',
      skipAuth: true,
    });
  }

  /**
   * Check service readiness including dependencies.
   * Does not require authentication.
   */
  async getReady(): Promise<ReadyResponse> {
    return this.request<ReadyResponse>({
      method: 'GET',
      path: '/ready',
      skipAuth: true,
    });
  }

  // ============================================
  // Repository Endpoints
  // ============================================

  /**
   * List all repositories accessible to the authenticated user.
   */
  async listRepositories(query?: ListReposQuery): Promise<RepositoryListResponse> {
    return this.request<RepositoryListResponse>({
      method: 'GET',
      path: '/repos',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific repository by ID.
   */
  async getRepository(repoId: string): Promise<Repository> {
    return this.request<Repository>({
      method: 'GET',
      path: `/repos/${encodeURIComponent(repoId)}`,
    });
  }

  /**
   * Create a new repository.
   */
  async createRepository(body: CreateRepositoryRequest): Promise<Repository> {
    return this.request<Repository>({
      method: 'POST',
      path: '/repos',
      body,
    });
  }

  /**
   * Update a repository's settings.
   */
  async updateRepository(
    repoId: string,
    body: UpdateRepositoryRequest
  ): Promise<Repository> {
    return this.request<Repository>({
      method: 'PUT',
      path: `/repos/${encodeURIComponent(repoId)}`,
      body,
    });
  }

  /**
   * Delete a repository and all associated data.
   */
  async deleteRepository(repoId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/repos/${encodeURIComponent(repoId)}`,
    });
  }

  /**
   * Test connectivity to the repository provider.
   */
  async testRepositoryConnection(repoId: string): Promise<TestConnectionResponse> {
    return this.request<TestConnectionResponse>({
      method: 'POST',
      path: `/repos/${encodeURIComponent(repoId)}/test-connection`,
    });
  }

  // ============================================
  // Policy Endpoints
  // ============================================

  /**
   * List all policy packs.
   */
  async listPolicyPacks(query?: ListPoliciesQuery): Promise<PolicyPackListResponse> {
    return this.request<PolicyPackListResponse>({
      method: 'GET',
      path: '/policies',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific policy pack by ID.
   */
  async getPolicyPack(packId: string): Promise<PolicyPack> {
    return this.request<PolicyPack>({
      method: 'GET',
      path: `/policies/${encodeURIComponent(packId)}`,
    });
  }

  /**
   * Create a new policy pack.
   */
  async createPolicyPack(body: CreatePolicyPackRequest): Promise<PolicyPack> {
    return this.request<PolicyPack>({
      method: 'POST',
      path: '/policies',
      body,
    });
  }

  /**
   * Update a policy pack.
   */
  async updatePolicyPack(
    packId: string,
    body: UpdatePolicyPackRequest
  ): Promise<PolicyPack> {
    return this.request<PolicyPack>({
      method: 'PUT',
      path: `/policies/${encodeURIComponent(packId)}`,
      body,
    });
  }

  /**
   * Delete a policy pack.
   */
  async deletePolicyPack(packId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/policies/${encodeURIComponent(packId)}`,
    });
  }

  /**
   * List all rules in a policy pack.
   */
  async listPolicyRules(packId: string): Promise<PolicyRuleListResponse> {
    return this.request<PolicyRuleListResponse>({
      method: 'GET',
      path: `/policies/${encodeURIComponent(packId)}/rules`,
    });
  }

  /**
   * Add a rule to a policy pack.
   */
  async createPolicyRule(
    packId: string,
    body: CreatePolicyRuleRequest
  ): Promise<PolicyRule> {
    return this.request<PolicyRule>({
      method: 'POST',
      path: `/policies/${encodeURIComponent(packId)}/rules`,
      body,
    });
  }

  /**
   * Update a rule in a policy pack.
   */
  async updatePolicyRule(
    packId: string,
    ruleId: string,
    body: UpdatePolicyRuleRequest
  ): Promise<PolicyRule> {
    return this.request<PolicyRule>({
      method: 'PUT',
      path: `/policies/${encodeURIComponent(packId)}/rules/${encodeURIComponent(ruleId)}`,
      body,
    });
  }

  /**
   * Delete a rule from a policy pack.
   */
  async deletePolicyRule(packId: string, ruleId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/policies/${encodeURIComponent(packId)}/rules/${encodeURIComponent(ruleId)}`,
    });
  }

  /**
   * Validate policy syntax.
   */
  async validatePolicy(body: ValidatePolicyRequest): Promise<PolicyValidationResult> {
    return this.request<PolicyValidationResult>({
      method: 'POST',
      path: '/policies/validate',
      body,
    });
  }

  /**
   * List available policy templates.
   */
  async listPolicyTemplates(): Promise<PolicyTemplateListResponse> {
    return this.request<PolicyTemplateListResponse>({
      method: 'GET',
      path: '/policies/templates',
    });
  }

  // ============================================
  // Review Endpoints
  // ============================================

  /**
   * List all code reviews.
   */
  async listReviews(query?: ListReviewsQuery): Promise<ReviewListResponse> {
    return this.request<ReviewListResponse>({
      method: 'GET',
      path: '/reviews',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific review by ID.
   */
  async getReview(reviewId: string): Promise<Review> {
    return this.request<Review>({
      method: 'GET',
      path: `/reviews/${encodeURIComponent(reviewId)}`,
    });
  }

  /**
   * Create a new code review.
   */
  async createReview(body: CreateReviewRequest): Promise<Review> {
    return this.request<Review>({
      method: 'POST',
      path: '/reviews',
      body,
    });
  }

  // ============================================
  // Waiver Endpoints
  // ============================================

  /**
   * List all waivers.
   */
  async listWaivers(query?: ListWaiversQuery): Promise<WaiverListResponse> {
    return this.request<WaiverListResponse>({
      method: 'GET',
      path: '/waivers',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific waiver by ID.
   */
  async getWaiver(waiverId: string): Promise<Waiver> {
    return this.request<Waiver>({
      method: 'GET',
      path: `/waivers/${encodeURIComponent(waiverId)}`,
    });
  }

  /**
   * Create a new waiver.
   */
  async createWaiver(body: CreateWaiverRequest): Promise<Waiver> {
    return this.request<Waiver>({
      method: 'POST',
      path: '/waivers',
      body,
    });
  }

  /**
   * Revoke (delete) a waiver.
   */
  async deleteWaiver(waiverId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/waivers/${encodeURIComponent(waiverId)}`,
    });
  }

  // ============================================
  // Evidence Endpoints
  // ============================================

  /**
   * List all evidence bundles.
   */
  async listEvidence(query?: ListEvidenceQuery): Promise<EvidenceListResponse> {
    return this.request<EvidenceListResponse>({
      method: 'GET',
      path: '/evidence',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific evidence bundle by ID.
   */
  async getEvidence(bundleId: string): Promise<EvidenceBundle> {
    return this.request<EvidenceBundle>({
      method: 'GET',
      path: `/evidence/${encodeURIComponent(bundleId)}`,
    });
  }

  /**
   * Export an evidence bundle as JSON.
   */
  async exportEvidence(bundleId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: 'GET',
      path: `/evidence/${encodeURIComponent(bundleId)}/export`,
    });
  }

  // ============================================
  // Run Endpoints
  // ============================================

  /**
   * List all test runs.
   */
  async listRuns(query?: ListRunsQuery): Promise<RunListResponse> {
    return this.request<RunListResponse>({
      method: 'GET',
      path: '/runs',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Get a specific test run by ID.
   */
  async getRun(runId: string): Promise<Run> {
    return this.request<Run>({
      method: 'GET',
      path: `/runs/${encodeURIComponent(runId)}`,
    });
  }

  /**
   * Create a new test run.
   */
  async createRun(body: CreateRunRequest): Promise<Run> {
    return this.request<Run>({
      method: 'POST',
      path: '/runs',
      body,
    });
  }

  /**
   * Create a new sandbox test run.
   */
  async createSandboxRun(body: CreateSandboxRunRequest): Promise<Run> {
    return this.request<Run>({
      method: 'POST',
      path: '/runs/sandbox',
      body,
    });
  }

  // ============================================
  // Billing Endpoints
  // ============================================

  /**
   * Get current billing tier and usage.
   */
  async getBillingTier(query?: GetBillingTierQuery): Promise<BillingTierResponse> {
    return this.request<BillingTierResponse>({
      method: 'GET',
      path: '/billing/tier',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Create a Stripe checkout session for subscription.
   */
  async createCheckoutSession(body: CreateCheckoutRequest): Promise<CheckoutSessionResponse> {
    return this.request<CheckoutSessionResponse>({
      method: 'POST',
      path: '/billing/checkout',
      body,
    });
  }

  // ============================================
  // Metrics Endpoints
  // ============================================

  /**
   * Get usage metrics for the organization.
   */
  async getMetrics(query?: GetMetricsQuery): Promise<MetricsResponse> {
    return this.request<MetricsResponse>({
      method: 'GET',
      path: '/metrics',
      query: query as Record<string, string | number | boolean | undefined>,
    });
  }

  // ============================================
  // API Key Endpoints
  // ============================================

  /**
   * List all API keys for the user.
   */
  async listApiKeys(): Promise<ApiKeyListResponse> {
    return this.request<ApiKeyListResponse>({
      method: 'GET',
      path: '/api-keys',
    });
  }

  /**
   * Create a new API key.
   */
  async createApiKey(body: CreateApiKeyRequest): Promise<ApiKey> {
    return this.request<ApiKey>({
      method: 'POST',
      path: '/api-keys',
      body,
    });
  }

  /**
   * Revoke (delete) an API key.
   */
  async deleteApiKey(keyId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/api-keys/${encodeURIComponent(keyId)}`,
    });
  }
}
