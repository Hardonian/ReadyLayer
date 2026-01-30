// ============================================
// ReadyLayer SDK - Type Definitions
// Generated from OpenAPI 3.1.0 specification
// ============================================

// ============================================
// Enums
// ============================================

export type RepositoryProvider = 'github' | 'gitlab' | 'bitbucket';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

export type ReviewStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RunConclusion = 'success' | 'failure' | 'partial_success' | 'cancelled';

export type ServiceStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export type BillingTier = 'free' | 'starter' | 'pro' | 'enterprise';

export type ApiKeyScope = 'read' | 'write' | 'admin';

export type DetectedBy = 'ai' | 'human' | 'policy';

export type HealthStatus = 'healthy' | 'unhealthy';

export type SeverityAction = 'block' | 'warn' | 'allow';

// ============================================
// Health
// ============================================

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version?: string;
}

export interface ReadyResponse {
  ready: boolean;
  dependencies: {
    database?: boolean;
    redis?: boolean;
    stripe?: boolean;
  };
}

// ============================================
// Errors
// ============================================

export interface ValidationError {
  path: Array<string | number>;
  message: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  details?: Record<string, unknown>;
  errors?: ValidationError[];
}

export interface ErrorResponse {
  error: ErrorDetails;
}

// ============================================
// Pagination
// ============================================

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ============================================
// Organizations
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

// ============================================
// Repositories
// ============================================

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  provider: RepositoryProvider;
  url?: string;
  enabled: boolean;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryRequest {
  organizationId: string;
  name: string;
  fullName: string;
  provider: RepositoryProvider;
  providerId?: string;
  url?: string;
  defaultBranch?: string;
}

export interface UpdateRepositoryRequest {
  name?: string;
  enabled?: boolean;
  defaultBranch?: string;
}

