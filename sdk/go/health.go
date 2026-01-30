package readylayer

import (
	"context"
)

// HealthService handles health and readiness checks.
type HealthService struct {
	client *Client
}

// GetHealth returns the service health status.
func (s *HealthService) GetHealth(ctx context.Context) (*HealthResponse, error) {
	resp := &HealthResponse{}
	err := s.client.get(ctx, "/health", resp)
	return resp, err
}

// GetReady returns the service readiness status including dependencies.
func (s *HealthService) GetReady(ctx context.Context) (*ReadyResponse, error) {
	resp := &ReadyResponse{}
	err := s.client.get(ctx, "/ready", resp)
	return resp, err
}
