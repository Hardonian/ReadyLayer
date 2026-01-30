"""Repositories resource for the ReadyLayer API.

This module provides sync and async resources for managing repositories.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

from readylayer.types import (
    CreateRepositoryRequest,
    Repository,
    RepositoryListResponse,
    TestConnectionResponse,
    UpdateRepositoryRequest,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class RepositoriesResource:
    """Synchronous resource for repository operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        organization_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> RepositoryListResponse:
        """List all repositories accessible to the authenticated user.

        Args:
            organization_id: Filter by organization ID
            limit: Number of results to return (default: 20, max: 100)
            offset: Number of results to skip

        Returns:
            List of repositories with pagination info
        """
        params: Dict[str, Any] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = self._client.get("/repos", params=params)
        return RepositoryListResponse.model_validate_json(response.text)

    def create(self, request: CreateRepositoryRequest) -> Repository:
        """Create a new repository.

        Args:
            request: Repository creation request

        Returns:
            Created repository
        """
        response = self._client.post("/repos", json_data=request.model_dump(by_alias=True))
        return Repository.model_validate_json(response.text)

    def get(self, repo_id: str) -> Repository:
        """Get a specific repository by ID.

        Args:
            repo_id: Repository ID

        Returns:
            Repository details
        """
        response = self._client.get(f"/repos/{repo_id}")
        return Repository.model_validate_json(response.text)

    def update(self, repo_id: str, request: UpdateRepositoryRequest) -> Repository:
        """Update repository settings.

        Args:
            repo_id: Repository ID
            request: Repository update request

        Returns:
            Updated repository
        """
        response = self._client.put(
            f"/repos/{repo_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return Repository.model_validate_json(response.text)

    def delete(self, repo_id: str) -> None:
        """Delete a repository and all associated data.

        Args:
            repo_id: Repository ID
        """
        self._client.delete(f"/repos/{repo_id}")

    def test_connection(self, repo_id: str) -> TestConnectionResponse:
        """Test connectivity to the repository provider.

        Args:
            repo_id: Repository ID

        Returns:
            Connection test result
        """
        response = self._client.post(f"/repos/{repo_id}/test-connection")
        return TestConnectionResponse.model_validate_json(response.text)

    def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
    ) -> List[Repository]:
        """List all repositories (paginated).

        This method automatically handles pagination and returns all repositories.

        Args:
            organization_id: Filter by organization ID

        Returns:
            List of all repositories
        """
        results: List[Repository] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                organization_id=organization_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.repositories)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncRepositoriesResource:
    """Asynchronous resource for repository operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        organization_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> RepositoryListResponse:
        """List all repositories accessible to the authenticated user.

        Args:
            organization_id: Filter by organization ID
            limit: Number of results to return (default: 20, max: 100)
            offset: Number of results to skip

        Returns:
            List of repositories with pagination info
        """
        params: Dict[str, Any] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = await self._client.get("/repos", params=params)
        return RepositoryListResponse.model_validate_json(response.text)

    async def create(self, request: CreateRepositoryRequest) -> Repository:
        """Create a new repository.

        Args:
            request: Repository creation request

        Returns:
            Created repository
        """
        response = await self._client.post("/repos", json_data=request.model_dump(by_alias=True))
        return Repository.model_validate_json(response.text)

    async def get(self, repo_id: str) -> Repository:
        """Get a specific repository by ID.

        Args:
            repo_id: Repository ID

        Returns:
            Repository details
        """
        response = await self._client.get(f"/repos/{repo_id}")
        return Repository.model_validate_json(response.text)

    async def update(self, repo_id: str, request: UpdateRepositoryRequest) -> Repository:
        """Update repository settings.

        Args:
            repo_id: Repository ID
            request: Repository update request

        Returns:
            Updated repository
        """
        response = await self._client.put(
            f"/repos/{repo_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return Repository.model_validate_json(response.text)

    async def delete(self, repo_id: str) -> None:
        """Delete a repository and all associated data.

        Args:
            repo_id: Repository ID
        """
        await self._client.delete(f"/repos/{repo_id}")

    async def test_connection(self, repo_id: str) -> TestConnectionResponse:
        """Test connectivity to the repository provider.

        Args:
            repo_id: Repository ID

        Returns:
            Connection test result
        """
        response = await self._client.post(f"/repos/{repo_id}/test-connection")
        return TestConnectionResponse.model_validate_json(response.text)

    async def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
    ) -> List[Repository]:
        """List all repositories (paginated).

        This method automatically handles pagination and returns all repositories.

        Args:
            organization_id: Filter by organization ID

        Returns:
            List of all repositories
        """
        results: List[Repository] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                organization_id=organization_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.repositories)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
