"""Evidence resource for the ReadyLayer API.

This module provides sync and async resources for managing evidence bundles.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from readylayer.types import (
    EvidenceBundle,
    EvidenceListResponse,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class EvidenceResource:
    """Synchronous resource for evidence operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        review_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> EvidenceListResponse:
        """List all evidence bundles.

        Args:
            review_id: Filter by review ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of evidence bundles with pagination info
        """
        params: Dict[str, Any] = {}
        if review_id is not None:
            params["reviewId"] = review_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = self._client.get("/evidence", params=params)
        return EvidenceListResponse.model_validate_json(response.text)

    def get(self, bundle_id: str) -> EvidenceBundle:
        """Get a specific evidence bundle by ID.

        Args:
            bundle_id: Evidence bundle ID

        Returns:
            Evidence bundle details
        """
        response = self._client.get(f"/evidence/{bundle_id}")
        return EvidenceBundle.model_validate_json(response.text)

    def export(self, bundle_id: str) -> Dict[str, Any]:
        """Export evidence bundle as JSON.

        Args:
            bundle_id: Evidence bundle ID

        Returns:
            Exported evidence JSON
        """
        response = self._client.get(f"/evidence/{bundle_id}/export")
        return response.json()

    def list_all(
        self,
        *,
        review_id: Optional[str] = None,
    ) -> List[EvidenceBundle]:
        """List all evidence bundles (paginated).

        Args:
            review_id: Filter by review ID

        Returns:
            List of all evidence bundles
        """
        results: List[EvidenceBundle] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                review_id=review_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.bundles)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncEvidenceResource:
    """Asynchronous resource for evidence operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        review_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> EvidenceListResponse:
        """List all evidence bundles.

        Args:
            review_id: Filter by review ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of evidence bundles with pagination info
        """
        params: Dict[str, Any] = {}
        if review_id is not None:
            params["reviewId"] = review_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = await self._client.get("/evidence", params=params)
        return EvidenceListResponse.model_validate_json(response.text)

    async def get(self, bundle_id: str) -> EvidenceBundle:
        """Get a specific evidence bundle by ID.

        Args:
            bundle_id: Evidence bundle ID

        Returns:
            Evidence bundle details
        """
        response = await self._client.get(f"/evidence/{bundle_id}")
        return EvidenceBundle.model_validate_json(response.text)

    async def export(self, bundle_id: str) -> Dict[str, Any]:
        """Export evidence bundle as JSON.

        Args:
            bundle_id: Evidence bundle ID

        Returns:
            Exported evidence JSON
        """
        response = await self._client.get(f"/evidence/{bundle_id}/export")
        return response.json()

    async def list_all(
        self,
        *,
        review_id: Optional[str] = None,
    ) -> List[EvidenceBundle]:
        """List all evidence bundles (paginated).

        Args:
            review_id: Filter by review ID

        Returns:
            List of all evidence bundles
        """
        results: List[EvidenceBundle] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                review_id=review_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.bundles)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
