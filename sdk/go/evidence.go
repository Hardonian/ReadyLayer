package readylayer

import (
	"context"
	"fmt"
	"io"
	"net/http"
)

// EvidenceService handles evidence bundle operations.
type EvidenceService struct {
	client *Client
}

// List returns a list of evidence bundles.
func (s *EvidenceService) List(ctx context.Context, opts *EvidenceListOptions) (*EvidenceListResponse, error) {
	if opts == nil {
		opts = &EvidenceListOptions{}
	}
	resp := &EvidenceListResponse{}
	err := s.client.getWithQuery(ctx, "/evidence", opts, resp)
	return resp, err
}

// Get retrieves a specific evidence bundle by ID.
func (s *EvidenceService) Get(ctx context.Context, bundleID string) (*EvidenceBundle, error) {
	bundle := &EvidenceBundle{}
	path := fmt.Sprintf("/evidence/%s", bundleID)
	err := s.client.get(ctx, path, bundle)
	return bundle, err
}

// Export exports an evidence bundle as JSON.
// Returns the raw JSON data which can be unmarshaled as needed.
func (s *EvidenceService) Export(ctx context.Context, bundleID string) ([]byte, error) {
	path := fmt.Sprintf("/evidence/%s/export", bundleID)

	fullURL, err := s.client.buildURL(path)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.client.apiKey)
	req.Header.Set("User-Agent", s.client.userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
