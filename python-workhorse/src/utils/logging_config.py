"""Structured JSON logging configuration."""

import logging
import sys
from typing import Any, Dict

from pythonjsonlogger import jsonlogger

from src.config import settings


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    logger = logging.getLogger(name)

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, settings.log_level.upper()))

    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.log_level.upper()))

    if settings.log_format == "json":
        # JSON formatter for production
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            rename_fields={"levelname": "level", "asctime": "timestamp"},
        )
    else:
        # Console formatter for development
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


class RedactingFilter(logging.Filter):
    """Filter to redact sensitive information from logs."""

    SENSITIVE_KEYS = {
        "password", "secret", "token", "key", "auth", "credential",
        "api_key", "service_key", "private_key", "access_token",
        "database_url", "supabase_service_key",
    }

    def filter(self, record: logging.LogRecord) -> bool:
        """Redact sensitive keys from log messages."""
        if hasattr(record, "msg") and isinstance(record.msg, dict):
            record.msg = self._redact_dict(record.msg)

        # Also check extra fields
        for key in list(record.__dict__.keys()):
            if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                setattr(record, key, "[REDACTED]")

        return True

    def _redact_dict(self, d: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively redact sensitive keys from dict."""
        result = {}
        for key, value in d.items():
            if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                result[key] = "[REDACTED]"
            elif isinstance(value, dict):
                result[key] = self._redact_dict(value)
            elif isinstance(value, list):
                result[key] = [
                    self._redact_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result


# Add redacting filter to root logger
redacting_filter = RedactingFilter()
logging.getLogger().addFilter(redacting_filter)
