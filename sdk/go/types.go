package readylayer

import "time"

// Provider represents a supported version control provider.
type Provider string

const (
	ProviderGitHub    Provider = "github"
	ProviderGitLab    Provider = "gitlab"
	ProviderBitbucket Provider = "bitbucket"
)

// Severity represents a finding severity level.
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
	SeverityInfo     Severity = "info"
)

// FindingStatus represents the status of a finding.
type FindingStatus string

const (
	FindingStatusOpen         FindingStatus = "open"
	FindingStatusAcknowledged FindingStatus = "acknowledged"
	FindingStatusResolved     FindingStatus = "resolved"
	FindingStatusIgnored      FindingStatus = "ignored"
)

// DetectedBy represents who detected a finding.
type DetectedBy string

const (
	DetectedByAI     DetectedBy = "ai"
	DetectedByHuman  DetectedBy = "human"
	DetectedByPolicy DetectedBy = "policy"
)

// ReviewStatus represents the status of a review.
type ReviewStatus string

const (
	ReviewStatusPending   ReviewStatus = "pending"
	ReviewStatusRunning   ReviewStatus = "running"
	ReviewStatusCompleted ReviewStatus = "completed"
	ReviewStatusFailed    ReviewStatus = "failed"
	ReviewStatusCancelled ReviewStatus = "cancelled"
)

// RunStatus represents the status of a test run.
type RunStatus string

const (
	RunStatusPending   RunStatus = "pending"
	RunStatusRunning   RunStatus = "running"
	RunStatusCompleted RunStatus = "completed"
	RunStatusFailed    RunStatus = "failed"
	RunStatusCancelled RunStatus = "cancelled"
)

// RunConclusion represents the conclusion of a test run.
type RunConclusion string

const (
	RunConclusionSuccess        RunConclusion = "success"
	RunConclusionFailure        RunConclusion = "failure"
	RunConclusionPartialSuccess RunConclusion = "partial_success"
	RunConclusionCancelled      RunConclusion = "cancelled"
)

// RunComponentStatus represents the status of a run component.
type RunComponentStatus string

const (
	RunComponentStatusPending   RunComponentStatus = "pending"
	RunComponentStatusRunning   RunComponentStatus = "running"
	RunComponentStatusSucceeded RunComponentStatus = "succeeded"
	RunComponentStatusFailed    RunComponentStatus = "failed"
	RunComponentStatusSkipped   RunComponentStatus = "skipped"
)

// BillingTierType represents a billing tier.
type BillingTierType string

const (
	BillingTierFree       BillingTierType = "free"
	BillingTierStarter    BillingTierType = "starter"
	BillingTierPro        BillingTierType = "pro"
	BillingTierEnterprise BillingTierType = "enterprise"
)

// APIScope represents an API key scope.
type APIScope string

const (
	APIScopeRead  APIScope = "read"
	APIScopeWrite APIScope = "write"
	APIScopeAdmin APIScope = "admin"
)

// SeverityMapping maps severity levels to action decisions.
type SeverityMapping map[Severity]ActionDecision

// ActionDecision represents the decision for a severity level.
type ActionDecision string

const (
	ActionBlock ActionDecision = "block"
	ActionWarn  ActionDecision = "warn"
	ActionAllow ActionDecision = "allow"
)

// TriggerType represents the type of run trigger.
type TriggerType string

const (
	TriggerWebhook TriggerType = "webhook"
	TriggerManual  TriggerType = "manual"
	TriggerSandbox TriggerType = "sandbox"
)

// HealthStatus represents the health status of the service.
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
)

// Pagination represents pagination metadata for list responses.
type Pagination struct {
	Total   int  `json:"total"`
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	HasMore bool `json:"hasMore"`
}

