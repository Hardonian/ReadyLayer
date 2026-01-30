package readylayer

import (
	"context"
	"fmt"
)

// PoliciesService handles policy pack and rule operations.
type PoliciesService struct {
	client *Client
}

// List returns a list of policy packs.
func (s *PoliciesService) List(ctx context.Context, opts *PolicyListOptions) (*PolicyPackListResponse, error) {
	if opts == nil {
		opts = &PolicyListOptions{}
	}
	resp := &PolicyPackListResponse{}
	err := s.client.getWithQuery(ctx, "/policies", opts, resp)
	return resp, err
}

// Get retrieves a specific policy pack by ID.
func (s *PoliciesService) Get(ctx context.Context, packID string) (*PolicyPack, error) {
	pack := &PolicyPack{}
	path := fmt.Sprintf("/policies/%s", packID)
	err := s.client.get(ctx, path, pack)
	return pack, err
}

// Create creates a new policy pack.
func (s *PoliciesService) Create(ctx context.Context, req *CreatePolicyPackRequest) (*PolicyPack, error) {
	pack := &PolicyPack{}
	err := s.client.post(ctx, "/policies", req, pack)
	return pack, err
}

// Update updates an existing policy pack.
func (s *PoliciesService) Update(ctx context.Context, packID string, req *UpdatePolicyPackRequest) (*PolicyPack, error) {
	pack := &PolicyPack{}
	path := fmt.Sprintf("/policies/%s", packID)
	err := s.client.put(ctx, path, req, pack)
	return pack, err
}

// Delete deletes a policy pack.
func (s *PoliciesService) Delete(ctx context.Context, packID string) error {
	path := fmt.Sprintf("/policies/%s", packID)
	return s.client.delete(ctx, path)
}

// ListRules returns all rules in a policy pack.
func (s *PoliciesService) ListRules(ctx context.Context, packID string) (*PolicyRuleListResponse, error) {
	resp := &PolicyRuleListResponse{}
	path := fmt.Sprintf("/policies/%s/rules", packID)
	err := s.client.get(ctx, path, resp)
	return resp, err
}

// CreateRule adds a rule to a policy pack.
func (s *PoliciesService) CreateRule(ctx context.Context, packID string, req *CreatePolicyRuleRequest) (*PolicyRule, error) {
	rule := &PolicyRule{}
	path := fmt.Sprintf("/policies/%s/rules", packID)
	err := s.client.post(ctx, path, req, rule)
	return rule, err
}

// UpdateRule updates a rule in a policy pack.
func (s *PoliciesService) UpdateRule(ctx context.Context, packID, ruleID string, req *UpdatePolicyRuleRequest) (*PolicyRule, error) {
	rule := &PolicyRule{}
	path := fmt.Sprintf("/policies/%s/rules/%s", packID, ruleID)
	err := s.client.put(ctx, path, req, rule)
	return rule, err
}

// DeleteRule deletes a rule from a policy pack.
func (s *PoliciesService) DeleteRule(ctx context.Context, packID, ruleID string) error {
	path := fmt.Sprintf("/policies/%s/rules/%s", packID, ruleID)
	return s.client.delete(ctx, path)
}

// Validate validates policy YAML/JSON syntax and configuration.
func (s *PoliciesService) Validate(ctx context.Context, req *ValidatePolicyRequest) (*PolicyValidationResult, error) {
	result := &PolicyValidationResult{}
	err := s.client.post(ctx, "/policies/validate", req, result)
	return result, err
}

// ListTemplates returns available policy templates.
func (s *PoliciesService) ListTemplates(ctx context.Context) (*PolicyTemplateListResponse, error) {
	resp := &PolicyTemplateListResponse{}
	err := s.client.get(ctx, "/policies/templates", resp)
	return resp, err
}
