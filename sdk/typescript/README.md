# @readylayer/sdk

Official TypeScript SDK for the [ReadyLayer](https://readylayer.io) API - the code review governance and quality assurance platform.

## Installation

```bash
npm install @readylayer/sdk
```

```bash
yarn add @readylayer/sdk
```

```bash
pnpm add @readylayer/sdk
```

## Quick Start

```typescript
import { ReadyLayerClient } from '@readylayer/sdk';

const client = new ReadyLayerClient({
  apiKey: 'your-api-key',
});

// List repositories
const repos = await client.listRepositories();
console.log(repos.repositories);

// Create a code review
const review = await client.createReview({
  repositoryId: 'repo_123',
  prNumber: 42,
  prSha: 'abc123...',
  files: [
    {
      path: 'src/index.ts',
      content: '// code content here',
    },
  ],
});
```

## Configuration

```typescript
const client = new ReadyLayerClient({
  // Required: Your API key or Bearer token
  apiKey: process.env.READYLAYER_API_KEY,

  // Optional: Custom base URL (default: https://readylayer.io/api/v1)
  baseURL: 'http://localhost:3000/api/v1',

  // Optional: Retry configuration
  maxRetries: 3,        // Default: 3
  retryDelayMs: 1000,   // Default: 1000
  maxRetryDelayMs: 10000, // Default: 10000

  // Optional: Request timeout
  timeoutMs: 30000,     // Default: 30000ms
});
```

## API Reference

### Health

```typescript
// Check service health
const health = await client.getHealth();

// Check service readiness
const ready = await client.getReady();
```

### Repositories

```typescript
// List repositories
const repos = await client.listRepositories({
  organizationId: 'org_123',
  limit: 20,
  offset: 0,
});

// Get a repository
const repo = await client.getRepository('repo_123');

// Create a repository
const newRepo = await client.createRepository({
  organizationId: 'org_123',
  name: 'my-repo',
  fullName: 'acme/my-repo',
  provider: 'github',
});

// Update a repository
const updated = await client.updateRepository('repo_123', {
  enabled: true,
});

// Delete a repository
await client.deleteRepository('repo_123');

// Test repository connection
const result = await client.testRepositoryConnection('repo_123');
```

### Policies

```typescript
// List policy packs
const policies = await client.listPolicyPacks({
  organizationId: 'org_123',
});

// Get a policy pack
const pack = await client.getPolicyPack('pack_123');

// Create a policy pack
const newPack = await client.createPolicyPack({
  organizationId: 'org_123',
  version: '1.0.0',
  source: 'policy.yaml',
  rules: [
    {
      ruleId: 'no-console',
      severityMapping: { high: 'block' },
      enabled: true,
    },
  ],
});

// Update a policy pack
const updatedPack = await client.updatePolicyPack('pack_123', {
  version: '1.1.0',
});

// Delete a policy pack
await client.deletePolicyPack('pack_123');

// List policy rules
const rules = await client.listPolicyRules('pack_123');

// Create a policy rule
const newRule = await client.createPolicyRule('pack_123', {
  ruleId: 'no-console',
  severityMapping: { high: 'block' },
});

// Update a policy rule
const updatedRule = await client.updatePolicyRule('pack_123', 'rule_123', {
  enabled: false,
});

// Delete a policy rule
await client.deletePolicyRule('pack_123', 'rule_123');

// Validate policy syntax
const validation = await client.validatePolicy({
  source: 'policy yaml content here',
});

// List policy templates
const templates = await client.listPolicyTemplates();
```

### Reviews

```typescript
// List reviews
const reviews = await client.listReviews({
  repositoryId: 'repo_123',
  prNumber: 42,
});

// Get a review
const review = await client.getReview('review_123');

// Create a review
const newReview = await client.createReview({
  repositoryId: 'repo_123',
  prNumber: 42,
  prSha: 'abc123...',
  prTitle: 'My PR',
  files: [
    {
      path: 'src/index.ts',
      content: '// code content',
      beforeContent: '// previous version',
    },
  ],
  config: {
    failOnCritical: true,
    failOnHigh: true,
    enabledRules: ['no-console', 'strict-types'],
  },
});
```

### Waivers

```typescript
// List waivers
const waivers = await client.listWaivers({
  organizationId: 'org_123',
});

// Get a waiver
const waiver = await client.getWaiver('waiver_123');

// Create a waiver
const newWaiver = await client.createWaiver({
  organizationId: 'org_123',
  ruleId: 'no-console',
  reason: 'Temporary exception for migration',
  expiresAt: '2024-12-31T23:59:59Z',
});

// Delete a waiver
await client.deleteWaiver('waiver_123');
```

### Evidence

```typescript
// List evidence bundles
const bundles = await client.listEvidence({
  reviewId: 'review_123',
});

// Get an evidence bundle
const bundle = await client.getEvidence('bundle_123');

// Export evidence
const exported = await client.exportEvidence('bundle_123');
```

### Runs

```typescript
// List runs
const runs = await client.listRuns({
  repositoryId: 'repo_123',
});

// Get a run
const run = await client.getRun('run_123');

// Create a run
const newRun = await client.createRun({
  trigger: 'webhook',
  repositoryId: 'repo_123',
  triggerMetadata: {
    prNumber: 42,
    prSha: 'abc123...',
  },
});

// Create a sandbox run
const sandboxRun = await client.createSandboxRun({
  sandboxId: 'sandbox_123',
  files: [
    {
      path: 'src/index.ts',
      content: '// code content',
    },
  ],
});
```

### Billing

```typescript
// Get billing tier
const billing = await client.getBillingTier({
  organizationId: 'org_123',
});

// Create checkout session
const checkout = await client.createCheckoutSession({
  tier: 'pro',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
});
```

### Metrics

```typescript
// Get metrics
const metrics = await client.getMetrics({
  organizationId: 'org_123',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
});
```

### API Keys

```typescript
// List API keys
const keys = await client.listApiKeys();

// Create API key
const newKey = await client.createApiKey({
  name: 'CI/CD Integration',
  scopes: ['read', 'write'],
  expiresAt: '2024-12-31T23:59:59Z',
});

// Delete API key
await client.deleteApiKey('key_123');
```

## Error Handling

The SDK throws typed errors for different failure scenarios:

```typescript
import {
  ReadyLayerClient,
  BadRequestError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  RetryExhaustedError,
} from '@readylayer/sdk';

try {
  const review = await client.createReview({ ... });
} catch (error) {
  if (error instanceof BadRequestError) {
    console.log('Validation failed:', error.validationErrors);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof PermissionError) {
    console.log('Insufficient permissions');
  } else if (error instanceof NotFoundError) {
    console.log('Resource not found:', error.resourceId);
  } else if (error instanceof PaymentRequiredError) {
    console.log('Billing limit exceeded');
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof ServerError) {
    console.log('Server error:', error.statusCode);
  }
}
```

## Pagination

List endpoints return paginated results:

```typescript
let offset = 0;
const limit = 50;

while (true) {
  const response = await client.listRepositories({ limit, offset });

  for (const repo of response.repositories) {
    console.log(repo.name);
  }

  if (!response.pagination.hasMore) {
    break;
  }

  offset += limit;
}
```

## Retry Logic

The SDK automatically retries failed requests with exponential backoff and jitter:

- **Retryable status codes**: 408, 429, 500, 502, 503, 504
- **Exponential backoff**: `retryDelayMs * 2^attempt + jitter`
- **Jitter**: 30% randomization to avoid thundering herd
- **Max delay**: Capped at `maxRetryDelayMs`

Configure retry behavior:

```typescript
const client = new ReadyLayerClient({
  apiKey: 'your-api-key',
  maxRetries: 5,        // Maximum retry attempts
  retryDelayMs: 500,    // Initial retry delay
  maxRetryDelayMs: 5000, // Maximum delay between retries
  timeoutMs: 60000,     // Request timeout
});
```

## Requirements

- Node.js 18.0.0 or later
- TypeScript 5.0 or later (for TypeScript projects)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: https://readylayer.io/docs
- Issues: https://github.com/readylayer/readylayer/issues
- Email: support@readylayer.io
