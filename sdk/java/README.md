# ReadyLayer Java SDK

Official Java SDK for the ReadyLayer API - code review governance, policy management, and automated quality assurance.

## Features

- **Java 11+** - Modern Java with `java.net.http.HttpClient`
- **Bearer Token Auth** - Secure API key authentication
- **Configurable Base URL** - Support for production and local development
- **Retry with Exponential Backoff** - Automatic retries on transient failures
- **Typed Exceptions** - Specific exceptions for each error type (401, 403, 404, etc.)
- **Lombok** - Reduced boilerplate with clean, readable code
- **Async Support** - `CompletableFuture` for non-blocking operations
- **Jackson** - JSON serialization with Java Time module

## Installation

### Maven

```xml
<dependency>
    <groupId>io.readylayer</groupId>
    <artifactId>readylayer-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.readylayer:readylayer-java-sdk:1.0.0'
```

## Quick Start

```java
import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;

// Create client with API key
ReadyLayerClient client = ReadyLayerClient.withApiKey("your-api-key");

// Or with custom configuration
ReadyLayerClient client = ReadyLayerClient.builder()
    .apiKey("your-api-key")
    .baseUrl("https://readylayer.io/api/v1")
    .maxRetries(3)
    .timeout(Duration.ofSeconds(30))
    .build();
```

## Usage Examples

### Health Check

```java
// Check API health (no auth required)
HealthResponse health = client.health().getHealth();
System.out.println("Status: " + health.getStatus());

// Check readiness
ReadyResponse ready = client.health().getReady();
System.out.println("Ready: " + ready.getReady());
```

### Repositories

```java
// List repositories
RepositoryListResponse repos = client.repositories().list();
for (Repository repo : repos.getRepositories()) {
    System.out.println(repo.getFullName() + " - " + repo.getProvider());
}

// List with pagination
ListOptions options = ListOptions.builder()
    .pagination(PaginationParams.builder()
        .limit(50)
        .offset(0)
        .build())
    .build();
RepositoryListResponse repos = client.repositories().list(options);

// Get specific repository
Repository repo = client.repositories().get("repo-id");

// Create repository
Repository newRepo = client.repositories().create(
    CreateRepositoryRequest.builder()
        .organizationId("org-id")
        .name("my-repo")
        .fullName("org/my-repo")
        .provider(RepositoryProvider.github)
        .build()
);

// Update repository
Repository updated = client.repositories().update(
    "repo-id",
    UpdateRepositoryRequest.builder()
        .enabled(true)
        .build()
);

// Test connection
TestConnectionResponse test = client.repositories().testConnection("repo-id");
```

### Policies

```java
// List policy packs
PolicyPackListResponse policies = client.policies().list();

// Get policy pack
PolicyPack pack = client.policies().get("pack-id");

// Create policy pack
PolicyPack newPack = client.policies().create(
    CreatePolicyPackRequest.builder()
        .organizationId("org-id")
        .version("1.0.0")
        .source("policy.yaml content")
        .build()
);

// Update policy pack
PolicyPack updated = client.policies().update(
    "pack-id",
    UpdatePolicyPackRequest.builder()
        .version("1.0.1")
        .build()
);

// Delete policy pack
client.policies().delete("pack-id");

// List rules in a pack
PolicyRuleListResponse rules = client.policies().listRules("pack-id");

// Add rule to pack
PolicyRule rule = client.policies().createRule(
    "pack-id",
    CreatePolicyRuleRequest.builder()
        .ruleId("no-console-log")
        .severityMapping(java.util.Map.of("default", SeverityMapping.warn))
        .enabled(true)
        .build()
);

// Validate policy syntax
PolicyValidationResult result = client.policies().validate(
    ValidatePolicyRequest.builder()
        .source("policy yaml content")
        .build()
);
System.out.println("Valid: " + result.getValid());
```

### Code Reviews

```java
// List reviews
ReviewListResponse reviews = client.reviews().list();

// Get specific review
Review review = client.reviews().get("review-id");

// Create review
Review newReview = client.reviews().create(
    CreateReviewRequest.builder()
        .repositoryId("repo-id")
        .prNumber(42)
        .prSha("abc123def456")
        .prTitle("Add new feature")
        .files(java.util.List.of(
            ReviewFile.builder()
                .path("src/main.java")
                .content("// code content")
                .build()
        ))
        .config(ReviewConfig.builder()
            .failOnCritical(true)
            .build())
        .build()
);
```

### Waivers

```java
// List waivers
WaiverListResponse waivers = client.waivers().list();

// Get waiver
Waiver waiver = client.waivers().get("waiver-id");

// Create waiver
Waiver newWaiver = client.waivers().create(
    CreateWaiverRequest.builder()
        .organizationId("org-id")
        .ruleId("rule-id")
        .reason("Legacy code, will fix in next sprint")
        .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
        .build()
);

// Revoke waiver
client.waivers().delete("waiver-id");
```

