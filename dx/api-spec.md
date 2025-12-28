# ReadyLayer — API Specification

## Overview

ReadyLayer provides a REST API for programmatic access to review results, test generation, documentation, and configuration. This document defines the API surface, endpoints, authentication, and usage examples.

---

## Base URL

```
Production: https://api.readylayer.com/v1
Staging: https://api-staging.readylayer.com/v1
```

---

## Authentication

### API Keys
**Header:** `Authorization: Bearer {api_key}`

**Obtaining API Keys:**
1. Go to ReadyLayer dashboard → Settings → API Keys
2. Click "Create API Key"
3. Copy key (shown once, store securely)

**Scopes:**
- `read`: Read-only access (reviews, tests, docs)
- `write`: Write access (config, rules)
- `admin`: Admin access (users, orgs, billing)

### OAuth 2.0
**Flow:** Standard OAuth 2.0 authorization code flow

**Endpoints:**
- Authorization: `https://readylayer.com/oauth/authorize`
- Token: `https://api.readylayer.com/oauth/token`

**Scopes:**
- `read`: Read-only access
- `write`: Write access
- `admin`: Admin access

---

## Endpoints

### Reviews

#### Get Review Results
```http
GET /reviews/{review_id}
```

**Response:**
```json
{
  "id": "review_123",
  "repo_id": "repo_456",
  "pr_id": "pr_789",
  "status": "completed",
  "issues": [
    {
      "id": "issue_1",
      "severity": "critical",
      "rule_id": "security.sql-injection",
      "file": "src/auth.ts",
      "line": 42,
      "message": "Security issue: potential SQL injection",
      "suggestion": "Use parameterized queries",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "total_issues": 5,
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:00Z"
}
```

#### List Reviews
```http
GET /reviews?repo_id={repo_id}&pr_id={pr_id}&status={status}&limit={limit}&offset={offset}
```

