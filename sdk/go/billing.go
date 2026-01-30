package readylayer

import (
	"context"
)

// BillingService handles billing and subscription operations.
type BillingService struct {
	client *Client
}

// GetTier returns the current billing tier and usage.
func (s *BillingService) GetTier(ctx context.Context, organizationID string) (*BillingTierResponse, error) {
	opts := struct {
		OrganizationID string `url:"organizationId,omitempty"`
	}{
		OrganizationID: organizationID,
	}
	resp := &BillingTierResponse{}
	err := s.client.getWithQuery(ctx, "/billing/tier", opts, resp)
	return resp, err
}

// CreateCheckoutSession creates a Stripe checkout session for subscription.
func (s *BillingService) CreateCheckoutSession(ctx context.Context, req *CreateCheckoutRequest) (*CheckoutSessionResponse, error) {
	resp := &CheckoutSessionResponse{}
	err := s.client.post(ctx, "/billing/checkout", req, resp)
	return resp, err
}