// Organization represents an organization in ReadyLayer.
type Organization struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// Repository represents a code repository.
type Repository struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	FullName     string        `json:"fullName"`
	Provider     Provider      `json:"provider"`
	URL          string        `json:"url,omitempty"`
	Enabled      bool          `json:"enabled"`
	Organization *Organization `json:"organization,omitempty"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
}

// CreateRepositoryRequest represents a request to create a repository.
type CreateRepositoryRequest struct {
	OrganizationID string   `json:"organizationId"`
	Name           string   `json:"name"`
	FullName       string   `json:"fullName"`
	Provider       Provider `json:"provider"`
	ProviderID     string   `json:"providerId,omitempty"`
	URL            string   `json:"url,omitempty"`
	DefaultBranch  string   `json:"defaultBranch,omitempty"`
}

// UpdateRepositoryRequest represents a request to update a repository.
type UpdateRepositoryRequest struct {
	Name          string `json:"name,omitempty"`
	Enabled       *bool  `json:"enabled,omitempty"`
	DefaultBranch string `json:"defaultBranch,omitempty"`
}

// RepositoryListResponse represents a list of repositories.
type RepositoryListResponse struct {
	Repositories []Repository `json:"repositories"`
	Pagination   Pagination   `json:"pagination"`
}

// TestConnectionResponse represents the result of a connection test.
type TestConnectionResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

// PolicyRule represents a rule within a policy pack.
type PolicyRule struct {
	ID              string          `json:"id"`
	RuleID          string          `json:"ruleId"`
	Enabled         bool            `json:"enabled"`
	SeverityMapping SeverityMapping `json:"severityMapping"`
	Params          map[string]any  `json:"params,omitempty"`
}

// PolicyPack represents a collection of policy rules.
type PolicyPack struct {
	ID             string       `json:"id"`
	OrganizationID string       `json:"organizationId"`
	RepositoryID   *string      `json:"repositoryId,omitempty"`
	Version        string       `json:"version"`
	Checksum       string       `json:"checksum"`
	Rules          []PolicyRule `json:"rules"`
	CreatedAt      time.Time    `json:"createdAt"`
	UpdatedAt      time.Time    `json:"updatedAt"`
}

// CreatePolicyPackRequest represents a request to create a policy pack.
type CreatePolicyPackRequest struct {
	OrganizationID string             `json:"organizationId"`
	RepositoryID   *string            `json:"repositoryId,omitempty"`
	Version        string             `json:"version"`
	Source         string             `json:"source"`
	Rules          []CreatePolicyRule `json:"rules,omitempty"`
}

// CreatePolicyRule represents a rule to create within a policy pack.
type CreatePolicyRule struct {
	RuleID          string          `json:"ruleId"`
	SeverityMapping SeverityMapping `json:"severityMapping,omitempty"`
	Enabled         bool            `json:"enabled"`
	Params          map[string]any  `json:"params,omitempty"`
}

// UpdatePolicyPackRequest represents a request to update a policy pack.
type UpdatePolicyPackRequest struct {
	Version string       `json:"version,omitempty"`
	Source  string       `json:"source,omitempty"`
	Rules   []PolicyRule `json:"rules,omitempty"`
}

// PolicyPackListResponse represents a list of policy packs.
type PolicyPackListResponse struct {
	Policies   []PolicyPack `json:"policies"`
	Pagination Pagination   `json:"pagination"`
}

// CreatePolicyRuleRequest represents a request to create a policy rule.
type CreatePolicyRuleRequest struct {
	RuleID          string          `json:"ruleId"`
	SeverityMapping SeverityMapping `json:"severityMapping"`
	Enabled         bool            `json:"enabled"`
	Params          map[string]any  `json:"params,omitempty"`
}

// UpdatePolicyRuleRequest represents a request to update a policy rule.
type UpdatePolicyRuleRequest struct {
	SeverityMapping SeverityMapping `json:"severityMapping,omitempty"`
	Enabled         *bool           `json:"enabled,omitempty"`
	Params          map[string]any  `json:"params,omitempty"`
}

// PolicyRuleListResponse represents a list of policy rules.
type PolicyRuleListResponse struct {
	Rules []PolicyRule `json:"rules"`
}

// ValidatePolicyRequest represents a request to validate policy syntax.
type ValidatePolicyRequest struct {
	Source string `json:"source"`
}

// PolicyValidationResult represents the result of policy validation.
type PolicyValidationResult struct {
	Valid    bool                    `json:"valid"`
	Message  string                  `json:"message"`
	Errors   []PolicyValidationError `json:"errors,omitempty"`
	Warnings []string                `json:"warnings,omitempty"`
}

// PolicyValidationError represents an error in policy validation.
type PolicyValidationError struct {
	RuleID string `json:"ruleId,omitempty"`
	Error  string `json:"error"`
}

// PolicyTemplate represents a predefined policy template.
type PolicyTemplate struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Version     string       `json:"version"`
	Rules       []PolicyRule `json:"rules"`
}

// PolicyTemplateListResponse represents a list of policy templates.
type PolicyTemplateListResponse struct {
	Templates []PolicyTemplate `json:"templates"`
}

// Finding represents a code review finding.
type Finding struct {
	ID            string         `json:"id"`
	RuleID        string         `json:"ruleId"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Severity      Severity       `json:"severity"`
	Status        FindingStatus  `json:"status"`
	File          string         `json:"file,omitempty"`
	Line          int            `json:"line,omitempty"`
	Confidence    float64        `json:"confidence,omitempty"`
	DetectedBy    DetectedBy     `json:"detectedBy"`
	Remediation   string         `json:"remediation,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	ModelID       string         `json:"modelId,omitempty"`
	ModelEpoch    string         `json:"modelEpoch,omitempty"`
	VarianceScore float64        `json:"variance_score,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

