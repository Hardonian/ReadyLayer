"""Base handler class and job type registry."""

from abc import ABC, abstractmethod
from typing import Any, Optional, Dict, Type
from dataclasses import dataclass, field

from src.utils.logging import get_logger, set_correlation_id

logger = get_logger(__name__)


@dataclass
class JobResult:
    """Result from job handler execution."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    artifacts: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "artifacts": self.artifacts,
        }


class BaseHandler(ABC):
    """Base class for job handlers.

    All job handlers must inherit from this class and implement:
    - job_type: str class attribute
    - validate_payload(): Validate and return cleaned payload
    - execute(): Execute the job and return JobResult
    """

    job_type: str = ""

    def __init__(self):
        self.logger = get_logger(f"{__name__}.{self.__class__.__name__}")

    def handle(self, job: "Job", context: dict) -> JobResult:
        """Main entry point for job execution.

        Args:
            job: Job instance with payload
            context: Execution context (worker_id, etc.)

        Returns:
            JobResult with success/failure and data
        """
        # Set correlation ID for logging
        if job.correlation_id:
            set_correlation_id(job.correlation_id)

        self.logger.info(
            "Starting job execution",
            job_id=job.id,
            job_type=self.job_type,
        )

        try:
            # Validate payload
            validated_payload = self.validate_payload(job.payload)

            # Execute
            result = self.execute(validated_payload, context)

            self.logger.info(
                "Job execution completed",
                job_id=job.id,
                success=result.success,
            )

            return result

        except Exception as e:
            self.logger.error(
                "Job execution failed",
                job_id=job.id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"{type(e).__name__}: {str(e)}",
            )
        finally:
            set_correlation_id(None)

    @abstractmethod
    def validate_payload(self, payload: dict) -> dict:
        """Validate and clean the job payload.

        Args:
            payload: Raw job payload

        Returns:
            Validated/cleaned payload

        Raises:
            ValueError: If payload is invalid
        """
        pass

    @abstractmethod
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute the job.

        Args:
            payload: Validated payload
            context: Execution context

        Returns:
            JobResult with execution results
        """
        pass


# Registry of job handlers
_handler_registry: Dict[str, Type[BaseHandler]] = {}


def register_handler(handler_class: Type[BaseHandler]) -> Type[BaseHandler]:
    """Decorator to register a handler class.

    Usage:
        @register_handler
        class MyHandler(BaseHandler):
            job_type = "my.job"
    """
    if not handler_class.job_type:
        raise ValueError(f"Handler {handler_class.__name__} missing job_type")

    _handler_registry[handler_class.job_type] = handler_class
    logger.info("Registered handler", job_type=handler_class.job_type, handler=handler_class.__name__)
    return handler_class


def get_handler(job_type: str) -> Optional[BaseHandler]:
    """Get handler instance for job type.

    Args:
        job_type: Job type string

    Returns:
        Handler instance or None if not found
    """
    handler_class = _handler_registry.get(job_type)
    if handler_class:
        return handler_class()

    # Try to find a fallback
    logger.warning("No handler found for job type", job_type=job_type)
    return None


def list_registered_handlers() -> list:
    """List all registered handler types."""
    return list(_handler_registry.keys())
