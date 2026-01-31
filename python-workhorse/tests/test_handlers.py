# Python Workhorse - Test Suite

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from src.config import Settings, get_settings
from src.handlers import (
    ReportGeneratorHandler,
    BatchExporterHandler,
    AnalyticsScorerHandler,
    get_handler,
)


class TestSettings:
    """Test configuration loading."""
    
    def test_settings_defaults(self):
        """Test default settings values."""
        with patch.dict('os.environ', {
            'DATABASE_URL': 'postgresql://user:pass@localhost/db',
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_KEY': 'eyJ' + 'a' * 100,
        }, clear=True):
            settings = Settings()
            assert settings.poll_interval_seconds == 5
            assert settings.max_concurrent_jobs == 3
            assert settings.job_timeout_seconds == 300
            assert settings.log_level == "INFO"


class TestReportGeneratorHandler:
    """Test report generation handler."""
    
    def test_valid_payload(self):
        """Test handler with valid payload."""
        handler = ReportGeneratorHandler()
        payload = {
            "organizationId": "org_test123",
            "parameters": {
                "format": "pdf",
                "reviewId": "rev_456",
            }
        }
        
        result = handler.handle(payload)
        
        assert "downloadUrl" in result
        assert result["format"] == "pdf"
        assert result["recordCount"] == 1500
        assert "checksum" in result
    
    def test_missing_organization_id(self):
        """Test handler rejects missing organizationId."""
        handler = ReportGeneratorHandler()
        payload = {
            "parameters": {"format": "pdf"}
        }
        
        with pytest.raises(ValueError, match="organizationId"):
            handler.handle(payload)


class TestBatchExporterHandler:
    """Test batch export handler."""
    
    def test_export_reviews(self):
        """Test exporting reviews."""
        handler = BatchExporterHandler()
        payload = {
            "organizationId": "org_test",
            "parameters": {
                "entityType": "reviews",
                "dateRange": {"from": "2024-01-01", "to": "2024-12-31"},
                "format": "csv",
            }
        }
        
        result = handler.handle(payload)
        
        assert result["entityType"] == "reviews"
        assert "downloadUrl" in result
        assert result["recordCount"] == 5000


class TestAnalyticsScorerHandler:
    """Test analytics scoring handler."""
    
    def test_ai_risk_exposure(self):
        """Test AI risk exposure calculation."""
        handler = AnalyticsScorerHandler()
        payload = {
            "organizationId": "org_test",
            "parameters": {
                "metric": "ai_risk_exposure",
                "period": "30d",
            }
        }
        
        result = handler.handle(payload)
        
        assert result["metric"] == "ai_risk_exposure"
        assert "score" in result
        assert "level" in result
        assert "components" in result
        assert "aiAuthorshipPercent" in result["components"]


class TestHandlerRegistry:
    """Test handler registry."""
    
    def test_get_valid_handler(self):
        """Test getting valid handlers."""
        handlers = [
            "python.report.generate",
            "python.batch.export",
            "python.analytics.score",
            "python.ingest.document",
            "python.reconcile.violations",
        ]
        
        for job_type in handlers:
            handler = get_handler(job_type)
            assert handler is not None
    
    def test_get_invalid_handler(self):
        """Test getting invalid handler raises error."""
        with pytest.raises(ValueError, match="Unknown job type"):
            get_handler("python.invalid.type")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
