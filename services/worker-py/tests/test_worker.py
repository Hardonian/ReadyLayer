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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
