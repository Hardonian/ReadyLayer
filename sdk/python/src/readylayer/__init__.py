"""ReadyLayer Python SDK.

A production-ready Python SDK for the ReadyLayer API, providing code review
governance, policy management, and automated quality assurance.

Basic Usage:
    Synchronous:
        >>> from readylayer import ReadyLayer
        >>> client = ReadyLayer(api_key="your-api-key")
        >>> repos = client.repos.list()
        >>> print(repos.repositories)

    Asynchronous:
        >>> import asyncio
        >>> from readylayer import AsyncReadyLayer
        >>> async def main():
        ...     async with AsyncReadyLayer(api_key="your-api-key") as client:
        ...         repos = await client.repos.list()
        ...         print(repos.repositories)
        >>> asyncio.run(main())

Features:
    - Sync and async HTTP clients using httpx
    - Automatic retries with exponential backoff
    - Comprehensive error handling with typed exceptions
    - Pydantic v2 models for type safety
    - Pagination helpers
    - Bearer token authentication
"""

__version__ = "1.0.0"
__author__ = "ReadyLayer"
__license__ = "MIT"

# Main clients
from readylayer.readylayer import AsyncReadyLayer, ReadyLayer

# HTTP clients
from readylayer.client import AsyncClient, Client, SyncClient

# Types
from readylayer.types import (
    Action,
    ApiKey,
    ApiKeyListResponse,
    ApiKeyScope,
    BillingTier,
    BillingTierLimits,
    BillingTierName,
    BillingTierResponse,
    BillingUsage,
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
    DetectedBy,
    ErrorDetail,
    ErrorInfo,
    ErrorResponse,
    EvidenceBundle,
    EvidenceListResponse,
    Finding,
    FindingStatus,
    GateStatus,
    HealthResponse,
    HealthStatus,
    MetricDataPoint,
    MetricsData,
    MetricsResponse,
    Organization,
    Pagination,
    PolicyPack,
    PolicyPackListResponse,
    PolicyRule,
    PolicyRuleInput,
    PolicyRuleListResponse,
    PolicyTemplate,
    PolicyTemplateListResponse,
    PolicyValidationError,
    PolicyValidationResult,
    Provider,
    Repository,
    RepositoryListResponse,
    Review,
    ReviewConfig,
    ReviewFile,
    ReviewListResponse,
    ReviewRepository,
    ReviewStatus,
    ReviewSummary,
    Run,
    RunConclusion,
    RunConfig,
    RunListResponse,
    RunStatus,
    Severity,
    TestConnectionResponse,
    TestEngineCoverage,
    TestEngineResult,
    TriggerMetadata,
    TriggerType,
    UpdatePolicyPackRequest,
    UpdatePolicyRuleRequest,
    UpdateRepositoryRequest,
    ValidatePolicyRequest,
    Waiver,
    WaiverListResponse,
)

# Errors
from readylayer.errors import (
    APIError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    ConnectionError,
    NotFoundError,
    PaymentRequiredError,
    RateLimitError,
    ReadyLayerError,
    RetryExhaustedError,
    ServerError,
    TimeoutError,
    ValidationError,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    "__license__",
    # Main clients
    "ReadyLayer",
    "AsyncReadyLayer",
    # HTTP clients
    "Client",
    "SyncClient",
    "AsyncClient",
    # Enums
    "Provider",
    "HealthStatus",
    "ReviewStatus",
    "RunStatus",
    "RunConclusion",
    "GateStatus",
    "Severity",
    "FindingStatus",
    "DetectedBy",
    "BillingTierName",
    "Action",
    "ApiKeyScope",
    "TriggerType",
    # Base models
    "Pagination",
    "Organization",
    "ErrorDetail",
    "ErrorInfo",
    # Health
    "HealthResponse",
    "ReadyResponse",
    # Repository
    "Repository",
    "CreateRepositoryRequest",
    "UpdateRepositoryRequest",
    "RepositoryListResponse",
    "TestConnectionResponse",
    # Policy
    "PolicyRule",
    "PolicyRuleInput",
    "PolicyPack",
    "CreatePolicyPackRequest",
    "UpdatePolicyPackRequest",
    "PolicyPackListResponse",
    "CreatePolicyRuleRequest",
    "UpdatePolicyRuleRequest",
    "PolicyRuleListResponse",
    "ValidatePolicyRequest",
    "PolicyValidationError",
    "PolicyValidationResult",
    "PolicyTemplate",
    "PolicyTemplateListResponse",
    # Review
    "ReviewSummary",
    "ReviewRepository",
    "Review",
    "ReviewFile",
    "ReviewConfig",
    "CreateReviewRequest",
    "ReviewListResponse",
    # Finding
    "Finding",
    # Waiver
    "Waiver",
    "CreateWaiverRequest",
    "WaiverListResponse",
    # Evidence
    "EvidenceBundle",
    "EvidenceListResponse",
    # Run
    "ReviewGuardResult",
    "TestEngineCoverage",
    "TestEngineResult",
    "DocSyncResult",
    "AITouchedFile",
    "FailedGate",
    "Run",
    "TriggerMetadata",
    "RunConfig",
    "CreateRunRequest",
    "CreateSandboxRunRequest",
    "RunListResponse",
    # Billing
    "BillingTierLimits",
    "BillingTier",
    "BillingUsage",
    "BillingTierResponse",
    "CreateCheckoutRequest",
    "CheckoutSessionResponse",
    # Metrics
    "MetricDataPoint",
    "MetricsData",
    "MetricsResponse",
    # API Keys
    "ApiKey",
    "CreateApiKeyRequest",
    "ApiKeyListResponse",
    # Errors
    "ReadyLayerError",
    "APIError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ValidationError",
    "PaymentRequiredError",
    "ConflictError",
    "RateLimitError",
    "ServerError",
    "TimeoutError",
    "ConnectionError",
    "RetryExhaustedError",
    # Response
    "ErrorResponse",
]
