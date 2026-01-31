"""Main HTTP client for the ReadyLayer API.

This module provides both synchronous and asynchronous clients for interacting
with the ReadyLayer API, with automatic retries, error handling, and pagination support.
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager, contextmanager
from typing import Any, AsyncGenerator, Dict, Generator, Optional, Type, TypeVar, Union

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from readylayer.errors import (
    APIError,
    ConnectionError,
    RetryExhaustedError,
    TimeoutError,
    raise_for_status_code,
)
from readylayer.types import ErrorInfo, ErrorResponse

T = TypeVar("T")

DEFAULT_BASE_URL = "https://readylayer.io/api/v1"
DEFAULT_TIMEOUT = 60.0
DEFAULT_MAX_RETRIES = 3


class BaseClient:
    """Base client with common functionality for sync and async clients."""

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "readylayer-python/1.0.0",
        }

    def _build_url(self, path: str) -> str:
        """Build full URL from path."""
        path = path.lstrip("/")
        return f"{self.base_url}/{path}"

    def _handle_error_response(self, response: httpx.Response) -> None:
        """Handle error responses and raise appropriate exceptions."""
        try:
            body = response.json()
        except json.JSONDecodeError:
            body = None

        error_info = None
        if body and "error" in body:
            try:
                error_response = ErrorResponse.model_validate(body)
                error_info = error_response.error
            except Exception:
                pass

        retry_after = None
        if response.status_code == 429:
            retry_after_str = response.headers.get("retry-after")
            if retry_after_str:
                try:
                    retry_after = int(retry_after_str)
                except ValueError:
                    pass

        raise_for_status_code(
            status_code=response.status_code,
            message=error_info.message if error_info else f"HTTP {response.status_code}",
            error_info=error_info,
            response_body=body,
            retry_after=retry_after,
        )

    def _should_retry(self, exception: Exception) -> bool:
        """Determine if a request should be retried based on the exception."""
        if isinstance(exception, APIError):
            return exception.status_code >= 500 or exception.status_code == 429
        if isinstance(exception, (TimeoutError, ConnectionError)):
            return True
        return False


class SyncClient(BaseClient):
    """Synchronous HTTP client for the ReadyLayer API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        super().__init__(api_key, base_url, timeout, max_retries)
        self._client = http_client

    @property
    def _http_client(self) -> httpx.Client:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.Client(
                headers=self._headers,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make an HTTP request with retries."""
        url = self._build_url(path)
        request_headers = {**self._headers}
        if headers:
            request_headers.update(headers)

        @retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=retry_if_exception_type(
                (TimeoutError, ConnectionError, APIError)
            ),
            reraise=True,
        )
        def _do_request() -> httpx.Response:
            try:
                response = self._http_client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json_data,
                    headers=request_headers,
                )
            except httpx.TimeoutException as e:
                raise TimeoutError(f"Request timed out: {e}") from e
            except httpx.ConnectError as e:
                raise ConnectionError(f"Connection error: {e}") from e
            except httpx.HTTPError as e:
                raise ConnectionError(f"HTTP error: {e}") from e

            if response.status_code >= 400:
                self._handle_error_response(response)

            return response

        try:
            return _do_request()
        except Exception as e:
            if isinstance(e, (TimeoutError, ConnectionError, APIError)):
                raise
            raise RetryExhaustedError(
                f"Request failed after {self.max_retries} attempts",
                last_exception=e,
                attempts=self.max_retries,
            ) from e

    def get(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a GET request."""
        return self._request("GET", path, params=params, headers=headers)

    def post(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a POST request."""
        return self._request("POST", path, params=params, json_data=json_data, headers=headers)

    def put(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a PUT request."""
        return self._request("PUT", path, params=params, json_data=json_data, headers=headers)

    def patch(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a PATCH request."""
        return self._request("PATCH", path, params=params, json_data=json_data, headers=headers)

    def delete(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a DELETE request."""
        return self._request("DELETE", path, params=params, headers=headers)

    def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            self._client.close()
            self._client = None

    def __enter__(self) -> SyncClient:
        """Context manager entry."""
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
        self.close()


class AsyncClient(BaseClient):
    """Asynchronous HTTP client for the ReadyLayer API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(api_key, base_url, timeout, max_retries)
        self._client = http_client

    @property
    def _http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers=self._headers,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make an HTTP request with retries."""
        url = self._build_url(path)
        request_headers = {**self._headers}
        if headers:
            request_headers.update(headers)

        last_exception: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                response = await self._http_client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json_data,
                    headers=request_headers,
                )

                if response.status_code >= 400:
                    if response.status_code >= 500 or response.status_code == 429:
                        last_exception = self._create_error(response)
                        import asyncio
                        await asyncio.sleep(min(2 ** attempt, 10))
                        continue
                    self._handle_error_response(response)

                return response

            except httpx.TimeoutException as e:
                last_exception = TimeoutError(f"Request timed out: {e}")
            except httpx.ConnectError as e:
                last_exception = ConnectionError(f"Connection error: {e}")
            except httpx.HTTPError as e:
                last_exception = ConnectionError(f"HTTP error: {e}")
            except (TimeoutError, ConnectionError) as e:
                last_exception = e

            if attempt < self.max_retries - 1:
                import asyncio
                await asyncio.sleep(min(2 ** attempt, 10))

        if last_exception:
            raise RetryExhaustedError(
                f"Request failed after {self.max_retries} attempts",
                last_exception=last_exception,
                attempts=self.max_retries,
            ) from last_exception

        raise RetryExhaustedError(
            f"Request failed after {self.max_retries} attempts",
            attempts=self.max_retries,
        )

    def _create_error(self, response: httpx.Response) -> APIError:
        """Create an error from response without raising."""
        try:
            body = response.json()
        except json.JSONDecodeError:
            body = None

        error_info = None
        if body and "error" in body:
            try:
                error_response = ErrorResponse.model_validate(body)
                error_info = error_response.error
            except Exception:
                pass

        message = error_info.message if error_info else f"HTTP {response.status_code}"
        return APIError(message, response.status_code, error_info, body)

    async def get(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a GET request."""
        return await self._request("GET", path, params=params, headers=headers)

    async def post(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a POST request."""
        return await self._request("POST", path, params=params, json_data=json_data, headers=headers)

    async def put(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a PUT request."""
        return await self._request("PUT", path, params=params, json_data=json_data, headers=headers)

    async def patch(
        self,
        path: str,
        *,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a PATCH request."""
        return await self._request("PATCH", path, params=params, json_data=json_data, headers=headers)

    async def delete(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> httpx.Response:
        """Make a DELETE request."""
        return await self._request("DELETE", path, params=params, headers=headers)

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> AsyncClient:
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()


# Convenience aliases
Client = SyncClient
