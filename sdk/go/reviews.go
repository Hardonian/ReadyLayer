package readylayer

import (
	"context"
	"fmt"
)

// ReviewsService handles code review operations.
type ReviewsService struct {
	client *Client
}

// List returns a list of reviews.
func (s *ReviewsService) List(ctx context.Context, opts *ReviewListOptions) (*ReviewListResponse, error) {
	if opts == nil {
		opts = &ReviewListOptions{}
	}
	resp := &ReviewListResponse{}
	err := s.client.getWithQuery(ctx, "/reviews", opts, resp)
	return resp, err
}

// Get retrieves a specific review by ID.
func (s *ReviewsService) Get(ctx context.Context, reviewID string) (*Review, error) {
	review := &Review{}
	path := fmt.Sprintf("/reviews/%s", reviewID)
	err := s.client.get(ctx, path, review)
	return review, err
}

// Create creates a new code review.
func (s *ReviewsService) Create(ctx context.Context, req *CreateReviewRequest) (*Review, error) {
	review := &Review{}
	err := s.client.post(ctx, "/reviews", req, review)
	return review, err
}