**Query Parameters:**
- `repo_id` (optional): Filter by repo
- `pr_id` (optional): Filter by PR
- `status` (optional): Filter by status (pending, completed, failed)
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "reviews": [
    {
      "id": "review_123",
      "repo_id": "repo_456",
      "pr_id": "pr_789",
      "status": "completed",
      "summary": {
        "total_issues": 5,
        "critical": 1
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Create Review
```http
POST /reviews
```

**Request Body:**
```json
{
  "repo_id": "repo_456",
  "pr_id": "pr_789",
  "diff_url": "https://github.com/acme/myapp/pull/42.diff",
  "config": {
    "fail_on_critical": true,
    "fail_on_high": false
  }
}
```

**Response:**
```json
{
  "id": "review_123",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Tests

#### Generate Tests
```http
POST /tests/generate
```

**Request Body:**
```json
{
  "repo_id": "repo_456",
  "file_path": "src/auth.ts",
  "framework": "jest",
  "options": {
    "include_edge_cases": true,
    "include_error_cases": true
  }
}
```

**Response:**
```json
{
  "id": "test_gen_123",
  "status": "completed",
  "tests": [
    {
      "file_path": "src/__tests__/auth.test.ts",
      "content": "import { authenticate } from '../auth';\n\ndescribe('authenticate', () => {\n  it('should authenticate valid user', () => {\n    // ...\n  });\n});",
      "framework": "jest"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:31:00Z"
}
```

#### Get Coverage
```http
GET /tests/coverage?repo_id={repo_id}&pr_id={pr_id}&ref={ref}
```

**Query Parameters:**
- `repo_id` (required): Repository ID
- `pr_id` (optional): PR ID (for PR-specific coverage)
- `ref` (optional): Branch or commit SHA (default: main)

**Response:**
```json
{
  "repo_id": "repo_456",
  "ref": "main",
  "coverage": {
    "lines": {
      "total": 1000,
      "covered": 850,
      "percentage": 85.0
    },
    "branches": {
      "total": 500,
      "covered": 400,
      "percentage": 80.0
    },
    "functions": {
      "total": 200,
      "covered": 180,
      "percentage": 90.0
    }
  },
  "files": {
    "src/auth.ts": {
      "lines": {
        "total": 100,
        "covered": 90,
        "percentage": 90.0
      }
    }
  },
  "generated_at": "2024-01-15T10:30:00Z"
}
```

---

### Documentation

#### Get OpenAPI Spec
```http
GET /docs/openapi?repo_id={repo_id}&ref={ref}&version={version}
```

**Query Parameters:**
- `repo_id` (required): Repository ID
- `ref` (optional): Branch or commit SHA (default: main)
- `version` (optional): OpenAPI version (3.0, 3.1, default: 3.1)

**Response:**
```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      summary: Get user by ID
      # ...
```

#### Generate Documentation
```http
POST /docs/generate
```

**Request Body:**
```json
{
  "repo_id": "repo_456",
  "ref": "main",
  "format": "openapi",
  "options": {
    "enhance_with_llm": true,
    "include_examples": true
  }
}
```

**Response:**
```json
{
  "id": "doc_gen_123",
  "status": "completed",
  "spec": {
    "format": "openapi",
    "version": "3.1.0",
    "url": "https://api.readylayer.com/v1/docs/openapi?repo_id=repo_456"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:35:00Z"
}
```

#### Check Drift
```http
GET /docs/drift?repo_id={repo_id}&ref={ref}
```

**Query Parameters:**
- `repo_id` (required): Repository ID
- `ref` (optional): Branch or commit SHA (default: main)

**Response:**
```json
{
  "repo_id": "repo_456",
  "ref": "main",
  "drift_detected": true,
  "missing_endpoints": [
    {
      "method": "GET",
      "path": "/api/users/{id}",
      "file": "src/api/users.ts",
      "line": 42
    }
  ],
  "extra_endpoints": [],
  "changed_endpoints": [],
  "schema_drift": [],
  "generated_at": "2024-01-15T10:30:00Z"
}
```

---

### Repositories

#### Get Repository
```http
GET /repos/{repo_id}
```

**Response:**
```json
{
  "id": "repo_456",
  "name": "myapp",
  "owner": "acme",
  "provider": "github",
  "url": "https://github.com/acme/myapp",
  "config": {
    "review": {
      "enabled": true,
      "fail_on_critical": true
    },
    "test": {
      "enabled": true,
      "framework": "jest",
      "coverage_threshold": 80
    },
    "docs": {
      "enabled": true,
      "update_strategy": "pr"
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Update Repository Config
```http
PATCH /repos/{repo_id}
```

**Request Body:**
```json
{
  "config": {
    "review": {
      "fail_on_critical": false
    },
    "test": {
      "coverage_threshold": 85
    }
  }
}
```

**Response:**
```json
{
  "id": "repo_456",
  "config": {
    "review": {
      "enabled": true,
      "fail_on_critical": false
    },
    "test": {
      "enabled": true,
      "framework": "jest",
      "coverage_threshold": 85
    }
  },
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### List Repositories
```http
GET /repos?org_id={org_id}&limit={limit}&offset={offset}
```

**Query Parameters:**
- `org_id` (optional): Filter by organization
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

---

### Rules

#### List Rules
```http
GET /rules?repo_id={repo_id}&category={category}&enabled={enabled}
```

**Query Parameters:**
- `repo_id` (optional): Filter by repo
- `category` (optional): Filter by category (security, quality, style, ai)
- `enabled` (optional): Filter by enabled status

**Response:**
```json
{
  "rules": [
    {
      "id": "security.sql-injection",
      "name": "SQL Injection Risk",
      "category": "security",
      "severity": "critical",
      "description": "Detects potential SQL injection vulnerabilities",
      "enabled": true,
      "configurable": true
    }
  ]
}
```

#### Update Rule
```http
PATCH /rules/{rule_id}
```

**Request Body:**
```json
{
  "enabled": false,
  "severity_override": "high"
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid request parameters",
    "details": {
      "field": "repo_id",
      "reason": "Repository not found"
    }
  }
}
```

### Error Codes
- `invalid_request`: Invalid request parameters
- `unauthorized`: Authentication required
- `forbidden`: Insufficient permissions
- `not_found`: Resource not found
- `rate_limit_exceeded`: Rate limit exceeded
- `internal_error`: Internal server error

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limiting

### Limits
- **Per API key:** 1,000 requests/hour
- **Per user:** 5,000 requests/hour
- **Per org:** 10,000 requests/hour

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

### Exceeding Limits
**Response:** `429 Too Many Requests`

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

---

## Pagination

### Query Parameters
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Webhooks

### Webhook Events
- `review.completed`: Review completed
- `test.generated`: Tests generated
- `docs.updated`: Documentation updated
- `coverage.below_threshold`: Coverage below threshold

### Webhook Payload
```json
{
  "event": "review.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "review_id": "review_123",
    "repo_id": "repo_456",
    "pr_id": "pr_789",
    "issues_found": 5
  }
}
```

### Webhook Configuration
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["review.completed", "test.generated"],
  "secret": "webhook_secret"
}
```

---

## SDKs

### Official SDKs
- **JavaScript/TypeScript:** `@readylayer/sdk`
- **Python:** `readylayer-python`
- **Go:** `github.com/readylayer/go-sdk`

### Usage Example (TypeScript)
```typescript
import { ReadyLayer } from '@readylayer/sdk';

const client = new ReadyLayer({
  apiKey: process.env.READYLAYER_API_KEY
});

// Get review results
const review = await client.reviews.get('review_123');
console.log(review.issues);

// Generate tests
const tests = await client.tests.generate({
  repo_id: 'repo_456',
  file_path: 'src/auth.ts',
  framework: 'jest'
});
console.log(tests.tests);
```

---

## OpenAPI Specification

Full OpenAPI 3.1 specification available at:
```
https://api.readylayer.com/openapi.json
```

---

## Support

- **Documentation:** https://docs.readylayer.com
- **Support:** support@readylayer.com
- **Status:** https://status.readylayer.com
