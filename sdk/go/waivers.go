package readylayer

import (
	"context"
	"fmt"
)

// WaiversService handles policy waiver operations.
type WaiversService struct {
	client *Client
}

// List returns a list of waivers.
func (s *WaiversService) List(ctx context.Context, opts *WaiverListOptions) (*WaiverListResponse, error) {
	if opts == nil {
		opts = &WaiverListOptions{}
	}
	resp := &WaiverListResponse{}
	err := s.client.getWithQuery(ctx, "/waivers", opts, resp)
	return resp, err
}

// Get retrieves a specific waiver by ID.
func (s *WaiversService) Get(ctx context.Context, waiverID string) (*Waiver, error) {
	waiver := &Waiver{}
	path := fmt.Sprintf("/waivers/%s", waiverID)
	err := s.client.get(ctx, path, waiver)
	return waiver, err
}

// Create creates a new waiver.
func (s *WaiversService) Create(ctx context.Context, req *CreateWaiverRequest) (*Waiver, error) {
	waiver := &Waiver{}
	err := s.client.post(ctx, "/waivers", req, waiver)
	return waiver, err
}

// Delete revokes (deletes) a waiver.
func (s *WaiversService) Delete(ctx context.Context, waiverID string) error {
	path := fmt.Sprintf("/waivers/%s", waiverID)
	return s.client.delete(ctx, path)
}
