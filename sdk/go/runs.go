package readylayer

import (
	"context"
	"fmt"
)

// RunsService handles test run operations.
type RunsService struct {
	client *Client
}

// List returns a list of test runs.
func (s *RunsService) List(ctx context.Context, opts *RunListOptions) (*RunListResponse, error) {
	if opts == nil {
		opts = &RunListOptions{}
	}
	resp := &RunListResponse{}
	err := s.client.getWithQuery(ctx, "/runs", opts, resp)
	return resp, err
}

// Get retrieves a specific test run by ID.
func (s *RunsService) Get(ctx context.Context, runID string) (*Run, error) {
	run := &Run{}
	path := fmt.Sprintf("/runs/%s", runID)
	err := s.client.get(ctx, path, run)
	return run, err
}

// Create creates a new test run.
func (s *RunsService) Create(ctx context.Context, req *CreateRunRequest) (*Run, error) {
	run := &Run{}
	err := s.client.post(ctx, "/runs", req, run)
	return run, err
}

// CreateSandbox creates a new sandbox test run.
func (s *RunsService) CreateSandbox(ctx context.Context, req *CreateSandboxRunRequest) (*Run, error) {
	run := &Run{}
	err := s.client.post(ctx, "/runs/sandbox", req, run)
	return run, err
}
