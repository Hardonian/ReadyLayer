package readylayer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"time"
)

const (
	// DefaultBaseURL is the default production API URL.
	DefaultBaseURL = "https://readylayer.io/api/v1"

	// DefaultUserAgent is the default User-Agent header value.
	DefaultUserAgent = "readylayer-go-sdk/1.0.0"

	// DefaultMaxRetries is the default number of retry attempts.
	DefaultMaxRetries = 3

	// DefaultRetryBaseDelay is the base delay between retries.
	DefaultRetryBaseDelay = 1 * time.Second

	// DefaultRetryMaxDelay is the maximum delay between retries.
	DefaultRetryMaxDelay = 30 * time.Second

	// DefaultTimeout is the default request timeout.
	DefaultTimeout = 30 * time.Second
)

// ClientOption configures the Client.
type ClientOption func(*Client)

// WithBaseURL sets a custom base URL.
func WithBaseURL(baseURL string) ClientOption {
	return func(c *Client) {
		c.baseURL = baseURL
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// WithUserAgent sets a custom User-Agent.
func WithUserAgent(userAgent string) ClientOption {
	return func(c *Client) {
		c.userAgent = userAgent
	}
}

// WithRetryConfig sets custom retry configuration.
func WithRetryConfig(maxRetries int, baseDelay, maxDelay time.Duration) ClientOption {
	return func(c *Client) {
		c.maxRetries = maxRetries
		c.retryBaseDelay = baseDelay
		c.retryMaxDelay = maxDelay
	}
}

// Client is the ReadyLayer API client.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	userAgent  string

	// Retry configuration
	maxRetries     int
	retryBaseDelay time.Duration
	retryMaxDelay  time.Duration

	// Service accessors
	Repositories *RepositoriesService
	Policies     *PoliciesService
	Reviews      *ReviewsService
	Waivers      *WaiversService
	Evidence     *EvidenceService
	Runs         *RunsService
	Billing      *BillingService
	Health       *HealthService
	APIKeys      *APIKeysService
}

// NewClient creates a new ReadyLayer API client.
// The apiKey parameter should be your ReadyLayer API key.
func NewClient(apiKey string, opts ...ClientOption) *Client {
	c := &Client{
		baseURL:        DefaultBaseURL,
		apiKey:         apiKey,
		httpClient:     &http.Client{Timeout: DefaultTimeout},
		userAgent:      DefaultUserAgent,
		maxRetries:     DefaultMaxRetries,
		retryBaseDelay: DefaultRetryBaseDelay,
		retryMaxDelay:  DefaultRetryMaxDelay,
	}

	for _, opt := range opts {
		opt(c)
	}

	// Initialize service accessors
	c.Repositories = &RepositoriesService{client: c}
	c.Policies = &PoliciesService{client: c}
	c.Reviews = &ReviewsService{client: c}
	c.Waivers = &WaiversService{client: c}
	c.Evidence = &EvidenceService{client: c}
	c.Runs = &RunsService{client: c}
	c.Billing = &BillingService{client: c}
	c.Health = &HealthService{client: c}
	c.APIKeys = &APIKeysService{client: c}

	return c
}

// do sends an HTTP request and handles retries.
func (c *Client) do(ctx context.Context, method, path string, body any, v any) error {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	// Build the full URL
	requestURL, err := c.buildURL(path)
	if err != nil {
		return err
	}

	// Attempt the request with retries
	var lastErr error
	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		// Check for context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		req, err := http.NewRequestWithContext(ctx, method, requestURL, bodyReader)
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}

		// Set headers
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("User-Agent", c.userAgent)
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		req.Header.Set("Accept", "application/json")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < c.maxRetries && isRetryableError(err) {
				delay := c.calculateBackoff(attempt)
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(delay):
					continue
				}
			}
			return fmt.Errorf("http request failed: %w", err)
		}
		defer resp.Body.Close()

		// Read response body
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = err
			if attempt < c.maxRetries && isRetryableError(err) {
				delay := c.calculateBackoff(attempt)
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(delay):
					continue
				}
			}
			return fmt.Errorf("read response body: %w", err)
		}

		// Check status code
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			if v != nil && len(respBody) > 0 {
				if err := json.Unmarshal(respBody, v); err != nil {
					return fmt.Errorf("unmarshal response: %w", err)
				}
			}
			return nil
		}

		// Handle error responses
		err = parseErrorResponse(resp.StatusCode, respBody)

		// Check if we should retry
		if attempt < c.maxRetries && IsRetryable(err) {
			lastErr = err
			delay := c.calculateBackoff(attempt)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				continue
			}
		}

		return err
	}

	if lastErr != nil {
		return &RetryableError{
			Err:        lastErr,
			Attempt:    c.maxRetries,
			MaxRetries: c.maxRetries,
		}
	}

	return fmt.Errorf("exhausted retries")
}

// doWithQuery sends an HTTP request with query parameters.
func (c *Client) doWithQuery(ctx context.Context, method, path string, queryParams any, body any, v any) error {
	fullURL, err := c.buildURL(path)
	if err != nil {
		return err
	}

	// Add query parameters
	if queryParams != nil {
		values := encodeQueryParams(queryParams)
		if len(values) > 0 {
			u, err := url.Parse(fullURL)
			if err != nil {
				return fmt.Errorf("parse URL: %w", err)
			}

			u.RawQuery = values.Encode()
			fullURL = u.String()
		}
	}

	return c.do(ctx, method, fullURL, body, v)
}

