package readylayer

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	c := NewClient("test-key")
	if c.apiKey != "test-key" {
		t.Errorf("expected apiKey 'test-key', got %q", c.apiKey)
	}
	if c.baseURL != DefaultBaseURL {
		t.Errorf("expected default base URL, got %q", c.baseURL)
	}
	if c.Repositories == nil || c.Policies == nil || c.Reviews == nil ||
		c.Waivers == nil || c.Evidence == nil || c.Runs == nil ||
		c.Billing == nil || c.Health == nil || c.APIKeys == nil {
		t.Error("expected all services to be initialized")
	}
}

func TestClientOptions(t *testing.T) {
	c := NewClient("key",
		WithBaseURL("https://custom.api"),
		WithUserAgent("custom-agent/1.0"),
		WithRetryConfig(5, 2*time.Second, 60*time.Second),
	)
	if c.baseURL != "https://custom.api" {
		t.Errorf("expected custom base URL, got %q", c.baseURL)
	}
	if c.userAgent != "custom-agent/1.0" {
		t.Errorf("expected custom user agent, got %q", c.userAgent)
	}
	if c.maxRetries != 5 {
		t.Errorf("expected 5 max retries, got %d", c.maxRetries)
	}
}

func TestHealthEndpoints(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/health":
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(HealthResponse{
				Status:    HealthStatusHealthy,
				Timestamp: time.Now(),
			})
		case "/ready":
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(ReadyResponse{
				Ready: true,
				Dependencies: Dependencies{
					Database: true,
					Redis:    true,
				},
			})
		default:
			w.WriteHeader(404)
		}
	}))
	defer server.Close()

	c := NewClient("test-key", WithBaseURL(server.URL))
	ctx := context.Background()

	t.Run("GetHealth", func(t *testing.T) {
		health, err := c.Health.GetHealth(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if health.Status != HealthStatusHealthy {
			t.Errorf("expected healthy, got %q", health.Status)
		}
	})

	t.Run("GetReady", func(t *testing.T) {
		ready, err := c.Health.GetReady(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !ready.Ready {
			t.Error("expected ready to be true")
		}
	})
}

func TestRepositoryEndpoints(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify auth header
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-key" {
			w.WriteHeader(401)
			json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{"code": "unauthorized", "message": "bad token"},
			})
			return
		}

		switch {
		case r.URL.Path == "/repos" && r.Method == "GET":
			json.NewEncoder(w).Encode(RepositoryListResponse{
				Repositories: []Repository{{ID: "r1", Name: "test", FullName: "org/test", Provider: ProviderGitHub, Enabled: true}},
				Pagination:   Pagination{Total: 1, Limit: 20, Offset: 0, HasMore: false},
			})
		case r.URL.Path == "/repos" && r.Method == "POST":
			w.WriteHeader(201)
			json.NewEncoder(w).Encode(Repository{ID: "r2", Name: "new", FullName: "org/new", Provider: ProviderGitHub})
		case r.URL.Path == "/repos/r1" && r.Method == "DELETE":
			w.WriteHeader(204)
		default:
			w.WriteHeader(404)
		}
	}))
	defer server.Close()

	c := NewClient("test-key", WithBaseURL(server.URL))
	ctx := context.Background()

	t.Run("List", func(t *testing.T) {
		resp, err := c.Repositories.List(ctx, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(resp.Repositories) != 1 {
			t.Errorf("expected 1 repo, got %d", len(resp.Repositories))
		}
	})

	t.Run("Create", func(t *testing.T) {
		repo, err := c.Repositories.Create(ctx, &CreateRepositoryRequest{
			OrganizationID: "org1",
			Name:           "new",
			FullName:       "org/new",
			Provider:       ProviderGitHub,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if repo.ID != "r2" {
			t.Errorf("expected ID r2, got %q", repo.ID)
		}
	})

	t.Run("Delete", func(t *testing.T) {
		err := c.Repositories.Delete(ctx, "r1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestErrorHandling(t *testing.T) {
	statusCodes := []struct {
		code     int
		errCode  ErrorCode
		checkFn  func(error) bool
		name     string
	}{
		{400, ErrorCodeBadRequest, nil, "BadRequest"},
		{401, ErrorCodeUnauthorized, IsUnauthorized, "Unauthorized"},
		{403, ErrorCodeForbidden, IsForbidden, "Forbidden"},
		{404, ErrorCodeNotFound, IsNotFound, "NotFound"},
		{402, ErrorCodePaymentRequired, IsPaymentRequired, "PaymentRequired"},
	}

	for _, tc := range statusCodes {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.code)
				json.NewEncoder(w).Encode(map[string]any{
					"error": map[string]string{"code": string(tc.errCode), "message": "test error"},
				})
			}))
			defer server.Close()

			c := NewClient("key", WithBaseURL(server.URL), WithRetryConfig(0, time.Millisecond, time.Millisecond))
			_, err := c.Repositories.List(context.Background(), nil)
			if err == nil {
				t.Fatal("expected error")
			}

			apiErr, ok := err.(*APIError)
			if !ok {
				t.Fatalf("expected *APIError, got %T", err)
			}
			if apiErr.HTTPStatusCode != tc.code {
				t.Errorf("expected status %d, got %d", tc.code, apiErr.HTTPStatusCode)
			}
			if tc.checkFn != nil && !tc.checkFn(err) {
				t.Errorf("expected %s check to return true", tc.name)
			}
		})
	}
}

func TestRetryOn500(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{"code": "internal_error", "message": "fail"},
			})
			return
		}
		json.NewEncoder(w).Encode(HealthResponse{Status: HealthStatusHealthy, Timestamp: time.Now()})
	}))
	defer server.Close()

	c := NewClient("key",
		WithBaseURL(server.URL),
		WithRetryConfig(3, time.Millisecond, 10*time.Millisecond),
	)
	health, err := c.Health.GetHealth(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if health.Status != HealthStatusHealthy {
		t.Errorf("expected healthy, got %q", health.Status)
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		json.NewEncoder(w).Encode(HealthResponse{Status: HealthStatusHealthy})
	}))
	defer server.Close()

	c := NewClient("key", WithBaseURL(server.URL))
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := c.Health.GetHealth(ctx)
	if err == nil {
		t.Fatal("expected error from cancelled context")
	}
}

func TestQueryParamEncoding(t *testing.T) {
	type testStruct struct {
		Name   string `url:"name,omitempty"`
		Limit  int    `url:"limit,omitempty"`
		Active bool   `url:"active,omitempty"`
		Empty  string `url:"empty,omitempty"`
	}

	params := testStruct{Name: "test", Limit: 10, Active: true}
	values := encodeQueryParams(params)

	if values.Get("name") != "test" {
		t.Errorf("expected name=test, got %q", values.Get("name"))
	}
	if values.Get("limit") != "10" {
		t.Errorf("expected limit=10, got %q", values.Get("limit"))
	}
	if values.Get("active") != "true" {
		t.Errorf("expected active=true, got %q", values.Get("active"))
	}
	if values.Get("empty") != "" {
		t.Errorf("expected empty to be omitted, got %q", values.Get("empty"))
	}
}