export interface RepositoryListResponse {
  repositories: Repository[];
  pagination: Pagination;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Policies
// ============================================

export interface PolicyRule {
  id: string;
  ruleId: string;
  enabled: boolean;
  severityMapping: Record<string, SeverityAction>;
  params?: Record<string, unknown>;
}

export interface PolicyPack {
  id: string;
  organizationId: string;
  repositoryId?: string | null;
  version: string;
  checksum: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyPackRequest {
  organizationId: string;
  version: string;
  repositoryId?: string | null;
  source: string;
  rules?: Array<{
    ruleId: string;
    severityMapping: Record<string, SeverityAction>;
    enabled?: boolean;
    params?: Record<string, unknown>;
  }>;
}

export interface UpdatePolicyPackRequest {
  version?: string;
  source?: string;
  rules?: PolicyRule[];
}

export interface PolicyPackListResponse {
  policies: PolicyPack[];
  pagination: Pagination;
}

export interface CreatePolicyRuleRequest {
  ruleId: string;
  severityMapping: Record<string, SeverityAction>;
  enabled?: boolean;
  params?: Record<string, unknown>;
}

export interface UpdatePolicyRuleRequest {
  severityMapping?: Record<string, SeverityAction>;
  enabled?: boolean;
  params?: Record<string, unknown>;
}

export interface PolicyRuleListResponse {
  rules: PolicyRule[];
}

export interface ValidatePolicyRequest {
  source: string;
}

export interface PolicyValidationResult {
  valid: boolean;
  message: string;
  errors?: Array<{ ruleId: string; error: string }>;
  warnings?: string[];
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  rules: PolicyRule[];
}

export interface PolicyTemplateListResponse {
  templates: PolicyTemplate[];
}

// ============================================
// Reviews
// ============================================

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: FindingStatus;
  file?: string;
  line?: number;
  confidence?: number;
  detectedBy: DetectedBy;
  remediation?: string;
  createdAt: string;
  updatedAt: string;
  modelId?: string;
  modelEpoch?: string;
  variance_score?: number;
  metadata?: Record<string, unknown>;
}

export interface ReviewSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Review {
  id: string;
  repositoryId: string;
  prNumber: number;
  prSha: string;
  prTitle?: string;
  status: ReviewStatus;
  isBlocked: boolean;
  blockedReason?: string;
  result?: Record<string, unknown>;
  issuesFound?: number;
  summary: ReviewSummary;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  repository?: {
    id: string;
    name: string;
    fullName: string;
    organizationId: string;
  };
}

export interface CreateReviewRequest {
  repositoryId: string;
  prNumber: number | string;
  prSha: string;
  prTitle?: string;
  diff?: string;
  files: Array<{
    path: string;
    content: string;
    beforeContent?: string | null;
  }>;
  config?: {
    failOnCritical?: boolean;
    failOnHigh?: boolean;
    failOnMedium?: boolean;
    failOnLow?: boolean;
    enabledRules?: string[];
    disabledRules?: string[];
    excludedPaths?: string[];
  };
}

export interface ReviewListResponse {
  data: Review[];
  pagination: Pagination;
}

// ============================================
// Waivers
// ============================================

export interface Waiver {
  id: string;
  organizationId: string;
  repositoryId?: string;
  ruleId: string;
  reason: string;
  expiresAt: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateWaiverRequest {
  organizationId: string;
  repositoryId?: string;
  ruleId: string;
  reason: string;
  expiresAt: string;
}

export interface WaiverListResponse {
  waivers: Waiver[];
  pagination: Pagination;
}

// ============================================
// Evidence
// ============================================

export interface EvidenceBundle {
  id: string;
  reviewId: string;
  findings: Finding[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface EvidenceListResponse {
  bundles: EvidenceBundle[];
  pagination: Pagination;
}

// ============================================
// Runs
// ============================================

export interface RunReviewGuardResult {
  reviewId: string;
  issuesFound: number;
  isBlocked: boolean;
  summary: ReviewSummary;
}

export interface RunTestEngineResult {
  testsGenerated: number;
  coverage?: {
    lines?: number;
    branches?: number;
    functions?: number;
  };
  meetsThreshold?: boolean;
}

export interface RunDocSyncResult {
  docId: string;
  driftDetected: boolean;
  missingEndpoints?: number;
  changedEndpoints?: number;
}

export interface Run {
  id: string;
  correlationId: string;
  status: RunStatus;
  conclusion?: RunConclusion;
  reviewGuardStatus: ServiceStatus;
  testEngineStatus: ServiceStatus;
  docSyncStatus: ServiceStatus;
  reviewGuardResult?: RunReviewGuardResult;
  testEngineResult?: RunTestEngineResult;
  docSyncResult?: RunDocSyncResult;
  aiTouchedDetected?: boolean;
  aiTouchedFiles?: Array<{
    path: string;
    confidence: number;
    methods: string[];
  }>;
  gatesPassed?: boolean;
  gatesFailed?: Array<{
    gate: string;
    reason: string;
  }>;
  startedAt: string;
  completedAt?: string;
  reviewGuardStartedAt?: string;
  reviewGuardCompletedAt?: string;
  testEngineStartedAt?: string;
  testEngineCompletedAt?: string;
  docSyncStartedAt?: string;
  docSyncCompletedAt?: string;
}

export interface CreateRunRequest {
  trigger: 'webhook' | 'manual' | 'sandbox';
  repositoryId?: string;
  sandboxId?: string;
  triggerMetadata?: {
    prNumber?: number;
    prSha?: string;
    prTitle?: string;
    prBody?: string;
    diff?: string;
    files?: Array<{
      path: string;
      content: string;
      beforeContent?: string | null;
    }>;
    userId?: string;
  };
  config?: {
    skipReviewGuard?: boolean;
    skipTestEngine?: boolean;
    skipDocSync?: boolean;
  };
}

export interface CreateSandboxRunRequest {
  sandboxId: string;
  files: Array<{
    path: string;
    content: string;
    beforeContent?: string | null;
  }>;
  config?: {
    skipReviewGuard?: boolean;
    skipTestEngine?: boolean;
    skipDocSync?: boolean;
  };
}

export interface RunListResponse {
  data: Run[];
  pagination: Pagination;
}

// ============================================
// Billing
// ============================================

export interface BillingTierInfo {
  tier: BillingTier;
  name: string;
  features?: string[];
  limits?: {
    repositories?: number;
    reviewsPerMonth?: number;
    teamMembers?: number;
  };
}

export interface BillingTierResponse {
  tier: BillingTierInfo;
  usage: {
    repositories?: number;
    reviewsThisMonth?: number;
    llmBudgetUsed?: number;
    llmBudgetTotal?: number;
  };
}

export interface CreateCheckoutRequest {
  tier: 'starter' | 'pro' | 'enterprise';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// ============================================
// Metrics
// ============================================

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricsResponse {
  metrics: {
    reviews?: MetricDataPoint[];
    findings?: MetricDataPoint[];
    gatesPassed?: MetricDataPoint[];
    gatesFailed?: MetricDataPoint[];
  };
}

// ============================================
// API Keys
// ============================================

export interface ApiKey {
  id: string;
  name: string;
  keyPreview?: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
}

export interface ApiKeyListResponse {
  keys: ApiKey[];
}

// ============================================
// Query Parameters
// ============================================

export interface ListReposQuery extends PaginationOptions {
  organizationId?: string;
}

export interface ListPoliciesQuery extends PaginationOptions {
  organizationId?: string;
  repositoryId?: string;
}

export interface ListReviewsQuery extends PaginationOptions {
  repositoryId?: string;
  prNumber?: number;
  select?: string;
}

export interface ListWaiversQuery extends PaginationOptions {
  organizationId?: string;
  repositoryId?: string;
}

export interface ListEvidenceQuery extends PaginationOptions {
  reviewId?: string;
}

export interface ListRunsQuery extends PaginationOptions {
  repositoryId?: string;
}

export interface GetMetricsQuery {
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetBillingTierQuery {
  organizationId?: string;
}
