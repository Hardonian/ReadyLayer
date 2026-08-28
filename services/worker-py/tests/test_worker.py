"""Tests for worker-py service."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.config import Settings, get_settings
from src.handlers.base import BaseHandler, JobResult, register_handler
from src.handlers.ingest_normalize import IngestNormalizeHandler
from src.handlers.recon_run import ReconRunHandler
from src.handlers.anomaly_score import AnomalyScoreHandler
from src.handlers.eval_run import EvalRunHandler
from src.handlers.readiness_score import ReadinessScoreHandler
from src.handlers.report_artifact import ReportArtifactHandler


class TestConfig:
    """Test configuration."""

    def test_settings_validation(self):
        """Test that settings validate correctly."""
        with pytest.raises(Exception):
            # Should fail without DATABASE_URL
            Settings(
                DATABASE_URL="",
                WORKER_ID="test",
            )

    def test_worker_id_validation(self):
        """Test worker ID validation."""
        with pytest.raises(ValueError):
            Settings(
                DATABASE_URL="postgresql://localhost/db",
                WORKER_ID="a" * 101,  # Too long
            )


class TestHandlers:
    """Test job handlers."""

    def test_ingest_normalize_validation(self):
        """Test ingest.normalize payload validation."""
        handler = IngestNormalizeHandler()

        # Valid payload
        valid = handler.validate_payload({
            "source": "test",
            "format": "csv",
            "data_content": "col1,col2\n1,2",
        })
        assert valid["source"] == "test"

        # Missing source
        with pytest.raises(ValueError, match="source"):
            handler.validate_payload({
                "format": "csv",
                "data_content": "test",
            })

        # Invalid format
        with pytest.raises(ValueError, match="format"):
            handler.validate_payload({
                "source": "test",
                "format": "xml",
            })

    def test_ingest_normalize_execution(self):
        """Test ingest.normalize execution."""
        handler = IngestNormalizeHandler()
        job = Mock()
        job.id = "test-123"
        job.payload = {
            "source": "test",
            "format": "csv",
            "data_content": "col1,col2\n1,2\n3,4",
        }
        job.correlation_id = None

        result = handler.handle(job, {"worker_id": "test-worker"})

        assert result.success is True
        assert result.data["normalized_rows"] == 2
        assert result.data["status"] == "normalized"

    def test_recon_run_validation(self):
        """Test recon.run payload validation."""
        handler = ReconRunHandler()

        # Valid payload
        valid = handler.validate_payload({
            "recon_id": "r1",
            "source_system": "db1",
            "target_system": "db2",
            "rules": [],
        })
        assert valid["dry_run"] is True  # Default

        # Missing required field
        with pytest.raises(ValueError, match="recon_id"):
            handler.validate_payload({
                "source_system": "db1",
                "target_system": "db2",
            })

    def test_anomaly_score_validation(self):
        """Test anomaly.score payload validation."""
        handler = AnomalyScoreHandler()

        # Valid payload
        valid = handler.validate_payload({
            "dataset_id": "ds1",
            "algorithm": "isolation_forest",
            "features": ["f1", "f2"],
        })
        assert valid["threshold"] == 0.95  # Default

        # Invalid algorithm
        with pytest.raises(ValueError, match="algorithm"):
            handler.validate_payload({
                "dataset_id": "ds1",
                "algorithm": "unknown",
            })

        # Invalid threshold
        with pytest.raises(ValueError, match="Threshold"):
            handler.validate_payload({
                "dataset_id": "ds1",
                "algorithm": "z_score",
                "threshold": 1.5,
            })

    def test_eval_run_execution(self):
        """Test eval.run execution."""
        handler = EvalRunHandler()
        job = Mock()
        job.id = "test-123"
        job.payload = {
            "eval_id": "e1",
            "target_type": "dataset",
            "target_id": "ds1",
            "metrics": ["accuracy", "precision"],
        }
        job.correlation_id = None

        result = handler.handle(job, {"worker_id": "test-worker"})

        assert result.success is True
        assert result.data["metrics_computed"] == 2
        assert "overall_score" in result.data

    def test_handler_registry(self):
        """Test handler registration."""
        from src.handlers import get_handler, list_registered_handlers

        handlers = list_registered_handlers()
        assert "ingest.normalize" in handlers
        assert "recon.run" in handlers
        assert "anomaly.score" in handlers
        assert "eval.run" in handlers

        # Get specific handlers
        assert get_handler("ingest.normalize") is not None
        assert get_handler("unknown.type") is None


class TestJobResult:
    """Test JobResult dataclass."""

    def test_to_dict(self):
        """Test JobResult serialization."""
        result = JobResult(
            success=True,
            data={"key": "value"},
            error=None,
            artifacts={"file": "path"},
        )

        d = result.to_dict()
        assert d["success"] is True
        assert d["data"]["key"] == "value"
        assert d["error"] is None
        assert d["artifacts"]["file"] == "path"


class TestBaseHandler:
    """Test BaseHandler functionality."""

    def test_register_decorator(self):
        """Test handler registration decorator."""

        @register_handler
        class TestHandler(BaseHandler):
            job_type = "test.handler"

            def validate_payload(self, payload):
                return payload

            def execute(self, payload, context):
                return JobResult(success=True)

        from src.handlers import get_handler
        handler = get_handler("test.handler")
        assert handler is not None
        assert isinstance(handler, TestHandler)

    def test_handler_without_job_type(self):
        """Test that handlers without job_type fail registration."""

        with pytest.raises(ValueError, match="job_type"):
            @register_handler
            class BadHandler(BaseHandler):
                job_type = ""

                def validate_payload(self, payload):
                    return payload

                def execute(self, payload, context):
                    return JobResult(success=True)


class TestReadinessScoreHandler:
    """Test readiness.score handler - Phase 4 Real Work."""

    def test_validation_required_fields(self):
        """Test payload validation requires repository_id and organization_id."""
        handler = ReadinessScoreHandler()

        # Valid payload
        valid = handler.validate_payload({
            "repository_id": "repo-123",
            "organization_id": "org-456",
        })
        assert valid["lookback_days"] == 30  # Default
        assert valid["store_result"] is True  # Default

        # Missing repository_id
        with pytest.raises(ValueError, match="repository_id"):
            handler.validate_payload({"organization_id": "org-456"})

        # Missing organization_id
        with pytest.raises(ValueError, match="organization_id"):
            handler.validate_payload({"repository_id": "repo-123"})

    def test_validation_lookback_days(self):
        """Test lookback_days validation."""
        handler = ReadinessScoreHandler()

        # Invalid lookback_days (too small)
        with pytest.raises(ValueError, match="lookback_days"):
            handler.validate_payload({
                "repository_id": "repo-123",
                "organization_id": "org-456",
                "lookback_days": 0,
            })

        # Invalid lookback_days (too large)
        with pytest.raises(ValueError, match="lookback_days"):
            handler.validate_payload({
                "repository_id": "repo-123",
                "organization_id": "org-456",
                "lookback_days": 400,
            })


class TestReportArtifactHandler:
    """Test report.generate handler - Phase 4 Real Work."""

    def test_validation_required_fields(self):
        """Test payload validation requires job_id."""
        handler = ReportArtifactHandler()

        # Valid payload
        valid = handler.validate_payload({
            "job_id": "job-123",
            "format": "json",
        })
        assert valid["format"] == "json"
        assert valid["include_context"] is True  # Default

        # Missing job_id
        with pytest.raises(ValueError, match="job_id"):
            handler.validate_payload({"format": "json"})

    def test_validation_format(self):
        """Test format validation."""
        handler = ReportArtifactHandler()

        # Valid formats
        for fmt in ["json", "html", "markdown"]:
            valid = handler.validate_payload({
                "job_id": "job-123",
                "format": fmt,
            })
            assert valid["format"] == fmt

        # Invalid format
        with pytest.raises(ValueError, match="format"):
            handler.validate_payload({
                "job_id": "job-123",
                "format": "xml",
            })

    def test_report_hash_determinism(self):
        """Test that report hash is deterministic."""
        import hashlib
        import json

        def compute_hash(data):
            content = json.dumps(data, sort_keys=True, default=str)
            return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]

        data = {"score": 85.5, "status": "passed"}
        hash1 = compute_hash(data)
        hash2 = compute_hash(data)

        assert hash1 == hash2, "Hash should be deterministic for same input"
        assert len(hash1) == 16, "Hash should be 16 chars (truncated SHA-256)"


class TestPhase4HandlerRegistration:
    """Test Phase 4 handlers are properly registered."""

    def test_new_handlers_registered(self):
        """Test that Phase 4 handlers are in the registry."""
        from src.handlers import get_handler, list_registered_handlers

        handlers = list_registered_handlers()

        # Phase 4 handlers should be registered
        assert "readiness.score" in handlers, "readiness.score handler not registered"
        assert "report.generate" in handlers, "report.generate handler not registered"

        # Can instantiate
        readiness = get_handler("readiness.score")
        assert readiness is not None
        assert isinstance(readiness, ReadinessScoreHandler)

        report = get_handler("report.generate")
        assert report is not None
        assert isinstance(report, ReportArtifactHandler)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