// ReviewSummary represents a summary of findings in a review.
type ReviewSummary struct {
	Total    int `json:"total"`
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
}

// Review represents a code review.
type Review struct {
	ID            string            `json:"id"`
	RepositoryID  string            `json:"repositoryId"`
	PRNumber      int               `json:"prNumber"`
	PRSha         string            `json:"prSha"`
	PRTitle       string            `json:"prTitle,omitempty"`
	Status        ReviewStatus      `json:"status"`
	IsBlocked     bool              `json:"isBlocked"`
	BlockedReason string            `json:"blockedReason,omitempty"`
	Result        map[string]any    `json:"result,omitempty"`
	IssuesFound   int               `json:"issuesFound,omitempty"`
	Summary       ReviewSummary     `json:"summary"`
	StartedAt     *time.Time        `json:"startedAt,omitempty"`
	CompletedAt   *time.Time        `json:"completedAt,omitempty"`
	CreatedAt     time.Time         `json:"createdAt"`
	UpdatedAt     time.Time         `json:"updatedAt,omitempty"`
	Repository    *ReviewRepository `json:"repository,omitempty"`
}

// ReviewRepository represents repository info within a review.
type ReviewRepository struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	FullName       string `json:"fullName"`
	OrganizationID string `json:"organizationId"`
}

// ReviewFile represents a file in a review request.
type ReviewFile struct {
	Path          string  `json:"path"`
	Content       string  `json:"content"`
	BeforeContent *string `json:"beforeContent,omitempty"`
}

// ReviewConfig represents configuration for a review.
type ReviewConfig struct {
	FailOnCritical bool     `json:"failOnCritical,omitempty"`
	FailOnHigh     bool     `json:"failOnHigh,omitempty"`
	FailOnMedium   bool     `json:"failOnMedium,omitempty"`
	FailOnLow      bool     `json:"failOnLow,omitempty"`
	EnabledRules   []string `json:"enabledRules,omitempty"`
	DisabledRules  []string `json:"disabledRules,omitempty"`
	ExcludedPaths  []string `json:"excludedPaths,omitempty"`
}

