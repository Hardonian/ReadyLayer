// Package readylayer provides a Go SDK for the ReadyLayer API.
// This SDK enables programmatic access to ReadyLayer's code review governance,
// policy management, and automated quality assurance services.
//
// The SDK is designed to be idiomatic Go - clean, simple, and obvious.
// All operations support context.Context for cancellation and timeout control.
package readylayer

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

// ErrorCode represents the type of error that occurred.
type ErrorCode string

const (
	// ErrorCodeBadRequest indicates a validation error (HTTP 400)
	ErrorCodeBadRequest ErrorCode = "bad_request"
	// ErrorCodeUnauthorized indicates invalid or missing authentication (HTTP 401)
	ErrorCodeUnauthorized ErrorCode = "unauthorized"
	// ErrorCodeForbidden indicates insufficient permissions (HTTP 403)
	ErrorCodeForbidden ErrorCode = "forbidden"
	// ErrorCodeNotFound indicates the requested resource was not found (HTTP 404)
	ErrorCodeNotFound ErrorCode = "not_found"
	// ErrorCodePaymentRequired indicates billing limit exceeded (HTTP 402)
	ErrorCodePaymentRequired ErrorCode = "payment_required"
	// ErrorCodeInternal indicates an internal server error (HTTP 500)
	ErrorCodeInternal ErrorCode = "internal_error"
	// ErrorCodeUnavailable indicates the service is unavailable (HTTP 503)
	ErrorCodeUnavailable ErrorCode = "unavailable"
	// ErrorCodeUnknown indicates an unknown or unexpected error
	ErrorCodeUnknown ErrorCode = "unknown"
)

// APIError represents an error returned by the ReadyLayer API.
type APIError struct {
	// Code is the error code categorizing the error type
	Code ErrorCode `json:"code"`
	// Message is a human-readable description of the error
	Message string `json:"message"`
	// Context provides additional structured data about the error
	Context map[string]any `json:"context,omitempty"`
	// Details provides additional error details
	Details map[string]any `json:"details,omitempty"`
	// ValidationErrors contains field-level validation errors
	ValidationErrors []ValidationError `json:"errors,omitempty"`
	// HTTPStatusCode is the HTTP status code returned
	HTTPStatusCode int `json:"-"`
	// RawResponse contains the raw JSON response body
	RawResponse []byte `json:"-"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	if e.HTTPStatusCode > 0 {
		return fmt.Sprintf("readylayer: %s (status %d): %s", e.Code, e.HTTPStatusCode, e.Message)
	}
	return fmt.Sprintf("readylayer: %s: %s", e.Code, e.Message)
}

// ValidationError represents a field-level validation error.
type ValidationError struct {
	// Path is the field path that failed validation
	Path []any `json:"path"`
	// Message describes the validation failure
	Message string `json:"message"`
}

// RetryableError indicates an error that can be retried.
type RetryableError struct {
	Err        error
	Attempt    int
	MaxRetries int
}

// Error implements the error interface.
func (e *RetryableError) Error() string {
	return fmt.Sprintf("retryable error (attempt %d/%d): %v", e.Attempt, e.MaxRetries, e.Err)
}

// Unwrap returns the underlying error.
func (e *RetryableError) Unwrap() error {
	return e.Err
}

// IsRetryable returns true if the error indicates a retryable condition.
func IsRetryable(err error) bool {
	if _, ok := err.(*RetryableError); ok {
		return true
	}

	var apiErr *APIError
	if As(err, &apiErr) {
		switch apiErr.HTTPStatusCode {
		case http.StatusTooManyRequests, // 429
			http.StatusInternalServerError, // 500
			http.StatusBadGateway,          // 502
			http.StatusServiceUnavailable,  // 503
			http.StatusGatewayTimeout:      // 504
			return true
		}
	}

	return false
}

// As is a helper that wraps errors.As.
func As(err error, target any) bool {
	return errors.As(err, target)
}

// IsNotFound returns true if the error indicates a "not found" condition.
func IsNotFound(err error) bool {
	var apiErr *APIError
	if As(err, &apiErr) {
		return apiErr.Code == ErrorCodeNotFound || apiErr.HTTPStatusCode == http.StatusNotFound
	}
	return false
}

// IsUnauthorized returns true if the error indicates an unauthorized condition.
func IsUnauthorized(err error) bool {
	var apiErr *APIError
	if As(err, &apiErr) {
		return apiErr.Code == ErrorCodeUnauthorized || apiErr.HTTPStatusCode == http.StatusUnauthorized
	}
	return false
}

// IsForbidden returns true if the error indicates a forbidden condition.
func IsForbidden(err error) bool {
	var apiErr *APIError
	if As(err, &apiErr) {
		return apiErr.Code == ErrorCodeForbidden || apiErr.HTTPStatusCode == http.StatusForbidden
	}
	return false
}

// IsPaymentRequired returns true if the error indicates a payment required condition.
func IsPaymentRequired(err error) bool {
	var apiErr *APIError
	if As(err, &apiErr) {
		return apiErr.Code == ErrorCodePaymentRequired || apiErr.HTTPStatusCode == http.StatusPaymentRequired
	}
	return false
}

// parseErrorResponse parses an error response from the API.
func parseErrorResponse(statusCode int, body []byte) error {
	apiErr := &APIError{
		Code:           ErrorCodeUnknown,
		HTTPStatusCode: statusCode,
		RawResponse:    body,
	}

	// Try to parse the standard error response format
	var resp struct {
		Error struct {
			Code    string            `json:"code"`
			Message string            `json:"message"`
			Context map[string]any    `json:"context,omitempty"`
			Details map[string]any    `json:"details,omitempty"`
			Errors  []ValidationError `json:"errors,omitempty"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &resp); err == nil && resp.Error.Code != "" {
		apiErr.Code = ErrorCode(resp.Error.Code)
		apiErr.Message = resp.Error.Message
		apiErr.Context = resp.Error.Context
		apiErr.Details = resp.Error.Details
		apiErr.ValidationErrors = resp.Error.Errors
	} else {
		// Fall back to using the status code to determine the error
		apiErr.Message = http.StatusText(statusCode)
		switch statusCode {
		case http.StatusBadRequest:
			apiErr.Code = ErrorCodeBadRequest
		case http.StatusUnauthorized:
			apiErr.Code = ErrorCodeUnauthorized
		case http.StatusForbidden:
			apiErr.Code = ErrorCodeForbidden
		case http.StatusNotFound:
			apiErr.Code = ErrorCodeNotFound
		case http.StatusPaymentRequired:
			apiErr.Code = ErrorCodePaymentRequired
		case http.StatusInternalServerError:
			apiErr.Code = ErrorCodeInternal
		case http.StatusServiceUnavailable:
			apiErr.Code = ErrorCodeUnavailable
		}
	}

	return apiErr
}
