"""Structured JSON logging with correlation IDs."""

import logging
import sys
from typing import Any, Optional

import structlog
from pythonjsonlogger import jsonlogger

from src.config import settings


def _add_correlation_id(
    logger: structlog.types.WrappedLogger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Add correlation ID to log entries."""
    # Get from thread-local or context
    correlation_id = structlog.contextvars.get_contextvars().get("correlation_id")
    if correlation_id:
        event_dict["correlation_id"] = correlation_id
    return event_dict


def _add_worker_id(
    logger: structlog.types.WrappedLogger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Add worker ID to all logs."""
    event_dict["worker_id"] = settings.worker_id
    return event_dict


def _redact_secrets(
    logger: structlog.types.WrappedLogger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Redact potential secrets from log output."""
    secret_keys = {
        "password", "token", "secret", "key", "auth", "credential",
        "api_key", "private_key", "access_token", "refresh_token",
    }
    
    for key in list(event_dict.keys()):
        if any(sk in key.lower() for sk in secret_keys):
            event_dict[key] = "[REDACTED]"
    
    return event_dict


def configure_logging() -> None:
    """Configure structured logging."""
    # Clear existing handlers
    logging.getLogger().handlers.clear()
    
    # Configure structlog processors
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _add_worker_id,
        _add_correlation_id,
        _redact_secrets,
    ]
    
    if settings.log_format == "json":
        # JSON format for production
        structlog.configure(
            processors=shared_processors + [
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(
                getattr(logging, settings.log_level.upper())
            ),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Console format for development
        structlog.configure(
            processors=shared_processors + [
                structlog.dev.ConsoleRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(
                getattr(logging, settings.log_level.upper())
            ),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger."""
    return structlog.get_logger(name)


def set_correlation_id(correlation_id: Optional[str]) -> None:
    """Set correlation ID for current context."""
    if correlation_id:
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
    else:
        structlog.contextvars.unbind_contextvars("correlation_id")
