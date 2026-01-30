"""ReadyLayer SDK - Main client with resource access.

This module provides the main ReadyLayer client class that provides access
to all API resources in both synchronous and asynchronous versions.
"""

from __future__ import annotations

from typing import Optional

from readylayer.client import AsyncClient, SyncClient
from readylayer.resources.api_keys import ApiKeysResource, AsyncApiKeysResource
from readylayer.resources.billing import AsyncBillingResource, BillingResource
from readylayer.resources.evidence import AsyncEvidenceResource, EvidenceResource
from readylayer.resources.health import AsyncHealthResource, HealthResource
from readylayer.resources.metrics import AsyncMetricsResource, MetricsResource
from readylayer.resources.policies import AsyncPoliciesResource, PoliciesResource
from readylayer.resources.repos import AsyncRepositoriesResource, RepositoriesResource
from readylayer.resources.reviews import AsyncReviewsResource, ReviewsResource
from readylayer.resources.runs import AsyncRunsResource, RunsResource
from readylayer.resources.waivers import AsyncWaiversResource, WaiversResource

DEFAULT_BASE_URL = "https://readylayer.io/api/v1"
DEFAULT_TIMEOUT = 60.0
DEFAULT_MAX_RETRIES = 3


class ReadyLayer:
    """Synchronous ReadyLayer API client.

    This is the main entry point for interacting with the ReadyLayer API.
    It provides access to all resources through a unified interface.

    Example:
        >>> from readylayer import ReadyLayer
        >>> client = ReadyLayer(api_key="your-api-key")
        >>> repos = client.repos.list()
        >>> print(repos.repositories)

    Args:
        api_key: Your ReadyLayer API key
        base_url: API base URL (default: https://readylayer.io/api/v1)
        timeout: Request timeout in seconds (default: 60)
        max_retries: Maximum number of retries (default: 3)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        self._client = SyncClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )

        # Initialize resources
        self.repos = RepositoriesResource(self._client)
        self.policies = PoliciesResource(self._client)
        self.reviews = ReviewsResource(self._client)
        self.waivers = WaiversResource(self._client)
        self.evidence = EvidenceResource(self._client)
        self.runs = RunsResource(self._client)
        self.billing = BillingResource(self._client)
        self.metrics = MetricsResource(self._client)
        self.health = HealthResource(self._client)
        self.api_keys = ApiKeysResource(self._client)

    def close(self) -> None:
        """Close the HTTP client and release resources."""
        self._client.close()

    def __enter__(self) -> ReadyLayer:
        """Context manager entry."""
        return self

    def __exit__(self, exc_type: Optional[type], exc_val: Optional[Exception], exc_tb: Optional[object]) -> None:
        """Context manager exit."""
        self.close()


class AsyncReadyLayer:
    """Asynchronous ReadyLayer API client.

    This is the main entry point for asynchronous interaction with the ReadyLayer API.
    It provides access to all resources through a unified interface.

    Example:
        >>> import asyncio
        >>> from readylayer import AsyncReadyLayer
        >>> async def main():
        ...     async with AsyncReadyLayer(api_key="your-api-key") as client:
        ...         repos = await client.repos.list()
        ...         print(repos.repositories)
        >>> asyncio.run(main())

    Args:
        api_key: Your ReadyLayer API key
        base_url: API base URL (default: https://readylayer.io/api/v1)
        timeout: Request timeout in seconds (default: 60)
        max_retries: Maximum number of retries (default: 3)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        self._client = AsyncClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )

        # Initialize resources
        self.repos = AsyncRepositoriesResource(self._client)
        self.policies = AsyncPoliciesResource(self._client)
        self.reviews = AsyncReviewsResource(self._client)
        self.waivers = AsyncWaiversResource(self._client)
        self.evidence = AsyncEvidenceResource(self._client)
        self.runs = AsyncRunsResource(self._client)
        self.billing = AsyncBillingResource(self._client)
        self.metrics = AsyncMetricsResource(self._client)
        self.health = AsyncHealthResource(self._client)
        self.api_keys = AsyncApiKeysResource(self._client)

    async def close(self) -> None:
        """Close the HTTP client and release resources."""
        await self._client.close()

    async def __aenter__(self) -> AsyncReadyLayer:
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type: Optional[type], exc_val: Optional[Exception], exc_tb: Optional[object]) -> None:
        """Async context manager exit."""
        await self.close()