### Evidence

```java
// List evidence bundles
EvidenceListResponse evidence = client.evidence().list();

// Get evidence bundle
EvidenceBundle bundle = client.evidence().get("bundle-id");

// Export evidence
String json = client.evidence().export("bundle-id");
```

### Test Runs

```java
// List runs
RunListResponse runs = client.runs().list();

// Get run
Run run = client.runs().get("run-id");

// Create run
Run newRun = client.runs().create(
    CreateRunRequest.builder()
        .repositoryId("repo-id")
        .trigger("manual")
        .triggerMetadata(TriggerMetadata.builder()
            .prNumber(42)
            .prSha("abc123")
            .build())
        .build()
);

// Create sandbox run
Run sandboxRun = client.runs().createSandbox(
    CreateSandboxRunRequest.builder()
        .sandboxId("sandbox-1")
        .files(java.util.List.of(
            ReviewFile.builder()
                .path("test.java")
                .content("class Test {}")
                .build()
        ))
        .build()
);
```

### Billing

```java
// Get billing tier
BillingTierResponse billing = client.billing().getTier();
System.out.println("Tier: " + billing.getTier().getName());
System.out.println("Usage: " + billing.getUsage().getReviewsThisMonth());

// Create checkout session
CheckoutSessionResponse checkout = client.billing().createCheckout(
    CreateCheckoutRequest.builder()
        .tier("pro")
        .successUrl("https://example.com/success")
        .cancelUrl("https://example.com/cancel")
        .build()
);
System.out.println("Checkout URL: " + checkout.getUrl());
```

### API Keys

```java
// List API keys
ApiKeyListResponse keys = client.apiKeys().list();

// Create API key
ApiKey newKey = client.apiKeys().create(
    CreateApiKeyRequest.builder()
        .name("CI/CD Key")
        .scopes(java.util.List.of(ApiKeyScope.read, ApiKeyScope.write))
        .expiresAt(Instant.now().plus(365, ChronoUnit.DAYS))
        .build()
);

// Revoke API key
client.apiKeys().revoke("key-id");
```

## Async Operations

All service methods have async variants returning `CompletableFuture`:

```java
// Async repository operations
client.repositories().listAsync()
    .thenAccept(repos -> {
        repos.getRepositories().forEach(repo -> 
            System.out.println(repo.getFullName())
        );
    })
    .exceptionally(ex -> {
        System.err.println("Error: " + ex.getMessage());
        return null;
    });

// Compose async operations
client.repositories().getAsync("repo-id")
    .thenCompose(repo -> 
        client.reviews().createAsync(
            CreateReviewRequest.builder()
                .repositoryId(repo.getId())
                .prNumber(1)
                .build()
        )
    )
    .thenAccept(review -> 
        System.out.println("Review created: " + review.getId())
    );
```

## Error Handling

The SDK throws typed exceptions for different error scenarios:

```java
import io.readylayer.exceptions.*;

try {
    Repository repo = client.repositories().get("invalid-id");
} catch (NotFoundException e) {
    System.err.println("Repository not found: " + e.getResourceId());
} catch (AuthenticationException e) {
    System.err.println("Invalid API key");
} catch (ForbiddenException e) {
    System.err.println("Access denied");
} catch (ValidationException e) {
    System.err.println("Invalid request: " + e.getMessage());
} catch (PaymentRequiredException e) {
    System.err.println("Billing limit exceeded");
} catch (ApiException e) {
    System.err.println("API error (" + e.getStatusCode() + "): " + e.getMessage());
} catch (RetryExhaustedException e) {
    System.err.println("Failed after " + e.getAttempts() + " attempts");
}
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `https://readylayer.io/api/v1` | API base URL |
| `apiKey` | Required | Your ReadyLayer API key |
| `maxRetries` | 3 | Maximum retry attempts |
| `retryDelayMs` | 1000 | Initial retry delay |
| `maxRetryDelayMs` | 30000 | Maximum retry delay |
| `timeout` | 30s | Request timeout |

```java
// Local development
ReadyLayerClient client = ReadyLayerClient.builder()
    .apiKey("local-api-key")
    .baseUrl("http://localhost:3000/api/v1")
    .maxRetries(0) // Disable retries for local dev
    .build();

// Production with custom timeout
ReadyLayerClient client = ReadyLayerClient.builder()
    .apiKey(System.getenv("READYLAYER_API_KEY"))
    .timeout(Duration.ofSeconds(60))
    .maxRetries(5)
    .build();
```

## Requirements

- Java 11 or higher
- Maven 3.6+ or Gradle 6+

## Dependencies

- Jackson (JSON serialization)
- Lombok (compile-time)
- SLF4J (logging facade)

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- Documentation: https://readylayer.io/docs
- Support: support@readylayer.io
- Issues: https://github.com/readylayer/readylayer-java-sdk/issues
