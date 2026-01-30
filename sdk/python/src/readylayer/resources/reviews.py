"""Reviews resource for the ReadyLayer API.

This module provides sync and async resources for managing code reviews.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from readylayer.types import (
    CreateReviewRequest,
    Review,
    ReviewListResponse,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class ReviewsResource:
    """Synchronous resource for review operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        repository_id: Optional[str] = None,
        pr_number: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        select: Optional[str] = None,
    ) -> ReviewListResponse:
        """List all reviews.

        Args:
            repository_id: Filter by repository ID
            pr_number: Filter by PR number
            limit: Number of results to return
            offset: Number of results to skip
            select: Comma-separated list of fields to return

        Returns:
            List of reviews with pagination info
        """
        params: Dict[str, Any] = {}
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if pr_number is not None:
            params["prNumber"] = pr_number
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if select is not None:
            params["select"] = select

        response = self._client.get("/reviews", params=params)
        return ReviewListResponse.model_validate_json(response.text)

    def create(self, request: CreateReviewRequest) -> Review:
        """Create a new code review.

        Args:
            request: Review creation request

        Returns:
            Created review
        """
        response = self._client.post("/reviews", json_data=request.model_dump(by_alias=True))
        return Review.model_validate_json(response.text)

    def get(self, review_id: str) -> Review:
        """Get a specific review by ID.

        Args:
            review_id: Review ID

        Returns:
            Review details
        """
        response = self._client.get(f"/reviews/{review_id}")
        return Review.model_validate_json(response.text)

    def list_all(
        self,
        *,
        repository_id: Optional[str] = None,
        pr_number: Optional[int] = None,
    ) -> List[Review]:
        """List all reviews (paginated).

        Args:
            repository_id: Filter by repository ID
            pr_number: Filter by PR number

        Returns:
            List of all reviews
        """
        results: List[Review] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                repository_id=repository_id,
                pr_number=pr_number,
                limit=limit,
                offset=offset,
            )
            results.extend(page.data)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncReviewsResource:
    """Asynchronous resource for review operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        repository_id: Optional[str] = None,
        pr_number: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        select: Optional[str] = None,
    ) -> ReviewListResponse:
        """List all reviews.

        Args:
            repository_id: Filter by repository ID
            pr_number: Filter by PR number
            limit: Number of results to return
            offset: Number of results to skip
            select: Comma-separated list of fields to return

        Returns:
            List of reviews with pagination info
        """
        params: Dict[str, Any] = {}
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if pr_number is not None:
            params["prNumber"] = pr_number
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if select is not None:
            params["select"] = select

        response = await self._client.get("/reviews", params=params)
        return ReviewListResponse.model_validate_json(response.text)

    async def create(self, request: CreateReviewRequest) -> Review:
        """Create a new code review.

        Args:
            request: Review creation request

        Returns:
            Created review
        """
        response = await self._client.post("/reviews", json_data=request.model_dump(by_alias=True))
        return Review.model_validate_json(response.text)

    async def get(self, review_id: str) -> Review:
        """Get a specific review by ID.

        Args:
            review_id: Review ID

        Returns:
            Review details
        """
        response = await self._client.get(f"/reviews/{review_id}")
        return Review.model_validate_json(response.text)

    async def list_all(
        self,
        *,
        repository_id: Optional[str] = None,
        pr_number: Optional[int] = None,
    ) -> List[Review]:
        """List all reviews (paginated).

        Args:
            repository_id: Filter by repository ID
            pr_number: Filter by PR number

        Returns:
            List of all reviews
        """
        results: List[Review] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                repository_id=repository_id,
                pr_number=pr_number,
                limit=limit,
                offset=offset,
            )
            results.extend(page.data)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
