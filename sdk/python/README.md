# ReadyLayer Python SDK

[![PyPI version](https://badge.fury.io/py/readylayer.svg)](https://pypi.org/project/readylayer/)
[![Python versions](https://img.shields.io/pypi/pyversions/readylayer.svg)](https://pypi.org/project/readylayer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready Python SDK for the [ReadyLayer](https://readylayer.io) API - code review governance, policy management, and automated quality assurance.

## Features

- **Sync & Async Support** - Use synchronous or asynchronous clients based on your needs
- **Type Safety** - Full Pydantic v2 models for all API types with IDE autocomplete
- **Automatic Retries** - Built-in exponential backoff for failed requests
- **Comprehensive Errors** - Typed exceptions for all API error cases
- **Pagination Helpers** - Automatic pagination handling with `list_all()` methods
- **Bearer Token Auth** - Secure API key authentication via Authorization header
- **Modern Python** - Python 3.9+ with proper type hints and idiomatic patterns

## Installation

```bash
pip install readylayer
```

### Optional Dependencies

For development:
```bash
pip install readylayer[dev]
```

## Quick Start

### Synchronous Usage

```python
from readylayer import ReadyLayer

# Initialize client
client = ReadyLayer(api_key="your-api-key")

# List repositories
repos = client.repos.list()
for repo in repos.repositories:
    print(f"{repo.full_name} - {repo.provider.value}")

# Create a review
from readylayer import CreateReviewRequest, ReviewFile

review = client.reviews.create(
    CreateReviewRequest(
        repository_id="repo-123",
        pr_number=42,
        pr_sha="abc123...",
        pr_title="My PR",
        files=[
            ReviewFile(path="main.py", content="print('hello')"),
        ],
    )
)
print(f"Review created: {review.id}")
```

### Asynchronous Usage

```python
import asyncio
from readylayer import AsyncReadyLayer

async def main():
    async with AsyncReadyLayer(api_key="your-api-key") as client:
        # List repositories
        repos = await client.repos.list()
        for repo in repos.repositories:
            print(f"{repo.full_name}")
        
        # Get a specific review
        review = await client.reviews.get("review-123")
        print(f"Status: {review.status.value}")

asyncio.run(main())
```

## Configuration

```python
from readylayer import ReadyLayer

client = ReadyLayer(
    api_key="your-api-key",
    base_url="https://readylayer.io/api/v1",  # Default
    timeout=60.0,                               # Default (seconds)
    max_retries=3,                              # Default
)
```

### Environment Variables

```python
import os
from readylayer import ReadyLayer

client = ReadyLayer(api_key=os.environ["READYLAYER_API_KEY"])
```

## Resources

### Repositories

```python
# List repositories (paginated)
repos = client.repos.list(organization_id="org-123", limit=20, offset=0)

# List all repositories (auto-pagination)
all_repos = client.repos.list_all(organization_id="org-123")

# Create repository
from readylayer import CreateRepositoryRequest, Provider

repo = client.repos.create(
    CreateRepositoryRequest(
        organization_id="org-123",
        name="my-repo",
        full_name="org/my-repo",
        provider=Provider.GITHUB,
    )
)

# Get, update, delete
repo = client.repos.get("repo-123")
repo = client.repos.update("repo-123", UpdateRepositoryRequest(enabled=False))
client.repos.delete("repo-123")

# Test connection
result = client.repos.test_connection("repo-123")
print(f"Connected: {result.success}")
```

### Policies

```python
# List policy packs
policies = client.policies.list(organization_id="org-123")

# Create policy pack
from readylayer import CreatePolicyPackRequest

policy = client.policies.create(
    CreatePolicyPackRequest(
        organization_id="org-123",
        version="1.0.0",
        source="...",
    )
)

# Manage rules
rules = client.policies.list_rules("pack-123")
rule = client.policies.create_rule("pack-123", CreatePolicyRuleRequest(...))
client.policies.delete_rule("pack-123", "rule-123")

# Validate policy syntax
result = client.policies.validate(ValidatePolicyRequest(source="..."))
print(f"Valid: {result.valid}")

# List templates
templates = client.policies.list_templates()
```

### Reviews

```python
# List reviews
reviews = client.reviews.list(repository_id="repo-123", pr_number=42)

# Create review
from readylayer import CreateReviewRequest, ReviewFile

review = client.reviews.create(
    CreateReviewRequest(
        repository_id="repo-123",
        pr_number=42,
        pr_sha="abc123...",
        files=[
            ReviewFile(path="src/main.py", content="..."),
        ],
    )
)

# Get review details
review = client.reviews.get("review-123")
print(f"Status: {review.status.value}")
print(f"Blocked: {review.is_blocked}")
print(f"Issues: {review.summary.total}")
```

### Waivers

```python
# List waivers
waivers = client.waivers.list(organization_id="org-123")

# Create waiver
from datetime import datetime, timedelta
from readylayer import CreateWaiverRequest

waiver = client.waivers.create(
    CreateWaiverRequest(
        organization_id="org-123",
        rule_id="rule-123",
        reason="Known issue, will fix next sprint",
        expires_at=datetime.now() + timedelta(days=7),
    )
)

# Revoke waiver
client.waivers.delete("waiver-123")
```

### Evidence

```python
# List evidence bundles
evidence = client.evidence.list(review_id="review-123")

# Get bundle details
bundle = client.evidence.get("bundle-123")
for finding in bundle.findings:
    print(f"{finding.severity.value}: {finding.title}")

# Export evidence
export = client.evidence.export("bundle-123")
```

### Runs

```python
# List runs
runs = client.runs.list(repository_id="repo-123")

# Create run
from readylayer import CreateRunRequest, TriggerType

run = client.runs.create(
    CreateRunRequest(
        repository_id="repo-123",
        trigger=TriggerType.MANUAL,
    )
)

# Create sandbox run
from readylayer import CreateSandboxRunRequest

run = client.runs.create_sandbox(
    CreateSandboxRunRequest(
        sandbox_id="sandbox-123",
        files=[ReviewFile(path="test.py", content="...")],
    )
)

# Get run details
run = client.runs.get("run-123")
print(f"Status: {run.status.value}")
print(f"Review Guard: {run.review_guard_status.value}")
print(f"Gates Passed: {run.gates_passed}")
```

### Billing

```python
# Get billing tier and usage
billing = client.billing.get_tier(organization_id="org-123")
print(f"Tier: {billing.tier.tier.value}")
print(f"Repositories: {billing.usage.repositories}")
print(f"Reviews this month: {billing.usage.reviews_this_month}")

# Create checkout session
from readylayer import CreateCheckoutRequest

session = client.billing.create_checkout_session(
    CreateCheckoutRequest(
        tier="pro",
        success_url="https://example.com/success",
        cancel_url="https://example.com/cancel",
    )
)
print(f"Checkout URL: {session.url}")
```

### Metrics

```python
from datetime import datetime, timedelta

# Get usage metrics
metrics = client.metrics.get(
    organization_id="org-123",
    start_date=datetime.now() - timedelta(days=30),
    end_date=datetime.now(),
)

for point in metrics.metrics.reviews:
    print(f"{point.timestamp}: {point.value} reviews")
```

### Health

```python
# Health check (no auth required)
health = client.health.check()
print(f"Status: {health.status.value}")

# Readiness check
ready = client.health.ready()
print(f"Ready: {ready.ready}")
print(f"Database: {ready.dependencies.get('database', False)}")
```

### API Keys

```python
# List API keys
keys = client.api_keys.list()
for key in keys.keys:
    print(f"{key.name}: {key.scopes}")

# Create API key
from readylayer import CreateApiKeyRequest, ApiKeyScope

key = client.api_keys.create(
    CreateApiKeyRequest(
        name="CI/CD Integration",
        scopes=[ApiKeyScope.READ, ApiKeyScope.WRITE],
    )
)
print(f"Key created: {key.key_preview}")

# Revoke API key
client.api_keys.delete("key-123")
```

## Error Handling

The SDK provides typed exceptions for all API error cases:

```python
from readylayer import ReadyLayer
from readylayer.errors import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
    PaymentRequiredError,
    RateLimitError,
    ServerError,
)

client = ReadyLayer(api_key="your-api-key")

try:
    repo = client.repos.get("repo-123")
except AuthenticationError as e:
    print(f"Invalid API key: {e.message}")
except NotFoundError as e:
    print(f"Repository not found: {e.message}")
except ValidationError as e:
    print(f"Validation failed: {e.message}")
    for field, error in e.validation_errors.items():
        print(f"  {field}: {error}")
except PaymentRequiredError as e:
    print(f"Billing limit exceeded: {e.message}")
except RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after} seconds")
except ServerError as e:
    print(f"Server error ({e.status_code}): {e.message}")
```

## Pagination

All list methods return paginated results. Use `list_all()` methods for automatic pagination:

```python
# Manual pagination
offset = 0
limit = 100
while True:
    page = client.repos.list(limit=limit, offset=offset)
    for repo in page.repositories:
        process(repo)
    if not page.pagination.has_more:
        break
    offset += limit

# Automatic pagination (recommended)
all_repos = client.repos.list_all()
for repo in all_repos:
    process(repo)
```

## Advanced Usage

### Custom HTTP Client

```python
import httpx
from readylayer import ReadyLayer

# Configure custom httpx client
custom_client = httpx.Client(
    proxies="http://proxy.example.com:8080",
    verify=False,  # Not recommended for production
)

# Pass to SDK (sync only)
from readylayer.client import SyncClient

http_client = SyncClient(
    api_key="your-api-key",
    http_client=custom_client,
)
```

### Raw HTTP Access

For advanced use cases, access the underlying HTTP client:

```python
from readylayer.client import SyncClient

client = SyncClient(api_key="your-api-key")
response = client.get("/custom-endpoint")
data = response.json()
```

## API Reference

See the [ReadyLayer API Documentation](https://docs.readylayer.io) for complete API reference.

Base URL: `https://readylayer.io/api/v1`

Authentication: Bearer token via `Authorization: Bearer <api_key>` header

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: https://docs.readylayer.io
- Issues: https://github.com/readylayer/readylayer-python/issues
- Email: support@readylayer.io
