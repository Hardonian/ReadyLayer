# ReadyLayer API Endpoints Documentation

> **REST + WebSocket** • **Type-Safe** • **Local/Cloud Parity**

ReadyLayer provides comprehensive API coverage for both local-first and cloud deployments with identical contracts.

## 🔌 Base Configuration

### Local Development
```
http://localhost:3000/api/v1
```

### Production (Cloud)
```
https://readylayer.io/api/v1
```

### Headers
```typescript
// Required for all endpoints
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Content-Type': 'application/json'
}

// Optional request tracing
headers: {
  'X-Request-ID': generateUUID(),
  'X-Client-Version': '1.0.0'
}
```

## 📊 Response Format

### Success Response
```typescript
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}
```

### Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}
```

## 🏗️ Core Endpoints

### Authentication
#### `POST /auth/login`
```typescript
interface LoginRequest {
  email: string;
  password: string;
  scopes?: string[];
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'readonly';
    scopes: string[];
    orgId: string;
  };
  expiresIn: number;
}
```

#### `POST /auth/refresh`
```typescript
interface RefreshRequest {
  token: string;
}

interface RefreshResponse {
  token: string;
  expiresIn: number;
}
```

#### `POST /auth/logout`
```typescript
interface LogoutRequest {
  token: string;
}
```

### Repositories
#### `GET /repos`
```typescript
interface ReposQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface ReposResponse {
  repositories: Array<{
    id: string;
    name: string;
    url: string;
    provider: 'github' | 'gitlab' | 'bitbucket';
    isActive: boolean;
    lastSync: string;
    policies: PolicySummary[];
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### `POST /repos`
```typescript
interface CreateRepoRequest {
  name: string;
  url: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  accessToken?: string;
}

interface CreateRepoResponse {
  repository: Repository;
  webhookSecret: string;
  setupInstructions: string;
}
```

#### `GET /repos/{id}/sync`
```typescript
interface SyncResponse {
  syncId: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  lastSync: string;
  commitsProcessed: number;
  policiesApplied: number;
}
```

### Governance Policies
#### `GET /policies`
```typescript
interface PoliciesQuery {
  repositoryId?: string;
  category?: 'security' | 'performance' | 'quality' | 'testing';
  active?: boolean;
}

interface PoliciesResponse {
  policies: Array<{
    id: string;
    name: string;
    category: string;
    rules: PolicyRule[];
    isActive: boolean;
    version: string;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

#### `POST /policies`
```typescript
interface CreatePolicyRequest {
  name: string;
  category: 'security' | 'performance' | 'quality' | 'testing';
  rules: PolicyRule[];
  repositoryIds: string[];
}

interface PolicyRule {
  type: 'pattern_match' | 'file_size_check' | 'dependency_scan';
  config: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
  action: 'block' | 'warn' | 'info';
}
```

#### `PUT /policies/{id}`
```typescript
interface UpdatePolicyRequest {
  name?: string;
  category?: string;
  rules?: PolicyRule[];
  isActive?: boolean;
  repositoryIds?: string[];
}
```

### Reviews & Results
#### `GET /reviews`
```typescript
interface ReviewsQuery {
  repositoryId: string;
  branch?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  page?: number;
  limit?: number;
}

interface ReviewsResponse {
  reviews: Array<{
    id: string;
    repositoryId: string;
    pullRequestId: number;
    branch: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    results: ReviewResult[];
    policyVersion: string;
    auditTrail: AuditEntry[];
  }>;
}
```

#### `GET /reviews/{id}/results`
```typescript
interface ReviewResultsResponse {
  results: Array<{
    policyId: string;
    policyName: string;
    status: 'passed' | 'failed' | 'warning';
    severity: 'error' | 'warning' | 'info';
    message: string;
    details: any;
    evidence: EvidenceBundle;
  }>;
}
```

## 🌐 WebSocket Events

### Connection
```
ws://localhost:3000/api/v1/ws
```

### Authentication
```typescript
// Connect with JWT token
const ws = new WebSocket('ws://localhost:3000/api/v1/ws', ['jwt', process.env.JWT_TOKEN]);
```

### Event Types
```typescript
interface WebSocketEvent {
  type: 'review.started' | 'review.progress' | 'review.completed' | 'policy.updated' | 'repository.synced';
  payload: any;
  timestamp: string;
  requestId: string;
}
```

### Real-time Updates
```typescript
// Review progress
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'review.started':
      console.log('Review started:', data.payload.reviewId);
      break;
      
    case 'review.progress':
      console.log('Progress:', data.payload.percentage, data.payload.currentStep);
      break;
      
    case 'review.completed':
      console.log('Review completed:', data.payload.results);
      break;
  }
};
```

## 🔒 Security

### Rate Limiting
```typescript
// Headers included in responses
headers: {
  'X-RateLimit-Limit': '1000',
  'X-RateLimit-Remaining': '999',
  'X-RateLimit-Reset': '1640995200' // Unix timestamp
}
```

### CORS Configuration
```typescript
// Local development
allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'];

