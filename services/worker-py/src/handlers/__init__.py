"""Job type handlers registry."""

from src.handlers.base import register_handler, get_handler, list_registered_handlers, BaseHandler, JobResult

# Import and register all handlers
from src.handlers.ingest_normalize import IngestNormalizeHandler
from src.handlers.recon_run import ReconRunHandler
from src.handlers.anomaly_score import AnomalyScoreHandler
from src.handlers.eval_run import EvalRunHandler

# Phase 4 - Real Work handlers (wired to actual tables)
from src.handlers.readiness_score import ReadinessScoreHandler
from src.handlers.report_artifact import ReportArtifactHandler

# Phase 6 - Shared/Core handlers
from src.handlers.batch_backfill import BatchBackfillHandler
from src.handlers.ml_features import MLFeaturesBuildHandler

# Phase 6 - ReadyLayer-specific handlers
from src.handlers.repo_snapshot import RepoSnapshotIngestHandler
from src.handlers.report_artifact_build import ReportArtifactBuildHandler

# Phase 6 - AI/ML Advanced handlers
from src.handlers.anomaly_detect import AnomalyDetectHandler
from src.handlers.trust_verify import TrustVerifyHandler
from src.handlers.review_prioritize import ReviewPrioritizeHandler

__all__ = [
    "register_handler",
    "get_handler",
    "list_registered_handlers",
    "BaseHandler",
    "JobResult",
    # Handler classes for reference
    "IngestNormalizeHandler",
    "ReconRunHandler",
    "AnomalyScoreHandler",
    "EvalRunHandler",
    "ReadinessScoreHandler",
    "ReportArtifactHandler",
    # Phase 6 handlers
    "BatchBackfillHandler",
    "MLFeaturesBuildHandler",
    "RepoSnapshotIngestHandler",
    "ReportArtifactBuildHandler",
    # AI/ML handlers
    "AnomalyDetectHandler",
    "TrustVerifyHandler",
    "ReviewPrioritizeHandler",
]
