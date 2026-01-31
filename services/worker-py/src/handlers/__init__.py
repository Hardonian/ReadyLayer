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
]