// Production
allowedOrigins: ['https://*.readylayer.io', 'https://*.github.io'];
```

### Input Validation
```typescript
// All inputs validated with Zod schemas
interface ValidationError {
  field: string;
  message: string;
  expected: string;
  received: string;
}
```

## 📈 Analytics & Monitoring

### Health Checks
```
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
```

### Metrics
```
GET /api/v1/metrics/usage
GET /api/v1/metrics/performance  
GET /api/v1/metrics/errors
```

## 🎮 Demo Mode

### `GET /api/demo`
Execute the full ReadyLayer governance pipeline against deterministic fixtures. No credentials required.

**Requires:** `DEMO_MODE_ENABLED=true` environment variable

**Response:**
```typescript
interface DemoResponse {
  success: true;
  data: {
    runId: string;
    timestamp: string;
    pr: {
      number: number;
      sha: string;
      title: string;
    };
    checks: DemoCheckResult[];
    decision: {
      status: 'ready' | 'blocked';
      reason?: string;
    };
    artifacts: DemoArtifact[];
  };
  requestId: string;
  timestamp: string;
}

interface DemoCheckResult {
  id: string;
  name: string;
  category: 'review-guard' | 'test-engine' | 'doc-sync';
  status: 'success' | 'failure' | 'error';
  duration: number;
  findings?: DemoFinding[];
  metrics?: {
    findingsCount?: number;
    testsGenerated?: number;
    coverageDelta?: number;
    docsUpdated?: number;
  };
  artifacts?: DemoArtifact[];
}

interface DemoArtifact {
  type: 'openapi' | 'readme' | 'changelog' | 'test';
  summary: string;
  content: string;
}
```

**Example:**
```bash
curl http://localhost:3000/api/demo
```

### `POST /api/demo`
Execute demo pipeline with optional check filtering.

**Request Body:**
```typescript
{
  checkIds?: string[];  // Optional filter: ['rg-security', 'rg-performance', 'rg-quality', 'te-unit', 'te-coverage', 'ds-openapi', 'ds-readme', 'ds-changelog']
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/demo \
  -H "Content-Type: application/json" \
  -d '{"checkIds": ["rg-security", "te-unit"]}'
```

## 🔌 Client Libraries

### JavaScript/TypeScript
```bash
npm install @readylayer/client
```

```typescript
import { ReadyLayerClient } from '@readylayer/client';

const client = new ReadyLayerClient({
  baseURL: 'https://api.readylayer.io/api/v1',
  token: 'your-jwt-token'
});

const repositories = await client.repos.list();
const review = await client.reviews.start('repo-id', 'feature-branch');
```

### Python
```bash
pip install readylayer-python
```

```python
from readylayer import ReadyLayerClient

client = ReadyLayerClient(
    base_url='https://api.readylayer.io/api/v1',
    token='your-jwt-token'
)

repositories = client.repos.list()
review = client.reviews.start('repo-id', 'feature-branch')
```

## 📋 Error Codes

| Code | Description | HTTP Status |
|-------|-------------|-------------|
| `UNAUTHORIZED` | Invalid or expired token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Maintenance or outage | 503 |

## 🔄 API Versioning

ReadyLayer uses semantic versioning:
- **v1.x.x**: Current stable API
- **v2.x.x**: Next major version (breaking changes)
- **v1.x.(x+1)**: Backward compatible additions

Version specified in URL path: `/api/v1/`

## 📱 SDK Downloads

- **[JavaScript SDK](https://npmjs.com/package/@readylayer/client)**
- **[Python SDK](https://pypi.org/project/readylayer-python)**
- **[CLI Tool](https://github.com/readylayer/cli)**
- **[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=readylayer.readylayer)**

---

ReadyLayer's API provides complete parity between local and cloud deployments, ensuring your governance workflows work consistently regardless of infrastructure choice.