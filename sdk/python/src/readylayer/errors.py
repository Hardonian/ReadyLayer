"""Exception hierarchy for the ReadyLayer SDK.

This module defines all exceptions that can be raised by the ReadyLayer SDK,
providing a clear hierarchy for different error types.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from readylayer.types import ErrorInfo


class ReadyLayerError(Exception):
    """Base exception for all ReadyLayer SDK errors."""

    def __init__(
        self,
        message: str,
        error_info: Optional[ErrorInfo] = None,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_info = error_info
        self.response_body = response_body

    def __str__(self) -> str:
        if self.error_info:
            return f"{self.message} (code: {self.error_info.code})"
        return self.message


class APIError(ReadyLayerError):
    """Base exception for API errors."""

    status_code: int = 0

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        error_info: Optional[ErrorInfo] = None,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, error_info, response_body)
        if status_code is not None:
            self.status_code = status_code


class AuthenticationError(APIError):
    """Raised when authentication fails (401 Unauthorized)."""

    status_code = 401


class AuthorizationError(APIError):
    """Raised when the user lacks permission (403 Forbidden)."""

    status_code = 403


class NotFoundError(APIError):
    """Raised when a resource is not found (404 Not Found)."""

    status_code = 404


class ValidationError(APIError):
    """Raised when request validation fails (400 Bad Request)."""

    status_code = 400

    def __init__(
        self,
        message: str,
        error_info: Optional[ErrorInfo] = None,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, 400, error_info, response_body)
        self.validation_errors: Dict[str, str] = {}
        if error_info and error_info.errors:
            for error in error_info.errors:
                path = ".".join(str(p) for p in error.path) if error.path else ""
                self.validation_errors[path] = error.message


class PaymentRequiredError(APIError):
    """Raised when billing limit is exceeded (402 Payment Required)."""

    status_code = 402


class ConflictError(APIError):
    """Raised when there's a conflict (409 Conflict)."""

    status_code = 409


class RateLimitError(APIError):
    """Raised when rate limit is exceeded (429 Too Many Requests)."""

    status_code = 429

    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        error_info: Optional[ErrorInfo] = None,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, 429, error_info, response_body)
        self.retry_after = retry_after


class ServerError(APIError):
    """Raised when the server encounters an error (5xx)."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_info: Optional[ErrorInfo] = None,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, status_code, error_info, response_body)


class TimeoutError(ReadyLayerError):
    """Raised when a request times out."""

    pass


class ConnectionError(ReadyLayerError):
    """Raised when a connection error occurs."""

    pass


class RetryExhaustedError(ReadyLayerError):
    """Raised when all retry attempts have been exhausted."""

    def __init__(
        self,
        message: str,
        last_exception: Optional[Exception] = None,
        attempts: int = 0,
    ) -> None:
        super().__init__(message)
        self.last_exception = last_exception
        self.attempts = attempts


def raise_for_status_code(
    status_code: int,
    message: str,
    error_info: Optional[ErrorInfo] = None,
    response_body: Optional[Dict[str, Any]] = None,
    retry_after: Optional[int] = None,
) -> None:
    """Raise the appropriate exception based on status code.

    Args:
        status_code: HTTP status code
        message: Error message
        error_info: Parsed error information from the API
        response_body: Raw response body
        retry_after: Seconds to wait before retrying (for 429)

    Raises:
        APIError: Appropriate exception for the status code
    """
    if status_code == 400:
        raise ValidationError(message, error_info, response_body)
    elif status_code == 401:
        raise AuthenticationError(message, status_code, error_info, response_body)
    elif status_code == 402:
        raise PaymentRequiredError(message, status_code, error_info, response_body)
    elif status_code == 403:
        raise AuthorizationError(message, status_code, error_info, response_body)
    elif status_code == 404:
        raise NotFoundError(message, status_code, error_info, response_body)
    elif status_code == 409:
        raise ConflictError(message, status_code, error_info, response_body)
    elif status_code == 429:
        raise RateLimitError(message, retry_after, error_info, response_body)
    elif status_code >= 500:
        raise ServerError(message, status_code, error_info, response_body)
    else:
        raise APIError(message, status_code, error_info, response_body)
