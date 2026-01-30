package readylayer

import (
	"context"
	"fmt"
)

// RepositoriesService handles repository operations.
type RepositoriesService struct {
	client *Client
}

// List returns a list of repositories accessible to the authenticated user.
func (s *RepositoriesService) List(ctx context.Context, opts *RepositoryListOptions) (*RepositoryListResponse, error) {
	if opts == nil {
		opts = &RepositoryListOptions{}
	}
	resp := &RepositoryListResponse{}
	err := s.client.getWithQuery(ctx, "/repos", opts, resp)
	return resp, err
}

// Get retrieves a specific repository by ID.
func (s *RepositoriesService) Get(ctx context.Context, repoID string) (*Repository, error) {
	repo := &Repository{}
	path := fmt.Sprintf("/repos/%s", repoID)
	err := s.client.get(ctx, path, repo)
	return repo, err
}

// Create creates a new repository.
func (s *RepositoriesService) Create(ctx context.Context, req *CreateRepositoryRequest) (*Repository, error) {
	repo := &Repository{}
	err := s.client.post(ctx, "/repos", req, repo)
	return repo, err
}

// Update updates an existing repository.
func (s *RepositoriesService) Update(ctx context.Context, repoID string, req *UpdateRepositoryRequest) (*Repository, error) {
	repo := &Repository{}
	path := fmt.Sprintf("/repos/%s", repoID)
	err := s.client.put(ctx, path, req, repo)
	return repo, err
}

// Delete deletes a repository and all associated data.
func (s *RepositoriesService) Delete(ctx context.Context, repoID string) error {
	path := fmt.Sprintf("/repos/%s", repoID)
	return s.client.delete(ctx, path)
}

// TestConnection tests connectivity to the repository provider.
func (s *RepositoriesService) TestConnection(ctx context.Context, repoID string) (*TestConnectionResponse, error) {
	resp := &TestConnectionResponse{}
	path := fmt.Sprintf("/repos/%s/test-connection", repoID)
	err := s.client.post(ctx, path, nil, resp)
	return resp, err
}
