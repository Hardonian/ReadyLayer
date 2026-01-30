"""Runs resource for the ReadyLayer API.

This module provides sync and async resources for managing test runs.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from readylayer.types import (
    CreateRunRequest,
    CreateSandboxRunRequest,
    Run,
    RunListResponse,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class RunsResource:
    """Synchronous resource for run operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> RunListResponse:
        """List all test runs.

        Args:
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of test runs with pagination info
        """
        params: Dict[str, Any] = {}
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = self._client.get("/runs", params=params)
        return RunListResponse.model_validate_json(response.text)

    def create(self, request: CreateRunRequest) -> Run:
        """Create a new test run.

        Args:
            request: Run creation request

        Returns:
            Created run
        """
        response = self._client.post("/runs", json_data=request.model_dump(by_alias=True))
        return Run.model_validate_json(response.text)

    def get(self, run_id: str) -> Run:
        """Get a specific test run by ID.

        Args:
            run_id: Run ID

        Returns:
            Run details
        """
        response = self._client.get(f"/runs/{run_id}")
        return Run.model_validate_json(response.text)

    def create_sandbox(self, request: CreateSandboxRunRequest) -> Run:
        """Create a new sandbox test run.

        Args:
            request: Sandbox run creation request

        Returns:
            Created run
        """
        response = self._client.post(
            "/runs/sandbox",
            json_data=request.model_dump(by_alias=True),
        )
        return Run.model_validate_json(response.text)

    def list_all(
        self,
        *,
        repository_id: Optional[str] = None,
    ) -> List[Run]:
        """List all test runs (paginated).

        Args:
            repository_id: Filter by repository ID

        Returns:
            List of all test runs
        """
        results: List[Run] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.data)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncRunsResource:
    """Asynchronous resource for run operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> RunListResponse:
        """List all test runs.

        Args:
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of test runs with pagination info
        """
        params: Dict[str, Any] = {}
        if repository_id is not None:
            params["repositoryId"] = repository_id
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = await self._client.get("/runs", params=params)
        return RunListResponse.model_validate_json(response.text)

    async def create(self, request: CreateRunRequest) -> Run:
        """Create a new test run.

        Args:
            request: Run creation request

        Returns:
            Created run
        """
        response = await self._client.post("/runs", json_data=request.model_dump(by_alias=True))
        return Run.model_validate_json(response.text)

    async def get(self, run_id: str) -> Run:
        """Get a specific test run by ID.

        Args:
            run_id: Run ID

        Returns:
            Run details
        """
        response = await self._client.get(f"/runs/{run_id}")
        return Run.model_validate_json(response.text)

    async def create_sandbox(self, request: CreateSandboxRunRequest) -> Run:
        """Create a new sandbox test run.

        Args:
            request: Sandbox run creation request

        Returns:
            Created run
        """
        response = await self._client.post(
            "/runs/sandbox",
            json_data=request.model_dump(by_alias=True),
        )
        return Run.model_validate_json(response.text)

    async def list_all(
        self,
        *,
        repository_id: Optional[str] = None,
    ) -> List[Run]:
        """List all test runs (paginated).

        Args:
            repository_id: Filter by repository ID

        Returns:
            List of all test runs
        """
        results: List[Run] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.data)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
