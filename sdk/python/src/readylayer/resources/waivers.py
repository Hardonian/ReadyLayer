"""Waivers resource for the ReadyLayer API.

This module provides sync and async resources for managing policy waivers.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from readylayer.types import (
    CreateWaiverRequest,
    Waiver,
    WaiverListResponse,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class WaiversResource:
    """Synchronous resource for waiver operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> WaiverListResponse:
        """List all waivers.

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of waivers with pagination info
        """
        params: Dict[str, Any] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = self._client.get("/waivers", params=params)
        return WaiverListResponse.model_validate_json(response.text)

    def create(self, request: CreateWaiverRequest) -> Waiver:
        """Create a new waiver.

        Args:
            request: Waiver creation request

        Returns:
            Created waiver
        """
        response = self._client.post("/waivers", json_data=request.model_dump(by_alias=True))
        return Waiver.model_validate_json(response.text)

    def get(self, waiver_id: str) -> Waiver:
        """Get a specific waiver by ID.

        Args:
            waiver_id: Waiver ID

        Returns:
            Waiver details
        """
        response = self._client.get(f"/waivers/{waiver_id}")
        return Waiver.model_validate_json(response.text)

    def delete(self, waiver_id: str) -> None:
        """Revoke (delete) a waiver.

        Args:
            waiver_id: Waiver ID
        """
        self._client.delete(f"/waivers/{waiver_id}")

    def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
    ) -> List[Waiver]:
        """List all waivers (paginated).

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID

        Returns:
            List of all waivers
        """
        results: List[Waiver] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                organization_id=organization_id,
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.waivers)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncWaiversResource:
    """Asynchronous resource for waiver operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> WaiverListResponse:
        """List all waivers.

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of waivers with pagination info
        """
        params: Dict[str, Any] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = await self._client.get("/waivers", params=params)
        return WaiverListResponse.model_validate_json(response.text)

    async def create(self, request: CreateWaiverRequest) -> Waiver:
        """Create a new waiver.

        Args:
            request: Waiver creation request

        Returns:
            Created waiver
        """
        response = await self._client.post("/waivers", json_data=request.model_dump(by_alias=True))
        return Waiver.model_validate_json(response.text)

    async def get(self, waiver_id: str) -> Waiver:
        """Get a specific waiver by ID.

        Args:
            waiver_id: Waiver ID

        Returns:
            Waiver details
        """
        response = await self._client.get(f"/waivers/{waiver_id}")
        return Waiver.model_validate_json(response.text)

    async def delete(self, waiver_id: str) -> None:
        """Revoke (delete) a waiver.

        Args:
            waiver_id: Waiver ID
        """
        await self._client.delete(f"/waivers/{waiver_id}")

    async def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
    ) -> List[Waiver]:
        """List all waivers (paginated).

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID

        Returns:
            List of all waivers
        """
        results: List[Waiver] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                organization_id=organization_id,
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.waivers)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
