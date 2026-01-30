"""Health resource for the ReadyLayer API.

This module provides sync and async resources for health checks.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from readylayer.types import (
    HealthResponse,
    ReadyResponse,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class HealthResource:
    """Synchronous resource for health check operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def check(self) -> HealthResponse:
        """Check service health status.

        Returns:
            Health status response
        """
        response = self._client.get("/health")
        return HealthResponse.model_validate_json(response.text)

    def ready(self) -> ReadyResponse:
        """Check service readiness status including dependencies.

        Returns:
            Readiness status response
        """
        response = self._client.get("/ready")
        return ReadyResponse.model_validate_json(response.text)


class AsyncHealthResource:
    """Asynchronous resource for health check operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def check(self) -> HealthResponse:
        """Check service health status.

        Returns:
            Health status response
        """
        response = await self._client.get("/health")
        return HealthResponse.model_validate_json(response.text)

    async def ready(self) -> ReadyResponse:
        """Check service readiness status including dependencies.

        Returns:
            Readiness status response
        """
        response = await self._client.get("/ready")
        return ReadyResponse.model_validate_json(response.text)
