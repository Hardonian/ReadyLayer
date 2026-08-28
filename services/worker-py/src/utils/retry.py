"""Retry logic with exponential backoff."""

from functools import wraps
from typing import Any, Callable, Optional, TypeVar, Union

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
    RetryCallState,
)

from src.utils.logging import get_logger

logger = get_logger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exceptions: tuple = (Exception,),
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exceptions = exceptions


def with_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
) -> Callable[[F], F]:
    """Decorator for retry with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts
        base_delay: Base delay in seconds for exponential backoff
        max_delay: Maximum delay between retries
        exceptions: Tuple of exception types to retry on

    Returns:
        Decorated function with retry logic
    """
    def decorator(func: F) -> F:
        @retry(
            retry=retry_if_exception_type(exceptions),
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=base_delay, max=max_delay),
            before_sleep=before_sleep_log(logger, "WARNING"),
            reraise=True,
        )
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return func(*args, **kwargs)

        return wrapper  # type: ignore

    return decorator


def calculate_backoff_delay(
    attempt: int,
    base: float = 2.0,
    max_delay: float = 300.0,
) -> float:
    """Calculate exponential backoff delay.

    Args:
        attempt: Current attempt number (0-indexed)
        base: Exponential base
        max_delay: Maximum delay in seconds

    Returns:
        Delay in seconds
    """
    import math
    delay = min(base ** attempt, max_delay)
    return delay


def log_retry_attempt(retry_state: RetryCallState) -> None:
    """Log retry attempt information."""
    if retry_state.outcome and retry_state.outcome.failed:
        exception = retry_state.outcome.exception()
        logger.warning(
            "Retrying after failure",
            attempt=retry_state.attempt_number,
            max_attempts=retry_state.retry_object.stop.max_attempt_number,
            exception_type=type(exception).__name__ if exception else None,
            next_delay=retry_state.next_action.sleep if retry_state.next_action else None,
        )
