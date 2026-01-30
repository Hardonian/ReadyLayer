"""Pydantic models for the ReadyLayer API.

This module contains all the type definitions used by the ReadyLayer SDK,
generated from the OpenAPI specification.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ============================================================================
# Enums
# ============================================================================


class Provider(str, Enum):
    """Repository provider types."""

    GITHUB = "github"
    GITLAB = "gitlab"
    BITBUCKET = "bitbucket"


class HealthStatus(str, Enum):
    """Health check status values."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"


class ReviewStatus(str, Enum):
    """Review status values."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunStatus(str, Enum):
    """Run status values."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunConclusion(str, Enum):
    """Run conclusion values."""

    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL_SUCCESS = "partial_success"
    CANCELLED = "cancelled"


class GateStatus(str, Enum):
    """Gate status values for run components."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class Severity(str, Enum):
    """Finding severity levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingStatus(str, Enum):
    """Finding status values."""

    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class DetectedBy(str, Enum):
    """Detection source for findings."""

    AI = "ai"
    HUMAN = "human"
    POLICY = "policy"


class BillingTierName(str, Enum):
    """Billing tier names."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Action(str, Enum):
    """Policy action types."""

    BLOCK = "block"
    WARN = "warn"
    ALLOW = "allow"


class ApiKeyScope(str, Enum):
    """API key scope types."""

    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class TriggerType(str, Enum):
    """Run trigger types."""

    WEBHOOK = "webhook"
    MANUAL = "manual"
    SANDBOX = "sandbox"


# ============================================================================
# Base Models
# ============================================================================


class BaseAPIModel(BaseModel):
    """Base model for all API types."""

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        use_enum_values=True,
        extra="ignore",
    )


# ============================================================================
# Common Models
# ============================================================================


class Pagination(BaseAPIModel):
    """Pagination metadata for list responses."""

    total: int = Field(..., description="Total number of items available")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Number of items skipped")
    has_more: bool = Field(..., alias="hasMore", description="Whether more items are available")


class Organization(BaseAPIModel):
    """Organization information."""

    id: str = Field(..., description="Organization ID")
    name: str = Field(..., description="Organization name")
    slug: str = Field(..., description="Organization slug")


class ErrorDetail(BaseAPIModel):
    """Error detail with path and message."""

    path: List[Union[str, int]] = Field(default_factory=list, description="Error path")
    message: str = Field(..., description="Error message")


class ErrorInfo(BaseAPIModel):
    """Error information returned by the API."""

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Error context")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
    errors: Optional[List[ErrorDetail]] = Field(default=None, description="Validation errors")


# ============================================================================
# Health Models
# ============================================================================


class HealthResponse(BaseAPIModel):
    """Health check response."""

    status: HealthStatus = Field(..., description="Health status")
    timestamp: datetime = Field(..., description="Response timestamp")
    version: Optional[str] = Field(default=None, description="API version")


class ReadyResponse(BaseAPIModel):
    """Readiness check response."""

    ready: bool = Field(..., description="Whether the service is ready")
    dependencies: Dict[str, bool] = Field(
        default_factory=dict, description="Dependency status (database, redis, stripe)"
    )


# ============================================================================
# Repository Models
# ============================================================================


class Repository(BaseAPIModel):
    """Repository information."""

    id: str = Field(..., description="Repository ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., alias="fullName", description="Full repository name (owner/repo)")
    provider: Provider = Field(..., description="Repository provider")
    url: Optional[str] = Field(default=None, description="Repository URL")
    enabled: bool = Field(..., description="Whether the repository is enabled")
    organization: Optional[Organization] = Field(default=None, description="Organization info")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")


class CreateRepositoryRequest(BaseAPIModel):
    """Request to create a repository."""

    organization_id: str = Field(..., alias="organizationId", description="Organization ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., alias="fullName", description="Full repository name (owner/repo)")
    provider: Provider = Field(..., description="Repository provider")
    provider_id: Optional[str] = Field(default=None, alias="providerId", description="Provider ID")
    url: Optional[str] = Field(default=None, description="Repository URL")
    default_branch: Optional[str] = Field(
        default=None, alias="defaultBranch", description="Default branch name"
    )


class UpdateRepositoryRequest(BaseAPIModel):
    """Request to update a repository."""

    name: Optional[str] = Field(default=None, description="Repository name")
    enabled: Optional[bool] = Field(default=None, description="Whether the repository is enabled")
    default_branch: Optional[str] = Field(
        default=None, alias="defaultBranch", description="Default branch name"
    )


class RepositoryListResponse(BaseAPIModel):
    """Response containing a list of repositories."""

    repositories: List[Repository] = Field(..., description="List of repositories")
    pagination: Pagination = Field(..., description="Pagination metadata")


class TestConnectionResponse(BaseAPIModel):
    """Repository connection test response."""

    success: bool = Field(..., description="Whether the connection test succeeded")
    message: str = Field(..., description="Test result message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional details")


# ============================================================================
# Policy Models
# ============================================================================


class SeverityMapping(BaseAPIModel):
    """Mapping of severity levels to actions."""

    model_config = ConfigDict(extra="allow")

    @field_validator("__dict__", mode="before")
    @classmethod
    def validate_severity_mapping(cls, v: Any) -> Any:
        """Validate that all values are valid actions."""
        if isinstance(v, dict):
            for key, value in v.items():
                if value not in ["block", "warn", "allow"]:
                    raise ValueError(f"Invalid action '{value}' for severity '{key}'")
        return v


class PolicyRule(BaseAPIModel):
    """Policy rule definition."""

    id: str = Field(..., description="Rule ID")
    rule_id: str = Field(..., alias="ruleId", description="Rule identifier")
    enabled: bool = Field(..., description="Whether the rule is enabled")
    severity_mapping: Dict[str, Action] = Field(
        ..., alias="severityMapping", description="Severity to action mapping"
    )
    params: Optional[Dict[str, Any]] = Field(default=None, description="Rule parameters")


class PolicyPack(BaseAPIModel):
    """Policy pack definition."""

    id: str = Field(..., description="Policy pack ID")
    organization_id: str = Field(..., alias="organizationId", description="Organization ID")
    repository_id: Optional[str] = Field(
        default=None, alias="repositoryId", description="Repository ID (null for org-level)"
    )
    version: str = Field(
        ..., pattern=r"^\d+\.\d+\.\d+$", description="Semantic version (e.g., 1.0.0)"
    )
    checksum: str = Field(..., description="Policy pack checksum")
    rules: List[PolicyRule] = Field(..., description="List of policy rules")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")


class PolicyRuleInput(BaseAPIModel):
    """Input for creating a policy rule."""

    rule_id: str = Field(..., alias="ruleId", description="Rule identifier")
    severity_mapping: Dict[str, Action] = Field(
        ..., alias="severityMapping", description="Severity to action mapping"
    )
    enabled: bool = Field(default=True, description="Whether the rule is enabled")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Rule parameters")


class CreatePolicyPackRequest(BaseAPIModel):
    """Request to create a policy pack."""

    organization_id: str = Field(..., alias="organizationId", description="Organization ID")
    repository_id: Optional[str] = Field(
        default=None, alias="repositoryId", description="Repository ID (null for org-level)"
    )
    version: str = Field(
        ..., pattern=r"^\d+\.\d+\.\d+$", description="Semantic version (e.g., 1.0.0)"
    )
    source: str = Field(..., description="Policy source code (YAML or JSON)")
    rules: Optional[List[PolicyRuleInput]] = Field(
        default=None, description="List of policy rules"
    )


class UpdatePolicyPackRequest(BaseAPIModel):
    """Request to update a policy pack."""

    version: Optional[str] = Field(
        default=None, pattern=r"^\d+\.\d+\.\d+$", description="Semantic version (e.g., 1.0.0)"
    )
    source: Optional[str] = Field(default=None, description="Policy source code (YAML or JSON)")
    rules: Optional[List[PolicyRule]] = Field(default=None, description="List of policy rules")


class PolicyPackListResponse(BaseAPIModel):
    """Response containing a list of policy packs."""

    policies: List[PolicyPack] = Field(..., description="List of policy packs")
    pagination: Pagination = Field(..., description="Pagination metadata")


class CreatePolicyRuleRequest(BaseAPIModel):
    """Request to create a policy rule."""

    rule_id: str = Field(..., alias="ruleId", description="Rule identifier")
    severity_mapping: Dict[str, Action] = Field(
        ..., alias="severityMapping", description="Severity to action mapping"
    )
    enabled: bool = Field(default=True, description="Whether the rule is enabled")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Rule parameters")


class UpdatePolicyRuleRequest(BaseAPIModel):
    """Request to update a policy rule."""

    severity_mapping: Optional[Dict[str, Action]] = Field(
        default=None, alias="severityMapping", description="Severity to action mapping"
    )
    enabled: Optional[bool] = Field(default=None, description="Whether the rule is enabled")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Rule parameters")


class PolicyRuleListResponse(BaseAPIModel):
    """Response containing a list of policy rules."""

    rules: List[PolicyRule] = Field(..., description="List of policy rules")


class ValidatePolicyRequest(BaseAPIModel):
    """Request to validate policy syntax."""

    source: str = Field(..., description="Policy YAML or JSON source")


class PolicyValidationError(BaseAPIModel):
    """Policy validation error."""

    rule_id: str = Field(..., alias="ruleId", description="Rule ID that failed validation")
    error: str = Field(..., description="Error message")


class PolicyValidationResult(BaseAPIModel):
    """Result of policy validation."""

    valid: bool = Field(..., description="Whether the policy is valid")
    message: str = Field(..., description="Validation message")
    errors: Optional[List[PolicyValidationError]] = Field(
        default=None, description="List of validation errors"
    )
    warnings: Optional[List[str]] = Field(default=None, description="List of warnings")


class PolicyTemplate(BaseAPIModel):
    """Policy template definition."""

    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(default=None, description="Template description")
    version: str = Field(..., description="Template version")
    rules: List[PolicyRule] = Field(..., description="List of template rules")


class PolicyTemplateListResponse(BaseAPIModel):
    """Response containing a list of policy templates."""

    templates: List[PolicyTemplate] = Field(..., description="List of policy templates")


# ============================================================================
# Review Models
# ============================================================================


class ReviewSummary(BaseAPIModel):
    """Summary of review findings."""

    total: int = Field(..., description="Total number of findings")
    critical: int = Field(..., description="Number of critical findings")
    high: int = Field(..., description="Number of high findings")
    medium: int = Field(..., description="Number of medium findings")
    low: int = Field(..., description="Number of low findings")


class ReviewRepository(BaseAPIModel):
    """Repository information embedded in review."""

    id: str = Field(..., description="Repository ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., alias="fullName", description="Full repository name")
    organization_id: str = Field(..., alias="organizationId", description="Organization ID")


class Review(BaseAPIModel):
    """Code review information."""

    id: str = Field(..., description="Review ID")
    repository_id: str = Field(..., alias="repositoryId", description="Repository ID")
    pr_number: int = Field(..., alias="prNumber", description="Pull request number")
    pr_sha: str = Field(..., alias="prSha", description="Pull request SHA")
    pr_title: Optional[str] = Field(default=None, alias="prTitle", description="Pull request title")
    status: ReviewStatus = Field(..., description="Review status")
    is_blocked: bool = Field(..., alias="isBlocked", description="Whether the PR is blocked")
    blocked_reason: Optional[str] = Field(
        default=None, alias="blockedReason", description="Reason for blocking"
    )
    result: Optional[Dict[str, Any]] = Field(default=None, description="Review result details")
    issues_found: Optional[int] = Field(
        default=None, alias="issuesFound", description="Number of issues found"
    )
    summary: ReviewSummary = Field(..., description="Review summary")
    started_at: Optional[datetime] = Field(
        default=None, alias="startedAt", description="When the review started"
    )
    completed_at: Optional[datetime] = Field(
        default=None, alias="completedAt", description="When the review completed"
    )
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: Optional[datetime] = Field(
        default=None, alias="updatedAt", description="Last update timestamp"
    )
    repository: Optional[ReviewRepository] = Field(default=None, description="Repository info")


class ReviewFile(BaseAPIModel):
    """File included in a review."""

    path: str = Field(..., description="File path")
    content: str = Field(..., description="File content")
    before_content: Optional[str] = Field(
        default=None, alias="beforeContent", description="Previous file content"
    )


class ReviewConfig(BaseAPIModel):
    """Configuration for a review."""

    fail_on_critical: Optional[bool] = Field(
        default=None, alias="failOnCritical", description="Fail on critical findings"
    )
    fail_on_high: Optional[bool] = Field(
        default=None, alias="failOnHigh", description="Fail on high findings"
    )
    fail_on_medium: Optional[bool] = Field(
        default=None, alias="failOnMedium", description="Fail on medium findings"
    )
    fail_on_low: Optional[bool] = Field(
        default=None, alias="failOnLow", description="Fail on low findings"
    )
    enabled_rules: Optional[List[str]] = Field(
        default=None, alias="enabledRules", description="List of enabled rule IDs"
    )
    disabled_rules: Optional[List[str]] = Field(
        default=None, alias="disabledRules", description="List of disabled rule IDs"
    )
    excluded_paths: Optional[List[str]] = Field(
        default=None, alias="excludedPaths", description="List of excluded file paths"
    )


class CreateReviewRequest(BaseAPIModel):
    """Request to create a review."""

    repository_id: str = Field(..., alias="repositoryId", description="Repository ID")
    pr_number: Union[int, str] = Field(..., alias="prNumber", description="Pull request number")
    pr_sha: str = Field(..., alias="prSha", description="Pull request SHA")
    pr_title: Optional[str] = Field(default=None, alias="prTitle", description="Pull request title")
    diff: Optional[str] = Field(default=None, description="PR diff content")
    files: List[ReviewFile] = Field(..., description="Files to review")
    config: Optional[ReviewConfig] = Field(default=None, description="Review configuration")


class ReviewListResponse(BaseAPIModel):
    """Response containing a list of reviews."""

    data: List[Review] = Field(..., description="List of reviews")
    pagination: Pagination = Field(..., description="Pagination metadata")


# ============================================================================
# Finding Models
# ============================================================================


class Finding(BaseAPIModel):
    """Code finding/issue."""

    id: str = Field(..., description="Finding ID")
    rule_id: str = Field(..., alias="ruleId", description="Rule ID that triggered this finding")
    title: str = Field(..., description="Finding title")
    description: str = Field(..., description="Finding description")
    severity: Severity = Field(..., description="Finding severity")
    status: FindingStatus = Field(..., description="Finding status")
    file: Optional[str] = Field(default=None, description="File path")
    line: Optional[int] = Field(default=None, description="Line number")
    confidence: Optional[float] = Field(
        default=None, ge=0, le=1, description="Confidence score (0-1)"
    )
    detected_by: DetectedBy = Field(..., alias="detectedBy", description="Detection source")
    remediation: Optional[str] = Field(default=None, description="Remediation suggestion")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")
    model_id: Optional[str] = Field(default=None, alias="modelId", description="Model ID")
    model_epoch: Optional[str] = Field(default=None, alias="modelEpoch", description="Model epoch")
    variance_score: Optional[float] = Field(
        default=None, alias="variance_score", ge=0, le=1, description="Variance score (0-1)"
    )
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


# ============================================================================
# Waiver Models
# ============================================================================


class Waiver(BaseAPIModel):
    """Policy waiver."""

    id: str = Field(..., description="Waiver ID")
    organization_id: str = Field(..., alias="organizationId", description="Organization ID")
    repository_id: Optional[str] = Field(
        default=None, alias="repositoryId", description="Repository ID"
    )
    rule_id: str = Field(..., alias="ruleId", description="Rule ID being waived")
    reason: str = Field(..., description="Reason for the waiver")
    expires_at: datetime = Field(..., alias="expiresAt", description="Waiver expiration timestamp")
    created_by: Optional[str] = Field(default=None, alias="createdBy", description="User who created the waiver")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")


class CreateWaiverRequest(BaseAPIModel):
    """Request to create a waiver."""

    organization_id: str = Field(..., alias="organizationId", description="Organization ID")
    repository_id: Optional[str] = Field(
        default=None, alias="repositoryId", description="Repository ID"
    )
    rule_id: str = Field(..., alias="ruleId", description="Rule ID to waive")
    reason: str = Field(..., description="Reason for the waiver")
    expires_at: datetime = Field(..., alias="expiresAt", description="Waiver expiration timestamp")


class WaiverListResponse(BaseAPIModel):
    """Response containing a list of waivers."""

    waivers: List[Waiver] = Field(..., description="List of waivers")
    pagination: Pagination = Field(..., description="Pagination metadata")


# ============================================================================
# Evidence Models
# ============================================================================


class EvidenceBundle(BaseAPIModel):
    """Evidence bundle containing findings."""

    id: str = Field(..., description="Bundle ID")
    review_id: str = Field(..., alias="reviewId", description="Review ID")
    findings: List[Finding] = Field(..., description="List of findings")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")


class EvidenceListResponse(BaseAPIModel):
    """Response containing a list of evidence bundles."""

    bundles: List[EvidenceBundle] = Field(..., description="List of evidence bundles")
    pagination: Pagination = Field(..., description="Pagination metadata")


# ============================================================================
# Run Models
# ============================================================================


class ReviewGuardResult(BaseAPIModel):
    """Review Guard result from a run."""

    review_id: Optional[str] = Field(default=None, alias="reviewId", description="Review ID")
    issues_found: Optional[int] = Field(
        default=None, alias="issuesFound", description="Number of issues found"
    )
    is_blocked: Optional[bool] = Field(
        default=None, alias="isBlocked", description="Whether the PR is blocked"
    )
    summary: Optional[ReviewSummary] = Field(default=None, description="Review summary")


class TestEngineCoverage(BaseAPIModel):
    """Test coverage metrics."""

    lines: Optional[float] = Field(default=None, description="Line coverage percentage")
    branches: Optional[float] = Field(default=None, description="Branch coverage percentage")
    functions: Optional[float] = Field(default=None, description="Function coverage percentage")


class TestEngineResult(BaseAPIModel):
    """Test Engine result from a run."""

    tests_generated: Optional[int] = Field(
        default=None, alias="testsGenerated", description="Number of tests generated"
    )
    coverage: Optional[TestEngineCoverage] = Field(default=None, description="Coverage metrics")
    meets_threshold: Optional[bool] = Field(
        default=None, alias="meetsThreshold", description="Whether coverage meets threshold"
    )


class DocSyncResult(BaseAPIModel):
    """Documentation sync result from a run."""

    doc_id: Optional[str] = Field(default=None, alias="docId", description="Documentation ID")
    drift_detected: Optional[bool] = Field(
        default=None, alias="driftDetected", description="Whether documentation drift was detected"
    )
    missing_endpoints: Optional[int] = Field(
        default=None, alias="missingEndpoints", description="Number of missing endpoints"
    )
    changed_endpoints: Optional[int] = Field(
        default=None, alias="changedEndpoints", description="Number of changed endpoints"
    )


class AITouchedFile(BaseAPIModel):
    """File touched by AI."""

    path: str = Field(..., description="File path")
    confidence: Optional[float] = Field(default=None, description="Confidence score (0-1)")
    methods: Optional[List[str]] = Field(default=None, description="Methods touched")


class FailedGate(BaseAPIModel):
    """Information about a failed gate."""

    gate: str = Field(..., description="Gate name")
    reason: str = Field(..., description="Failure reason")


class Run(BaseAPIModel):
    """Test run information."""

    id: str = Field(..., description="Run ID")
    correlation_id: str = Field(..., alias="correlationId", description="Correlation ID")
    status: RunStatus = Field(..., description="Run status")
    conclusion: Optional[RunConclusion] = Field(default=None, description="Run conclusion")
    review_guard_status: GateStatus = Field(
        ..., alias="reviewGuardStatus", description="Review Guard status"
    )
    test_engine_status: GateStatus = Field(
        ..., alias="testEngineStatus", description="Test Engine status"
    )
    doc_sync_status: GateStatus = Field(..., alias="docSyncStatus", description="Doc Sync status")
    review_guard_result: Optional[ReviewGuardResult] = Field(
        default=None, alias="reviewGuardResult", description="Review Guard result"
    )
    test_engine_result: Optional[TestEngineResult] = Field(
        default=None, alias="testEngineResult", description="Test Engine result"
    )
    doc_sync_result: Optional[DocSyncResult] = Field(
        default=None, alias="docSyncResult", description="Doc Sync result"
    )
    ai_touched_detected: Optional[bool] = Field(
        default=None, alias="aiTouchedDetected", description="Whether AI-touched files were detected"
    )
    ai_touched_files: Optional[List[AITouchedFile]] = Field(
        default=None, alias="aiTouchedFiles", description="AI-touched files"
    )
    gates_passed: Optional[bool] = Field(
        default=None, alias="gatesPassed", description="Whether all gates passed"
    )
    gates_failed: Optional[List[FailedGate]] = Field(
        default=None, alias="gatesFailed", description="Failed gates"
    )
    started_at: datetime = Field(..., alias="startedAt", description="When the run started")
    completed_at: Optional[datetime] = Field(
        default=None, alias="completedAt", description="When the run completed"
    )
    review_guard_started_at: Optional[datetime] = Field(
        default=None, alias="reviewGuardStartedAt", description="When Review Guard started"
    )
    review_guard_completed_at: Optional[datetime] = Field(
        default=None, alias="reviewGuardCompletedAt", description="When Review Guard completed"
    )
    test_engine_started_at: Optional[datetime] = Field(
        default=None, alias="testEngineStartedAt", description="When Test Engine started"
    )
    test_engine_completed_at: Optional[datetime] = Field(
        default=None, alias="testEngineCompletedAt", description="When Test Engine completed"
    )
    doc_sync_started_at: Optional[datetime] = Field(
        default=None, alias="docSyncStartedAt", description="When Doc Sync started"
    )
    doc_sync_completed_at: Optional[datetime] = Field(
        default=None, alias="docSyncCompletedAt", description="When Doc Sync completed"
    )


class TriggerMetadata(BaseAPIModel):
    """Metadata about what triggered a run."""

    pr_number: Optional[int] = Field(default=None, alias="prNumber", description="PR number")
    pr_sha: Optional[str] = Field(default=None, alias="prSha", description="PR SHA")
    pr_title: Optional[str] = Field(default=None, alias="prTitle", description="PR title")
    pr_body: Optional[str] = Field(default=None, alias="prBody", description="PR body")
    diff: Optional[str] = Field(default=None, description="PR diff")
    files: Optional[List[ReviewFile]] = Field(default=None, description="Files in the PR")
    user_id: Optional[str] = Field(default=None, alias="userId", description="User ID")


class RunConfig(BaseAPIModel):
    """Configuration for a run."""

    skip_review_guard: Optional[bool] = Field(
        default=None, alias="skipReviewGuard", description="Skip Review Guard"
    )
    skip_test_engine: Optional[bool] = Field(
        default=None, alias="skipTestEngine", description="Skip Test Engine"
    )
    skip_doc_sync: Optional[bool] = Field(
        default=None, alias="skipDocSync", description="Skip Doc Sync"
    )


class CreateRunRequest(BaseAPIModel):
    """Request to create a run."""

    repository_id: Optional[str] = Field(default=None, alias="repositoryId", description="Repository ID")
    sandbox_id: Optional[str] = Field(default=None, alias="sandboxId", description="Sandbox ID")
    trigger: TriggerType = Field(..., description="Trigger type")
    trigger_metadata: Optional[TriggerMetadata] = Field(
        default=None, alias="triggerMetadata", description="Trigger metadata"
    )
    config: Optional[RunConfig] = Field(default=None, description="Run configuration")


class CreateSandboxRunRequest(BaseAPIModel):
    """Request to create a sandbox run."""

    sandbox_id: str = Field(..., alias="sandboxId", description="Sandbox ID")
    files: List[ReviewFile] = Field(..., description="Files to process")
    config: Optional[RunConfig] = Field(default=None, description="Run configuration")


class RunListResponse(BaseAPIModel):
    """Response containing a list of runs."""

    data: List[Run] = Field(..., description="List of runs")
    pagination: Pagination = Field(..., description="Pagination metadata")


# ============================================================================
# Billing Models
# ============================================================================


class BillingTierLimits(BaseAPIModel):
    """Billing tier limits."""

    repositories: Optional[int] = Field(default=None, description="Repository limit")
    reviews_per_month: Optional[int] = Field(
        default=None, alias="reviewsPerMonth", description="Reviews per month limit"
    )
    team_members: Optional[int] = Field(
        default=None, alias="teamMembers", description="Team member limit"
    )


class BillingTier(BaseAPIModel):
    """Billing tier information."""

    tier: BillingTierName = Field(..., description="Tier name")
    name: str = Field(..., description="Display name")
    features: Optional[List[str]] = Field(default=None, description="List of features")
    limits: Optional[BillingTierLimits] = Field(default=None, description="Tier limits")


class BillingUsage(BaseAPIModel):
    """Current billing usage."""

    repositories: Optional[int] = Field(default=None, description="Number of repositories")
    reviews_this_month: Optional[int] = Field(
        default=None, alias="reviewsThisMonth", description="Reviews this month"
    )
    llm_budget_used: Optional[float] = Field(
        default=None, alias="llmBudgetUsed", description="LLM budget used"
    )
    llm_budget_total: Optional[float] = Field(
        default=None, alias="llmBudgetTotal", description="LLM budget total"
    )


class BillingTierResponse(BaseAPIModel):
    """Response containing billing tier and usage."""

    tier: BillingTier = Field(..., description="Current billing tier")
    usage: BillingUsage = Field(..., description="Current usage")


class CreateCheckoutRequest(BaseAPIModel):
    """Request to create a checkout session."""

    tier: Literal["starter", "pro", "enterprise"] = Field(..., description="Tier to subscribe to")
    success_url: str = Field(..., alias="successUrl", description="Success redirect URL")
    cancel_url: str = Field(..., alias="cancelUrl", description="Cancel redirect URL")


class CheckoutSessionResponse(BaseAPIModel):
    """Response containing checkout session."""

    session_id: str = Field(..., alias="sessionId", description="Stripe session ID")
    url: str = Field(..., description="Checkout URL")


# ============================================================================
# Metrics Models
# ============================================================================


class MetricDataPoint(BaseAPIModel):
    """Single metric data point."""

    timestamp: datetime = Field(..., description="Timestamp")
    value: float = Field(..., description="Metric value")


class MetricsData(BaseAPIModel):
    """Collection of metrics."""

    reviews: Optional[List[MetricDataPoint]] = Field(default=None, description="Review counts")
    findings: Optional[List[MetricDataPoint]] = Field(default=None, description="Finding counts")
    gates_passed: Optional[List[MetricDataPoint]] = Field(
        default=None, alias="gatesPassed", description="Gates passed counts"
    )
    gates_failed: Optional[List[MetricDataPoint]] = Field(
        default=None, alias="gatesFailed", description="Gates failed counts"
    )


class MetricsResponse(BaseAPIModel):
    """Response containing metrics."""

    metrics: MetricsData = Field(..., description="Metrics data")


# ============================================================================
# API Key Models
# ============================================================================


class ApiKey(BaseAPIModel):
    """API key information."""

    id: str = Field(..., description="Key ID")
    name: str = Field(..., description="Key name")
    key_preview: Optional[str] = Field(
        default=None, alias="keyPreview", description="Preview of the key"
    )
    scopes: List[ApiKeyScope] = Field(..., description="Key scopes")
    expires_at: Optional[datetime] = Field(
        default=None, alias="expiresAt", description="Expiration timestamp"
    )
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    last_used_at: Optional[datetime] = Field(
        default=None, alias="lastUsedAt", description="Last used timestamp"
    )


class CreateApiKeyRequest(BaseAPIModel):
    """Request to create an API key."""

    name: str = Field(..., description="Key name")
    scopes: List[ApiKeyScope] = Field(..., description="Key scopes")
    expires_at: Optional[datetime] = Field(
        default=None, alias="expiresAt", description="Expiration timestamp"
    )


class ApiKeyListResponse(BaseAPIModel):
    """Response containing a list of API keys."""

    keys: List[ApiKey] = Field(..., description="List of API keys")


# ============================================================================
# Response Wrappers
# ============================================================================


class ErrorResponse(BaseAPIModel):
    """Error response from the API."""

    error: ErrorInfo = Field(..., description="Error information")
