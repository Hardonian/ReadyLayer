"""Retry decorator with exponential backoff."""

import functools
import time
from typing import Callable, TypeVar, Tuple, Optional

from src.utils.logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    retryable_exceptions: Tuple[type, ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int, float], None]] = None,
) -> Callable:
    """Decorator for retrying functions with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
        exponential_base: Base for exponential calculation
        retryable_exceptions: Tuple of exception types to retry on
        on_retry: Optional callback function(exc, attempt, delay)
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt >= max_retries:
                        logger.warning(
                            f"Function {func.__name__} failed after {max_retries} retries",
                            error=str(e),
                        )
                        raise
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    
                    logger.info(
                        f"Function {func.__name__} failed, retrying...",
                        attempt=attempt + 1,
                        max_retries=max_retries,
                        delay_seconds=delay,
                        error=str(e)[:100],
                    )
                    
                    if on_retry:
                        on_retry(e, attempt + 1, delay)
                    
                    time.sleep(delay)
            
            # Should never reach here
            raise last_exception if last_exception else RuntimeError("Unexpected error")
        
        return wrapper
    return decorator


def retry_database_operation(max_retries: int = 3) -> Callable:
    """Convenience decorator for database operations."""
    return retry_with_backoff(
        max_retries=max_retries,
        base_delay=1.0,
        max_delay=30.0,
        retryable_exceptions=(
            ConnectionError,
            TimeoutError,
            Exception,  # psycopg2 errors inherit from Exception
        ),
    )
