# ReadyLayer Go SDK

[![Go Reference](https://pkg.go.dev/badge/github.com/readylayer/sdk-go.svg)](https://pkg.go.dev/github.com/readylayer/sdk-go)

The official Go SDK for the [ReadyLayer](https://readylayer.io) API. ReadyLayer is an API-as-a-Service platform for code review governance, policy management, and automated quality assurance.

## Features

- **Idiomatic Go** - Clean, simple, and obvious design
- **Context Support** - All operations support `context.Context` for cancellation and timeouts
- **Automatic Retries** - Exponential backoff retry logic for transient failures
- **Type Safety** - Full type definitions for all API resources
- **Error Handling** - Rich error types with detailed API error information
- **No External Dependencies** - Uses only the Go standard library

## Installation

```bash
go get github.com/readylayer/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/readylayer/sdk-go"
)

func main() {
    // Create a client with your API key
    client := readylayer.NewClient("your-api-key")

    // Use context for timeout/cancellation
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Check API health
    health, err := client.Health.GetHealth(ctx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("API Status: %s\n", health.Status)
}
```

## Authentication

The SDK uses Bearer token authentication. Pass your API key when creating the client:

```go
client := readylayer.NewClient("rl_live_xxxxxxxx")
```

You can obtain an API key from your [ReadyLayer Dashboard](https://readylayer.io/settings/api-keys).

## Configuration

### Base URL

By default, the SDK connects to the production API (`https://readylayer.io/api/v1`). You can customize this:

```go
client := readylayer.NewClient(
    "your-api-key",
    readylayer.WithBaseURL("http://localhost:3000/api/v1"),
)
```

### Custom HTTP Client

```go
httpClient := &http.Client{
    Timeout: 60 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns: 100,
    },
}

client := readylayer.NewClient(
    "your-api-key",
    readylayer.WithHTTPClient(httpClient),
)
```

### Retry Configuration

```go
client := readylayer.NewClient(
    "your-api-key",
    readylayer.WithRetryConfig(
        5,                    // max retries
        500*time.Millisecond, // base delay
        60*time.Second,       // max delay
    ),
)
```

## Services

The SDK provides the following services:

### Repositories

```go
// List repositories
repos, err := client.Repositories.List(ctx, &readylayer.RepositoryListOptions{
    OrganizationID: "org_123",
    ListOptions: readylayer.ListOptions{
        Limit: 20,
        Offset: 0,
    },
})

// Get a specific repository
repo, err := client.Repositories.Get(ctx, "repo_123")

// Create a repository
newRepo, err := client.Repositories.Create(ctx, &readylayer.CreateRepositoryRequest{
    OrganizationID: "org_123",
    Name:           "my-repo",
    FullName:       "myorg/my-repo",
    Provider:       readylayer.ProviderGitHub,
})

// Update a repository
updatedRepo, err := client.Repositories.Update(ctx, "repo_123", &readylayer.UpdateRepositoryRequest{
    Enabled: boolPtr(false),
})

// Delete a repository
err := client.Repositories.Delete(ctx, "repo_123")

// Test repository connection
result, err := client.Repositories.TestConnection(ctx, "repo_123")
```

### Policies

```go
// List policy packs
policies, err := client.Policies.List(ctx, &readylayer.PolicyListOptions{
    OrganizationID: "org_123",
})

// Get a policy pack
policy, err := client.Policies.Get(ctx, "pack_123")

// Create a policy pack
newPolicy, err := client.Policies.Create(ctx, &readylayer.CreatePolicyPackRequest{
    OrganizationID: "org_123",
    Version:        "1.0.0",
    Source:         policyYAML,
})

// Validate policy syntax
validation, err := client.Policies.Validate(ctx, &readylayer.ValidatePolicyRequest{
    Source: policyYAML,
})
```

### Reviews

```go
// List reviews
reviews, err := client.Reviews.List(ctx, &readylayer.ReviewListOptions{
    RepositoryID: "repo_123",
})

// Get a review
review, err := client.Reviews.Get(ctx, "review_123")

// Create a review
newReview, err := client.Reviews.Create(ctx, &readylayer.CreateReviewRequest{
    RepositoryID: "repo_123",
    PRNumber:     42,
    PRSha:        "abc123",
    Files: []readylayer.ReviewFile{
        {Path: "main.go", Content: "package main..."},
    },
})
```

### Waivers

```go
// List waivers
waivers, err := client.Waivers.List(ctx, &readylayer.WaiverListOptions{})

// Create a waiver
waiver, err := client.Waivers.Create(ctx, &readylayer.CreateWaiverRequest{
    OrganizationID: "org_123",
    RuleID:         "rule_123",
    Reason:         "Legacy code exception",
    ExpiresAt:      time.Now().Add(30 * 24 * time.Hour),
})

// Revoke a waiver
err := client.Waivers.Delete(ctx, "waiver_123")
```

### Evidence

```go
// List evidence bundles
evidence, err := client.Evidence.List(ctx, &readylayer.EvidenceListOptions{
    ReviewID: "review_123",
})

// Get an evidence bundle
bundle, err := client.Evidence.Get(ctx, "bundle_123")

// Export evidence as JSON
data, err := client.Evidence.Export(ctx, "bundle_123")
```

### Runs

```go
// List test runs
runs, err := client.Runs.List(ctx, &readylayer.RunListOptions{})

// Get a run
run, err := client.Runs.Get(ctx, "run_123")

// Create a run
run, err := client.Runs.Create(ctx, &readylayer.CreateRunRequest{
    Trigger: readylayer.TriggerWebhook,
    TriggerMetadata: &readylayer.TriggerMetadata{
        PRNumber: 42,
        PRSha:    "abc123",
    },
})

// Create a sandbox run
run, err := client.Runs.CreateSandbox(ctx, &readylayer.CreateSandboxRunRequest{
    SandboxID: "sandbox_123",
    Files: []readylayer.ReviewFile{
        {Path: "test.go", Content: "..."},
    },
})
```

### Billing

```go
// Get billing tier and usage
tier, err := client.Billing.GetTier(ctx, "org_123")

// Create checkout session
session, err := client.Billing.CreateCheckoutSession(ctx, &readylayer.CreateCheckoutRequest{
    Tier:       "pro",
    SuccessURL: "https://example.com/success",
    CancelURL:  "https://example.com/cancel",
})
```

### API Keys

```go
// List API keys
keys, err := client.APIKeys.List(ctx)

// Create API key
key, err := client.APIKeys.Create(ctx, &readylayer.CreateApiKeyRequest{
    Name:   "CI/CD Integration",
    Scopes: []readylayer.APIScope{readylayer.APIScopeRead, readylayer.APIScopeWrite},
})

// Revoke API key
err := client.APIKeys.Delete(ctx, "key_123")
```

### Health

```go
// Check API health (no auth required)
health, err := client.Health.GetHealth(ctx)

// Check readiness with dependencies
ready, err := client.Health.GetReady(ctx)
```

## Error Handling

The SDK provides detailed error types:

```go
resp, err := client.Repositories.Get(ctx, "repo_123")
if err != nil {
    // Check for specific error types
    if readylayer.IsNotFound(err) {
        // Handle 404 - repository not found
        fmt.Println("Repository not found")
    }

    if readylayer.IsUnauthorized(err) {
        // Handle 401 - invalid API key
        fmt.Println("Invalid API key")
    }

    if readylayer.IsPaymentRequired(err) {
        // Handle 402 - billing limit exceeded
        fmt.Println("Billing limit exceeded")
    }

    // Access detailed error information
    var apiErr *readylayer.APIError
    if errors.As(err, &apiErr) {
        fmt.Printf("Error code: %s\n", apiErr.Code)
        fmt.Printf("Message: %s\n", apiErr.Message)
        fmt.Printf("HTTP Status: %d\n", apiErr.HTTPStatusCode)
    }
}
```

### Retryable Errors

The SDK automatically retries on:
- 429 (Too Many Requests)
- 500 (Internal Server Error)
- 502 (Bad Gateway)
- 503 (Service Unavailable)
- 504 (Gateway Timeout)
- Network timeouts and temporary errors

You can check if an error is retryable:

```go
if readylayer.IsRetryable(err) {
    // The SDK already retried, but you can handle it differently
}
```

## Context Usage

All API methods accept a `context.Context` for timeout and cancellation control:

```go
// Timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

repo, err := client.Repositories.Get(ctx, "repo_123")

// Cancellation
ctx, cancel := context.WithCancel(context.Background())
go func() {
    time.Sleep(2 * time.Second)
    cancel() // Cancel the request
}()

repo, err := client.Repositories.Get(ctx, "repo_123")
```

## Pagination

List endpoints support pagination:

```go
var allRepos []readylayer.Repository
offset := 0
limit := 100

for {
    resp, err := client.Repositories.List(ctx, &readylayer.RepositoryListOptions{
        ListOptions: readylayer.ListOptions{
            Limit:  limit,
            Offset: offset,
        },
    })
    if err != nil {
        return err
    }

    allRepos = append(allRepos, resp.Repositories...)

    if !resp.Pagination.HasMore {
        break
    }
    offset += limit
}
```

## Advanced Usage

### Custom User-Agent

```go
client := readylayer.NewClient(
    "your-api-key",
    readylayer.WithUserAgent("my-app/1.0.0"),
)
```

### Debugging

Enable request logging by providing a custom HTTP client with logging transport:

```go
type loggingTransport struct {
    base http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    log.Printf("Request: %s %s", req.Method, req.URL)
    return t.base.RoundTrip(req)
}

httpClient := &http.Client{
    Transport: &loggingTransport{base: http.DefaultTransport},
}

client := readylayer.NewClient(
    "your-api-key",
    readylayer.WithHTTPClient(httpClient),
)
```

## API Reference

See the [ReadyLayer API Documentation](https://docs.readylayer.io) for complete API reference.

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.readylayer.io
- Email: support@readylayer.io
- Issues: https://github.com/readylayer/sdk-go/issues

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

Made with ❤️ by the ReadyLayer team