// CreateReviewRequest represents a request to create a review.
type CreateReviewRequest struct {
	RepositoryID string        `json:"repositoryId"`
	PRNumber     int           `json:"prNumber"`
	PRSha        string        `json:"prSha"`
	PRTitle      string        `json:"prTitle,omitempty"`
	Diff         string        `json:"diff,omitempty"`
	Files        []ReviewFile  `json:"files"`
	Config       *ReviewConfig `json:"config,omitempty"`
}

// ReviewListResponse represents a list of reviews.
type ReviewListResponse struct {
	Data       []Review   `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// Waiver represents a policy waiver.
type Waiver struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	RepositoryID   string    `json:"repositoryId,omitempty"`
	RuleID         string    `json:"ruleId"`
	Reason         string    `json:"reason"`
	ExpiresAt      time.Time `json:"expiresAt"`
	CreatedBy      string    `json:"createdBy,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// CreateWaiverRequest represents a request to create a waiver.
type CreateWaiverRequest struct {
	OrganizationID string    `json:"organizationId"`
	RepositoryID   string    `json:"repositoryId,omitempty"`
	RuleID         string    `json:"ruleId"`
	Reason         string    `json:"reason"`
	ExpiresAt      time.Time `json:"expiresAt"`
}

// WaiverListResponse represents a list of waivers.
type WaiverListResponse struct {
	Waivers    []Waiver   `json:"waivers"`
	Pagination Pagination `json:"pagination"`
}

// EvidenceBundle represents a collection of evidence from a review.
type EvidenceBundle struct {
	ID        string         `json:"id"`
	ReviewID  string         `json:"reviewId"`
	Findings  []Finding      `json:"findings"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
}

// EvidenceListResponse represents a list of evidence bundles.
type EvidenceListResponse struct {
	Bundles    []EvidenceBundle `json:"bundles"`
	Pagination Pagination       `json:"pagination"`
}

// Run represents a test run.
type Run struct {
	ID                     string             `json:"id"`
	CorrelationID          string             `json:"correlationId"`
	Status                 RunStatus          `json:"status"`
	Conclusion             RunConclusion      `json:"conclusion,omitempty"`
	ReviewGuardStatus      RunComponentStatus `json:"reviewGuardStatus"`
	TestEngineStatus       RunComponentStatus `json:"testEngineStatus"`
	DocSyncStatus          RunComponentStatus `json:"docSyncStatus"`
	ReviewGuardResult      *ReviewGuardResult `json:"reviewGuardResult,omitempty"`
	TestEngineResult       *TestEngineResult  `json:"testEngineResult,omitempty"`
	DocSyncResult          *DocSyncResult     `json:"docSyncResult,omitempty"`
	AITouchedDetected      bool               `json:"aiTouchedDetected,omitempty"`
	AITouchedFiles         []AITouchedFile    `json:"aiTouchedFiles,omitempty"`
	GatesPassed            bool               `json:"gatesPassed,omitempty"`
	GatesFailed            []FailedGate       `json:"gatesFailed,omitempty"`
	StartedAt              time.Time          `json:"startedAt"`
	CompletedAt            *time.Time         `json:"completedAt,omitempty"`
	ReviewGuardStartedAt   *time.Time         `json:"reviewGuardStartedAt,omitempty"`
	ReviewGuardCompletedAt *time.Time         `json:"reviewGuardCompletedAt,omitempty"`
	TestEngineStartedAt    *time.Time         `json:"testEngineStartedAt,omitempty"`
	TestEngineCompletedAt  *time.Time         `json:"testEngineCompletedAt,omitempty"`
	DocSyncStartedAt       *time.Time         `json:"docSyncStartedAt,omitempty"`
	DocSyncCompletedAt     *time.Time         `json:"docSyncCompletedAt,omitempty"`
}

// ReviewGuardResult represents the result from the review guard.
type ReviewGuardResult struct {
	ReviewID    string        `json:"reviewId"`
	IssuesFound int           `json:"issuesFound"`
	IsBlocked   bool          `json:"isBlocked"`
	Summary     ReviewSummary `json:"summary"`
}

// TestEngineResult represents the result from the test engine.
type TestEngineResult struct {
	TestsGenerated int       `json:"testsGenerated"`
	Coverage       *Coverage `json:"coverage,omitempty"`
	MeetsThreshold bool      `json:"meetsThreshold"`
}

// Coverage represents test coverage metrics.
type Coverage struct {
	Lines     float64 `json:"lines,omitempty"`
	Branches  float64 `json:"branches,omitempty"`
	Functions float64 `json:"functions,omitempty"`
}

// DocSyncResult represents the result from documentation sync.
type DocSyncResult struct {
	DocID            string `json:"docId"`
	DriftDetected    bool   `json:"driftDetected"`
	MissingEndpoints int    `json:"missingEndpoints"`
	ChangedEndpoints int    `json:"changedEndpoints"`
}

// AITouchedFile represents a file detected as AI-modified.
type AITouchedFile struct {
	Path       string   `json:"path"`
	Confidence float64  `json:"confidence"`
	Methods    []string `json:"methods,omitempty"`
}

// FailedGate represents a gate that failed during the run.
type FailedGate struct {
	Gate   string `json:"gate"`
	Reason string `json:"reason"`
}

// TriggerMetadata represents metadata about what triggered a run.
type TriggerMetadata struct {
	PRNumber int          `json:"prNumber,omitempty"`
	PRSha    string       `json:"prSha,omitempty"`
	PRTitle  string       `json:"prTitle,omitempty"`
	PRBody   string       `json:"prBody,omitempty"`
	Diff     string       `json:"diff,omitempty"`
	Files    []ReviewFile `json:"files,omitempty"`
	UserID   string       `json:"userId,omitempty"`
}

// RunConfig represents configuration for a run.
type RunConfig struct {
	SkipReviewGuard bool `json:"skipReviewGuard,omitempty"`
	SkipTestEngine  bool `json:"skipTestEngine,omitempty"`
	SkipDocSync     bool `json:"skipDocSync,omitempty"`
}

// CreateRunRequest represents a request to create a test run.
type CreateRunRequest struct {
	RepositoryID    string           `json:"repositoryId,omitempty"`
	SandboxID       string           `json:"sandboxId,omitempty"`
	Trigger         TriggerType      `json:"trigger"`
	TriggerMetadata *TriggerMetadata `json:"triggerMetadata,omitempty"`
	Config          *RunConfig       `json:"config,omitempty"`
}

// CreateSandboxRunRequest represents a request to create a sandbox run.
type CreateSandboxRunRequest struct {
	SandboxID string       `json:"sandboxId"`
	Files     []ReviewFile `json:"files"`
	Config    *RunConfig   `json:"config,omitempty"`
}

// RunListResponse represents a list of test runs.
type RunListResponse struct {
	Data       []Run      `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// BillingTier represents a billing tier with features and limits.
type BillingTier struct {
	Tier     string   `json:"tier"`
	Name     string   `json:"name"`
	Features []string `json:"features,omitempty"`
	Limits   *Limits  `json:"limits,omitempty"`
}

// Limits represents the limits for a billing tier.
type Limits struct {
	Repositories    int `json:"repositories,omitempty"`
	ReviewsPerMonth int `json:"reviewsPerMonth,omitempty"`
	TeamMembers     int `json:"teamMembers,omitempty"`
}

// BillingUsage represents current billing usage.
type BillingUsage struct {
	Repositories     int     `json:"repositories"`
	ReviewsThisMonth int     `json:"reviewsThisMonth"`
	LLMBudgetUsed    float64 `json:"llmBudgetUsed"`
	LLMBudgetTotal   float64 `json:"llmBudgetTotal"`
}

// BillingTierResponse represents the current billing tier and usage.
type BillingTierResponse struct {
	Tier  BillingTier  `json:"tier"`
	Usage BillingUsage `json:"usage"`
}

// CreateCheckoutRequest represents a request to create a checkout session.
type CreateCheckoutRequest struct {
	Tier       string `json:"tier"`
	SuccessURL string `json:"successUrl"`
	CancelURL  string `json:"cancelUrl"`
}

// CheckoutSessionResponse represents a checkout session response.
type CheckoutSessionResponse struct {
	SessionID string `json:"sessionId"`
	URL       string `json:"url"`
}

// MetricDataPoint represents a single metric data point.
type MetricDataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// MetricsResponse represents usage metrics.
type MetricsResponse struct {
	Metrics struct {
		Reviews     []MetricDataPoint `json:"reviews,omitempty"`
		Findings    []MetricDataPoint `json:"findings,omitempty"`
		GatesPassed []MetricDataPoint `json:"gatesPassed,omitempty"`
		GatesFailed []MetricDataPoint `json:"gatesFailed,omitempty"`
	} `json:"metrics"`
}

// APIKey represents an API key.
type APIKey struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	KeyPreview string     `json:"keyPreview,omitempty"`
	Scopes     []APIScope `json:"scopes"`
	ExpiresAt  *time.Time `json:"expiresAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
}

// CreateApiKeyRequest represents a request to create an API key.
type CreateApiKeyRequest struct {
	Name      string     `json:"name"`
	Scopes    []APIScope `json:"scopes"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// ApiKeyListResponse represents a list of API keys.
type ApiKeyListResponse struct {
	Keys []APIKey `json:"keys"`
}

// HealthResponse represents a health check response.
type HealthResponse struct {
	Status    HealthStatus `json:"status"`
	Timestamp time.Time    `json:"timestamp"`
	Version   string       `json:"version,omitempty"`
}

// ReadyResponse represents a readiness check response.
type ReadyResponse struct {
	Ready        bool         `json:"ready"`
	Dependencies Dependencies `json:"dependencies"`
}

// Dependencies represents the status of service dependencies.
type Dependencies struct {
	Database bool `json:"database,omitempty"`
	Redis    bool `json:"redis,omitempty"`
	Stripe   bool `json:"stripe,omitempty"`
}

// ListOptions represents common options for list operations.
type ListOptions struct {
	Limit  int    `url:"limit,omitempty"`
	Offset int    `url:"offset,omitempty"`
	Select string `url:"select,omitempty"`
}

// RepositoryListOptions represents options for listing repositories.
type RepositoryListOptions struct {
	ListOptions
	OrganizationID string `url:"organizationId,omitempty"`
}

// PolicyListOptions represents options for listing policies.
type PolicyListOptions struct {
	ListOptions
	OrganizationID string `url:"organizationId,omitempty"`
	RepositoryID   string `url:"repositoryId,omitempty"`
}

// ReviewListOptions represents options for listing reviews.
type ReviewListOptions struct {
	ListOptions
	RepositoryID string `url:"repositoryId,omitempty"`
	PRNumber     int    `url:"prNumber,omitempty"`
}

// WaiverListOptions represents options for listing waivers.
type WaiverListOptions struct {
	ListOptions
	OrganizationID string `url:"organizationId,omitempty"`
	RepositoryID   string `url:"repositoryId,omitempty"`
}

// EvidenceListOptions represents options for listing evidence.
type EvidenceListOptions struct {
	ListOptions
	ReviewID string `url:"reviewId,omitempty"`
}

// RunListOptions represents options for listing runs.
type RunListOptions struct {
	ListOptions
	RepositoryID string `url:"repositoryId,omitempty"`
}

// MetricsOptions represents options for fetching metrics.
type MetricsOptions struct {
	OrganizationID string    `url:"organizationId,omitempty"`
	StartDate      time.Time `url:"startDate,omitempty"`
	EndDate        time.Time `url:"endDate,omitempty"`
}
