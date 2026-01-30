"""Policies resource for the ReadyLayer API.

This module provides sync and async resources for managing policy packs and rules.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from readylayer.types import (
    CreatePolicyPackRequest,
    CreatePolicyRuleRequest,
    PolicyPack,
    PolicyPackListResponse,
    PolicyRule,
    PolicyRuleListResponse,
    PolicyTemplateListResponse,
    PolicyValidationResult,
    UpdatePolicyPackRequest,
    UpdatePolicyRuleRequest,
    ValidatePolicyRequest,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class PoliciesResource:
    """Synchronous resource for policy operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def list(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> PolicyPackListResponse:
        """List all policy packs.

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of policy packs with pagination info
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

        response = self._client.get("/policies", params=params)
        return PolicyPackListResponse.model_validate_json(response.text)

    def create(self, request: CreatePolicyPackRequest) -> PolicyPack:
        """Create a new policy pack.

        Args:
            request: Policy pack creation request

        Returns:
            Created policy pack
        """
        response = self._client.post("/policies", json_data=request.model_dump(by_alias=True))
        return PolicyPack.model_validate_json(response.text)

    def get(self, pack_id: str) -> PolicyPack:
        """Get a specific policy pack by ID.

        Args:
            pack_id: Policy pack ID

        Returns:
            Policy pack details
        """
        response = self._client.get(f"/policies/{pack_id}")
        return PolicyPack.model_validate_json(response.text)

    def update(self, pack_id: str, request: UpdatePolicyPackRequest) -> PolicyPack:
        """Update a policy pack.

        Args:
            pack_id: Policy pack ID
            request: Policy pack update request

        Returns:
            Updated policy pack
        """
        response = self._client.put(
            f"/policies/{pack_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return PolicyPack.model_validate_json(response.text)

    def delete(self, pack_id: str) -> None:
        """Delete a policy pack.

        Args:
            pack_id: Policy pack ID
        """
        self._client.delete(f"/policies/{pack_id}")

    def list_rules(self, pack_id: str) -> PolicyRuleListResponse:
        """List all rules in a policy pack.

        Args:
            pack_id: Policy pack ID

        Returns:
            List of policy rules
        """
        response = self._client.get(f"/policies/{pack_id}/rules")
        return PolicyRuleListResponse.model_validate_json(response.text)

    def create_rule(self, pack_id: str, request: CreatePolicyRuleRequest) -> PolicyRule:
        """Add a rule to a policy pack.

        Args:
            pack_id: Policy pack ID
            request: Rule creation request

        Returns:
            Created policy rule
        """
        response = self._client.post(
            f"/policies/{pack_id}/rules",
            json_data=request.model_dump(by_alias=True),
        )
        return PolicyRule.model_validate_json(response.text)

    def update_rule(
        self, pack_id: str, rule_id: str, request: UpdatePolicyRuleRequest
    ) -> PolicyRule:
        """Update a rule in a policy pack.

        Args:
            pack_id: Policy pack ID
            rule_id: Rule ID
            request: Rule update request

        Returns:
            Updated policy rule
        """
        response = self._client.put(
            f"/policies/{pack_id}/rules/{rule_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return PolicyRule.model_validate_json(response.text)

    def delete_rule(self, pack_id: str, rule_id: str) -> None:
        """Delete a rule from a policy pack.

        Args:
            pack_id: Policy pack ID
            rule_id: Rule ID
        """
        self._client.delete(f"/policies/{pack_id}/rules/{rule_id}")

    def validate(self, request: ValidatePolicyRequest) -> PolicyValidationResult:
        """Validate policy YAML/JSON syntax and configuration.

        Args:
            request: Validation request with policy source

        Returns:
            Validation result
        """
        response = self._client.post(
            "/policies/validate",
            json_data=request.model_dump(by_alias=True),
        )
        return PolicyValidationResult.model_validate_json(response.text)

    def list_templates(self) -> PolicyTemplateListResponse:
        """List available policy templates.

        Returns:
            List of policy templates
        """
        response = self._client.get("/policies/templates")
        return PolicyTemplateListResponse.model_validate_json(response.text)

    def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
    ) -> List[PolicyPack]:
        """List all policy packs (paginated).

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID

        Returns:
            List of all policy packs
        """
        results: List[PolicyPack] = []
        offset = 0
        limit = 100

        while True:
            page = self.list(
                organization_id=organization_id,
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.policies)

            if not page.pagination.has_more:
                break

            offset += limit

        return results


class AsyncPoliciesResource:
    """Asynchronous resource for policy operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> PolicyPackListResponse:
        """List all policy packs.

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID
            limit: Number of results to return
            offset: Number of results to skip

        Returns:
            List of policy packs with pagination info
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

        response = await self._client.get("/policies", params=params)
        return PolicyPackListResponse.model_validate_json(response.text)

    async def create(self, request: CreatePolicyPackRequest) -> PolicyPack:
        """Create a new policy pack.

        Args:
            request: Policy pack creation request

        Returns:
            Created policy pack
        """
        response = await self._client.post("/policies", json_data=request.model_dump(by_alias=True))
        return PolicyPack.model_validate_json(response.text)

    async def get(self, pack_id: str) -> PolicyPack:
        """Get a specific policy pack by ID.

        Args:
            pack_id: Policy pack ID

        Returns:
            Policy pack details
        """
        response = await self._client.get(f"/policies/{pack_id}")
        return PolicyPack.model_validate_json(response.text)

    async def update(self, pack_id: str, request: UpdatePolicyPackRequest) -> PolicyPack:
        """Update a policy pack.

        Args:
            pack_id: Policy pack ID
            request: Policy pack update request

        Returns:
            Updated policy pack
        """
        response = await self._client.put(
            f"/policies/{pack_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return PolicyPack.model_validate_json(response.text)

    async def delete(self, pack_id: str) -> None:
        """Delete a policy pack.

        Args:
            pack_id: Policy pack ID
        """
        await self._client.delete(f"/policies/{pack_id}")

    async def list_rules(self, pack_id: str) -> PolicyRuleListResponse:
        """List all rules in a policy pack.

        Args:
            pack_id: Policy pack ID

        Returns:
            List of policy rules
        """
        response = await self._client.get(f"/policies/{pack_id}/rules")
        return PolicyRuleListResponse.model_validate_json(response.text)

    async def create_rule(self, pack_id: str, request: CreatePolicyRuleRequest) -> PolicyRule:
        """Add a rule to a policy pack.

        Args:
            pack_id: Policy pack ID
            request: Rule creation request

        Returns:
            Created policy rule
        """
        response = await self._client.post(
            f"/policies/{pack_id}/rules",
            json_data=request.model_dump(by_alias=True),
        )
        return PolicyRule.model_validate_json(response.text)

    async def update_rule(
        self, pack_id: str, rule_id: str, request: UpdatePolicyRuleRequest
    ) -> PolicyRule:
        """Update a rule in a policy pack.

        Args:
            pack_id: Policy pack ID
            rule_id: Rule ID
            request: Rule update request

        Returns:
            Updated policy rule
        """
        response = await self._client.put(
            f"/policies/{pack_id}/rules/{rule_id}",
            json_data=request.model_dump(by_alias=True, exclude_none=True),
        )
        return PolicyRule.model_validate_json(response.text)

    async def delete_rule(self, pack_id: str, rule_id: str) -> None:
        """Delete a rule from a policy pack.

        Args:
            pack_id: Policy pack ID
            rule_id: Rule ID
        """
        await self._client.delete(f"/policies/{pack_id}/rules/{rule_id}")

    async def validate(self, request: ValidatePolicyRequest) -> PolicyValidationResult:
        """Validate policy YAML/JSON syntax and configuration.

        Args:
            request: Validation request with policy source

        Returns:
            Validation result
        """
        response = await self._client.post(
            "/policies/validate",
            json_data=request.model_dump(by_alias=True),
        )
        return PolicyValidationResult.model_validate_json(response.text)

    async def list_templates(self) -> PolicyTemplateListResponse:
        """List available policy templates.

        Returns:
            List of policy templates
        """
        response = await self._client.get("/policies/templates")
        return PolicyTemplateListResponse.model_validate_json(response.text)

    async def list_all(
        self,
        *,
        organization_id: Optional[str] = None,
        repository_id: Optional[str] = None,
    ) -> List[PolicyPack]:
        """List all policy packs (paginated).

        Args:
            organization_id: Filter by organization ID
            repository_id: Filter by repository ID

        Returns:
            List of all policy packs
        """
        results: List[PolicyPack] = []
        offset = 0
        limit = 100

        while True:
            page = await self.list(
                organization_id=organization_id,
                repository_id=repository_id,
                limit=limit,
                offset=offset,
            )
            results.extend(page.policies)

            if not page.pagination.has_more:
                break

            offset += limit

        return results
