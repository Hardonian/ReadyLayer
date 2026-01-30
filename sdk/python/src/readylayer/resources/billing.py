"""Billing resource for the ReadyLayer API.

This module provides sync and async resources for managing billing.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from readylayer.types import (
    BillingTierResponse,
    CheckoutSessionResponse,
    CreateCheckoutRequest,
)

if TYPE_CHECKING:
    from readylayer.client import AsyncClient, SyncClient


class BillingResource:
    """Synchronous resource for billing operations."""

    def __init__(self, client: SyncClient) -> None:
        self._client = client

    def get_tier(
        self,
        *,
        organization_id: Optional[str] = None,
    ) -> BillingTierResponse:
        """Get current billing tier and usage.

        Args:
            organization_id: Organization ID (optional)

        Returns:
            Billing tier information with usage
        """
        params: dict[str, str] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id

        response = self._client.get("/billing/tier", params=params if params else None)
        return BillingTierResponse.model_validate_json(response.text)

    def create_checkout_session(self, request: CreateCheckoutRequest) -> CheckoutSessionResponse:
        """Create a Stripe checkout session for subscription.

        Args:
            request: Checkout session creation request

        Returns:
            Checkout session with URL
        """
        response = self._client.post(
            "/billing/checkout",
            json_data=request.model_dump(by_alias=True),
        )
        return CheckoutSessionResponse.model_validate_json(response.text)


class AsyncBillingResource:
    """Asynchronous resource for billing operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def get_tier(
        self,
        *,
        organization_id: Optional[str] = None,
    ) -> BillingTierResponse:
        """Get current billing tier and usage.

        Args:
            organization_id: Organization ID (optional)

        Returns:
            Billing tier information with usage
        """
        params: dict[str, str] = {}
        if organization_id is not None:
            params["organizationId"] = organization_id

        response = await self._client.get("/billing/tier", params=params if params else None)
        return BillingTierResponse.model_validate_json(response.text)

    async def create_checkout_session(
        self, request: CreateCheckoutRequest
    ) -> CheckoutSessionResponse:
        """Create a Stripe checkout session for subscription.

        Args:
            request: Checkout session creation request

        Returns:
            Checkout session with URL
        """
        response = await self._client.post(
            "/billing/checkout",
            json_data=request.model_dump(by_alias=True),
        )
        return CheckoutSessionResponse.model_validate_json(response.text)
