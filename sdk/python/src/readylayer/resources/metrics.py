"""Metrics resource for the ReadyLayer API.

This module provides sync and async resources for retrieving usage metrics.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from readylayer.types import MetricsResponse

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class MetricsResource:
    """Synchronous resource for metrics operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def get(
        self,
        *,
        organization_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> MetricsResponse:
        """Get usage metrics for the organization.

        Args:
            organization_id: Organization ID
            start_date: Metrics start date (ISO 8601)
            end_date: Metrics end date (ISO 8601)

        Returns:
            Metrics data
        """
        params: dict[str, str] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if start_date is not None:
            params["startDate"] = start_date.isoformat()
        if end_date is not None:
            params["endDate"] = end_date.isoformat()

        response = self._client.get("/metrics", params=params if params else None)
        return MetricsResponse.model_validate_json(response.text)


class AsyncMetricsResource:
    """Asynchronous resource for metrics operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def get(
        self,
        *,
        organization_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> MetricsResponse:
        """Get usage metrics for the organization.

        Args:
            organization_id: Organization ID
            start_date: Metrics start date (ISO 8601)
            end_date: Metrics end date (ISO 8601)

        Returns:
            Metrics data
        """
        params: dict[str, str] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if start_date is not None:
            params["startDate"] = start_date.isoformat()
        if end_date is not None:
            params["endDate"] = end_date.isoformat()

        response = await self._client.get("/metrics", params=params if params else None)
        return MetricsResponse.model_validate_json(response.text)
