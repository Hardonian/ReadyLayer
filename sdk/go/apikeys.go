package readylayer

import (
	"context"
	"fmt"
)

// APIKeysService handles API key operations.
type APIKeysService struct {
	client *Client
}

// List returns a list of API keys for the user.
func (s *APIKeysService) List(ctx context.Context) (*ApiKeyListResponse, error) {
	resp := &ApiKeyListResponse{}
	err := s.client.get(ctx, "/api-keys", resp)
	return resp, err
}

// Create creates a new API key.
func (s *APIKeysService) Create(ctx context.Context, req *CreateApiKeyRequest) (*APIKey, error) {
	key := &APIKey{}
	err := s.client.post(ctx, "/api-keys", req, key)
	return key, err
}

// Delete revokes (deletes) an API key.
func (s *APIKeysService) Delete(ctx context.Context, keyID string) error {
	path := fmt.Sprintf("/api-keys/%s", keyID)
	return s.client.delete(ctx, path)
}
