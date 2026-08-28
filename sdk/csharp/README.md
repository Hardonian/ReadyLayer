# ReadyLayer C# SDK

Official C# SDK for the ReadyLayer API - a platform for code review governance, policy management, and automated quality assurance.

[![NuGet](https://img.shields.io/nuget/v/ReadyLayer.SDK.svg)](https://www.nuget.org/packages/ReadyLayer.SDK/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Modern C#** - Uses records, nullable reference types, and async/await
- **Type-safe** - Full type coverage for all API operations
- **Resilient** - Built-in retry with exponential backoff using Polly
- **Error handling** - Typed exceptions for all error scenarios
- **Configurable** - Support for custom base URLs, timeouts, and HTTP handlers
- **Extensible** - Easy to extend and customize

## Requirements

- .NET 6.0 or later
- An API key from [ReadyLayer](https://readylayer.io)

## Installation

```bash
dotnet add package ReadyLayer.SDK
```

Or via Package Manager:

```powershell
Install-Package ReadyLayer.SDK
```

## Quick Start

```csharp
using ReadyLayer.SDK;

// Create a client with your API token
var client = new ReadyLayerClient("your-api-token");

// Check service health
var health = await client.Health.CheckAsync();
Console.WriteLine($"Service status: {health.Status}");

// List repositories
var repos = await client.Repositories.ListAsync();
foreach (var repo in repos.Repositories)
{
    Console.WriteLine($"{repo.Name} ({repo.Provider})")
}
```

## Configuration

### Basic Configuration

```csharp
var client = new ReadyLayerClient("your-api-token");
```

### Advanced Configuration

```csharp
var options = new ReadyLayerClientOptions
{
    ApiToken = "your-api-token",
    BaseUrl = "https://readylayer.io/api/v1",  // Production (default)
    // BaseUrl = "http://localhost:3000/api/v1",  // Local development
    MaxRetries = 3,
    Timeout = TimeSpan.FromSeconds(30)
};

var client = new ReadyLayerClient(options);
```

### Using a Custom HttpClientHandler

```csharp
var handler = new HttpClientHandler
{
    // Custom certificate validation, proxy settings, etc.
};

var options = new ReadyLayerClientOptions
{
    ApiToken = "your-api-token",
    HttpClientHandler = handler
};

var client = new ReadyLayerClient(options);
```

## Services

The SDK is organized into service classes that match the API domains:

### Repositories

```csharp
// List repositories
var repos = await client.Repositories.ListAsync(new ListRepositoriesParams
{
    OrganizationId = "org-id",
    Limit = 50
});

// Get a specific repository
var repo = await client.Repositories.GetAsync("repo-id");

// Create a repository
var newRepo = await client.Repositories.CreateAsync(new CreateRepositoryRequest
{
    OrganizationId = "org-id",
    Name = "my-repo",
    FullName = "org/my-repo",
    Provider = RepositoryProvider.GitHub
});

// Update a repository
var updated = await client.Repositories.UpdateAsync("repo-id", new UpdateRepositoryRequest
{
    Enabled = true
});

// Delete a repository
await client.Repositories.DeleteAsync("repo-id");

// Test connection
var test = await client.Repositories.TestConnectionAsync("repo-id");
```

### Policies

```csharp
// List policy packs
var policies = await client.Policies.ListPacksAsync();

// Get a policy pack
var policy = await client.Policies.GetPackAsync("pack-id");

// Create a policy pack
var newPolicy = await client.Policies.CreatePackAsync(new CreatePolicyPackRequest
{
    OrganizationId = "org-id",
    Version = "1.0.0",
    Source = "policy-yaml-content"
});

// Update a policy pack
var updated = await client.Policies.UpdatePackAsync("pack-id", new UpdatePolicyPackRequest
{
    Version = "1.1.0"
});

// Delete a policy pack
await client.Policies.DeletePackAsync("pack-id");

// List rules in a pack
var rules = await client.Policies.ListRulesAsync("pack-id");

// Add a rule
var newRule = await client.Policies.CreateRuleAsync("pack-id", new CreatePolicyRuleRequest
{
    RuleId = "no-console-log",
    SeverityMapping = new Dictionary<string, PolicyAction>
    {
        { "critical", PolicyAction.Block },
        { "high", PolicyAction.Warn }
    }
});

// Validate policy syntax
var validation = await client.Policies.ValidateAsync("policy-yaml-content");
if (!validation.Valid)
{
    foreach (var error in validation.Errors)
    {
        Console.WriteLine($"{error.RuleId}: {error.Error}");
    }
}

// List templates
var templates = await client.Policies.ListTemplatesAsync();
```

### Reviews

```csharp
// List reviews
var reviews = await client.Reviews.ListAsync(new ListReviewsParams
{
    RepositoryId = "repo-id",
    Limit = 20
});

// Get a review
var review = await client.Reviews.GetAsync("review-id");

// Create a review
var newReview = await client.Reviews.CreateAsync(new CreateReviewRequest
{
    RepositoryId = "repo-id",
    PrNumber = 42,
    PrSha = "abc123",
    Files = new List<ReviewFile>
    {
        new ReviewFile { Path = "src/Program.cs", Content = "..." }
    },
    Config = new ReviewConfig
    {
        FailOnCritical = true,
        FailOnHigh = true
    }
});
```

### Waivers

```csharp
// List waivers
var waivers = await client.Waivers.ListAsync();

// Get a waiver
var waiver = await client.Waivers.GetAsync("waiver-id");

// Create a waiver
var newWaiver = await client.Waivers.CreateAsync(new CreateWaiverRequest
{
    OrganizationId = "org-id",
    RuleId = "rule-id",
    Reason = "Emergency fix required",
    ExpiresAt = DateTime.UtcNow.AddDays(7)
});

// Revoke a waiver
await client.Waivers.RevokeAsync("waiver-id");
```

### Evidence

```csharp
// List evidence bundles
var bundles = await client.Evidence.ListAsync();

// Get a bundle
var bundle = await client.Evidence.GetAsync("bundle-id");

// Export evidence
var export = await client.Evidence.ExportAsync("bundle-id");
```

### Test Runs

```csharp
// List runs
var runs = await client.Runs.ListAsync();

// Get a run
var run = await client.Runs.GetAsync("run-id");

// Create a run
var newRun = await client.Runs.CreateAsync(new CreateRunRequest
{
    RepositoryId = "repo-id",
    Trigger = "manual"
});

// Create a sandbox run
var sandboxRun = await client.Runs.CreateSandboxAsync(new CreateSandboxRunRequest
{
    SandboxId = "sandbox-id",
    Files = new List<ReviewFile>
    {
        new ReviewFile { Path = "src/Test.cs", Content = "..." }
    }
});
```

### Billing

```csharp
// Get billing tier and usage
var billing = await client.Billing.GetTierAsync();
Console.WriteLine($"Current tier: {billing.Tier.Name}");
Console.WriteLine($"Reviews this month: {billing.Usage.ReviewsThisMonth}");

// Create checkout session
var checkout = await client.Billing.CreateCheckoutSessionAsync(new CreateCheckoutRequest
{
    Tier = "pro",
    SuccessUrl = "https://your-app.com/success",
    CancelUrl = "https://your-app.com/cancel"
});
// Redirect user to checkout.Url
```

### Analytics

```csharp
// Get metrics
var metrics = await client.Analytics.GetMetricsAsync(new GetMetricsParams
{
    StartDate = DateTime.UtcNow.AddDays(-30),
    EndDate = DateTime.UtcNow
});

foreach (var point in metrics.Metrics.Reviews)
{
    Console.WriteLine($"{point.Timestamp}: {point.Value}");
}
```

### API Keys

```csharp
// List API keys
var keys = await client.ApiKeys.ListAsync();

// Create API key
var newKey = await client.ApiKeys.CreateAsync(new CreateApiKeyRequest
{
    Name = "CI/CD Integration",
    Scopes = new List<ApiKeyScope> { ApiKeyScope.Read, ApiKeyScope.Write }
});

// Revoke API key
await client.ApiKeys.RevokeAsync("key-id");
```

### Health

```csharp
// Check health (no authentication required)
var health = await client.Health.CheckAsync();
Console.WriteLine($"Status: {health.Status}");
Console.WriteLine($"Version: {health.Version}");

// Check readiness
var ready = await client.Health.CheckReadyAsync();
Console.WriteLine($"Ready: {ready.Ready}");
Console.WriteLine($"Database: {ready.Dependencies.Database}");
Console.WriteLine($"Redis: {ready.Dependencies.Redis}");
Console.WriteLine($"Stripe: {ready.Dependencies.Stripe}");
```

## Error Handling

The SDK uses typed exceptions for different error scenarios:

```csharp
using ReadyLayer.SDK.Exceptions;

try
{
    var repo = await client.Repositories.GetAsync("non-existent-id");
}
catch (ReadyLayerNotFoundException ex)
{
    Console.WriteLine($"Repository not found: {ex.Message}");
}
catch (ReadyLayerAuthenticationException ex)
{
    Console.WriteLine($"Authentication failed: {ex.Message}");
}
catch (ReadyLayerValidationException ex)
{
    Console.WriteLine($"Validation failed: {ex.Message}");
    foreach (var error in ex.ValidationErrors)
    {
        Console.WriteLine($"  - {string.Join(".", error.Path)}: {error.Message}");
    }
}
catch (ReadyLayerBillingException ex)
{
    Console.WriteLine($"Billing limit exceeded: {ex.Message}");
}
catch (ReadyLayerRateLimitException ex)
{
    Console.WriteLine($"Rate limited. Retry after: {ex.RetryAfter}");
}
catch (ReadyLayerException ex)
{
    // Catch-all for SDK errors
    Console.WriteLine($"Error: {ex.Message} (Code: {ex.ErrorCode}, Status: {ex.StatusCode})");
}
```

### Exception Types

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `ReadyLayerException` | - | Base exception for all SDK errors |
| `ReadyLayerValidationException` | 400 | Invalid request data |
| `ReadyLayerAuthenticationException` | 401 | Invalid or missing API token |
| `ReadyLayerAuthorizationException` | 403 | Insufficient permissions |
| `ReadyLayerNotFoundException` | 404 | Resource not found |
| `ReadyLayerBillingException` | 402 | Billing limit exceeded |
| `ReadyLayerConflictException` | 409 | Resource conflict |
| `ReadyLayerRateLimitException` | 429 | Rate limit exceeded |

## Retry Behavior

The SDK automatically retries failed requests with exponential backoff:

- **Retry conditions**: Network errors, timeouts, 5xx errors, rate limits (429)
- **Max retries**: 3 (configurable via `ReadyLayerClientOptions.MaxRetries`)
- **Backoff**: 1s, 2s, 4s between retries

## Pagination

List endpoints return paginated results:

```csharp
var allRepos = new List<Repository>();
var params = new ListRepositoriesParams { Limit = 100 };

while (true)
{
    var result = await client.Repositories.ListAsync(params);
    allRepos.AddRange(result.Repositories);

    if (!result.Pagination.HasMore)
        break;

    params.Offset = result.Pagination.Offset + result.Pagination.Limit;
}
```

## Cancellation

All async methods support cancellation tokens:

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

try
{
    var repos = await client.Repositories.ListAsync(cancellationToken: cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Request was cancelled or timed out");
}
```

## Disposing the Client

The client implements `IDisposable` and should be disposed when no longer needed:

```csharp
using var client = new ReadyLayerClient("your-api-token");
// Use client...
```

Or for dependency injection scenarios:

```csharp
// In your DI registration
services.AddSingleton<ReadyLayerClient>(sp =>
    new ReadyLayerClient(configuration["ReadyLayer:ApiToken"]));

// The client will be disposed when the application shuts down
```

## Dependency Injection

For ASP.NET Core applications:

```csharp
// Program.cs
builder.Services.AddSingleton<ReadyLayerClient>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    return new ReadyLayerClient(new ReadyLayerClientOptions
    {
        ApiToken = configuration["ReadyLayer:ApiToken"]!,
        MaxRetries = 3,
        Timeout = TimeSpan.FromSeconds(30)
    });
});

// In your service
public class MyService
{
    private readonly ReadyLayerClient _readyLayer;

    public MyService(ReadyLayerClient readyLayer)
    {
        _readyLayer = readyLayer;
    }

    public async Task DoSomethingAsync()
    {
        var repos = await _readyLayer.Repositories.ListAsync();
        // ...
    }
}
```

## Thread Safety

The `ReadyLayerClient` is thread-safe and can be used concurrently from multiple threads. It is recommended to use a single instance per application.

## JSON Serialization

The SDK uses `System.Text.Json` for serialization. You can customize JSON options:

```csharp
var options = new ReadyLayerClientOptions
{
    ApiToken = "your-api-token",
    JsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        // Your custom options...
    }
};
```

## Support

- Documentation: https://docs.readylayer.io
- Issues: https://github.com/readylayer/readylayer/issues
- Email: support@readylayer.io

## License

This SDK is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

**ReadyLayer** - Ship better code, faster.