// buildURL builds the full URL from a path.
func (c *Client) buildURL(path string) (string, error) {
	// If path is already a full URL, return it
	if u, err := url.Parse(path); err == nil && u.IsAbs() {
		return path, nil
	}

	base, err := url.Parse(c.baseURL)
	if err != nil {
		return "", fmt.Errorf("parse base URL: %w", err)
	}

	rel, err := url.Parse(path)
	if err != nil {
		return "", fmt.Errorf("parse path: %w", err)
	}

	return base.ResolveReference(rel).String(), nil
}

// calculateBackoff calculates the exponential backoff delay.
func (c *Client) calculateBackoff(attempt int) time.Duration {
	delay := c.retryBaseDelay * (1 << attempt)
	if delay > c.retryMaxDelay {
		delay = c.retryMaxDelay
	}
	// Add jitter to prevent thundering herd
	jitter := time.Duration(float64(delay) * 0.1)
	return delay + jitter
}

// isRetryableError checks if an error is retryable.
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Check for temporary errors
	type temporary interface {
		Temporary() bool
	}
	if t, ok := err.(temporary); ok && t.Temporary() {
		return true
	}

	// Check for timeout errors
	type timeout interface {
		Timeout() bool
	}
	if t, ok := err.(timeout); ok && t.Timeout() {
		return true
	}

	return false
}

// get performs a GET request.
func (c *Client) get(ctx context.Context, path string, v any) error {
	return c.do(ctx, http.MethodGet, path, nil, v)
}

// getWithQuery performs a GET request with query parameters.
func (c *Client) getWithQuery(ctx context.Context, path string, queryParams any, v any) error {
	return c.doWithQuery(ctx, http.MethodGet, path, queryParams, nil, v)
}

// post performs a POST request.
func (c *Client) post(ctx context.Context, path string, body any, v any) error {
	return c.do(ctx, http.MethodPost, path, body, v)
}

// put performs a PUT request.
func (c *Client) put(ctx context.Context, path string, body any, v any) error {
	return c.do(ctx, http.MethodPut, path, body, v)
}

// patch performs a PATCH request.
func (c *Client) patch(ctx context.Context, path string, body any, v any) error {
	return c.do(ctx, http.MethodPatch, path, body, v)
}

// delete performs a DELETE request.
func (c *Client) delete(ctx context.Context, path string) error {
	return c.do(ctx, http.MethodDelete, path, nil, nil)
}

// encodeQueryParams encodes a struct into url.Values.
// It supports basic types and uses "url" struct tags.
func encodeQueryParams(v any) url.Values {
	values := url.Values{}
	if v == nil {
		return values
	}

	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return values
	}

	rt := rv.Type()
	for i := 0; i < rv.NumField(); i++ {
		field := rv.Field(i)
		fieldType := rt.Field(i)

		// Skip unexported fields
		if !field.CanInterface() {
			continue
		}

		tag := fieldType.Tag.Get("url")
		if tag == "" {
			continue
		}

		// Parse tag options
		tagParts := strings.Split(tag, ",")
		name := tagParts[0]
		if name == "-" {
			continue
		}
		if name == "" {
			name = strings.ToLower(fieldType.Name)
		}

		// Skip zero values with "omitempty"
		if len(tagParts) > 1 && tagParts[1] == "omitempty" {
			if isZeroValue(field) {
				continue
			}
		}

		// Convert value to string
		strValue := valueToString(field)
		if strValue != "" {
			values.Set(name, strValue)
		}
	}

	return values
}

// isZeroValue checks if a reflect.Value is the zero value.
func isZeroValue(v reflect.Value) bool {
	switch v.Kind() {
	case reflect.Bool:
		return !v.Bool()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return v.Int() == 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return v.Uint() == 0
	case reflect.Float32, reflect.Float64:
		return v.Float() == 0
	case reflect.String:
		return v.String() == ""
	case reflect.Ptr, reflect.Interface:
		return v.IsNil()
	case reflect.Slice, reflect.Map:
		return v.Len() == 0
	case reflect.Struct:
		if v.Type() == reflect.TypeOf(time.Time{}) {
			return v.Interface().(time.Time).IsZero()
		}
		return false
	default:
		return false
	}
}

// valueToString converts a reflect.Value to a string.
func valueToString(v reflect.Value) string {
	switch v.Kind() {
	case reflect.Bool:
		return strconv.FormatBool(v.Bool())
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(v.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(v.Uint(), 10)
	case reflect.Float32:
		return strconv.FormatFloat(v.Float(), 'f', -1, 32)
	case reflect.Float64:
		return strconv.FormatFloat(v.Float(), 'f', -1, 64)
	case reflect.String:
		return v.String()
	case reflect.Ptr:
		if v.IsNil() {
			return ""
		}
		return valueToString(v.Elem())
	case reflect.Struct:
		if v.Type() == reflect.TypeOf(time.Time{}) {
			t := v.Interface().(time.Time)
			if t.IsZero() {
				return ""
			}
			return t.Format(time.RFC3339)
		}
	default:
		return ""
	}
	return ""
}
