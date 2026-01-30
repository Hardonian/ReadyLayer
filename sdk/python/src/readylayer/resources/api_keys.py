"""API Keys resource for the ReadyLayer API.

This module provides sync and async resources for managing API keys.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, List

from readylayer.types import (
    ApiKey,
    ApiKeyListResponse,
    CreateApiKeyRequest,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class ApiKeysResource:
    """Synchronous resource for API key operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(self) -> ApiKeyListResponse:
        """List all API keys for the user.

        Returns:
            List of API keys
        """
        response = self._client.get("/api-keys")
        return ApiKeyListResponse.model_validate_json(response.text)

    def create(self, request: CreateApiKeyRequest) -> ApiKey:
        """Create a new API key.

        Args:
            request: API key creation request

        Returns:
            Created API key
        """
        response = self._client.post("/api-keys", json_data=request.model_dump(by_alias=True))
        return ApiKey.model_validate_json(response.text)

    def delete(self, key_id: str) -> None:
        """Revoke (delete) an API key.

        Args:
            key_id: API key ID
        """
        self._client.delete(f"/api-keys/{key_id}")

    def list_all(self) -> List[ApiKey]:
        """List all API keys.

        Returns:
            List of all API keys
        """
        response = self.list()
        return response.keys


class AsyncApiKeysResource:
    """Asynchronous resource for API key operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(self) -> ApiKeyListResponse:
        """List all API keys for the user.

        Returns:
            List of API keys
        """
        response = await self._client.get("/api-keys")
        return ApiKeyListResponse.model_validate_json(response.text)

    async def create(self, request: CreateApiKeyRequest) -> ApiKey:
        """Create a new API key.

        Args:
            request: API key creation request

        Returns:
            Created API key
        """
        response = await self._client.post("/api-keys", json_data=request.model_dump(by_alias=True))
        return ApiKey.model_validate_json(response.text)

    async def delete(self, key_id: str) -> None:
        """Revoke (delete) an API key.

        Args:
            key_id: API key ID
        """
        await self._client.delete(f"/api-keys/{key_id}")

    async def list_all(self) -> List[ApiKey]:
        """List all API keys.

        Returns:
            List of all API keys
        """
        response = await self.list()
        return response.keys
