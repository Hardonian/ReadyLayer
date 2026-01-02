# Policy Management API Documentation

## Overview

REST API for managing Policy Packs, Rules, Waivers, and Evidence Bundles.

**Base URL**: `/api/v1`

**Authentication**: Required (Bearer token or session)

**Authorization**: Requires `read` scope for GET, `write` scope for POST/PUT/DELETE

---

## Policy Pack Management

### Create Policy Pack

**POST** `/api/v1/policies`

Creates a new policy pack for an organization or repository.

**Request Body**:
```json
{
  "organizationId": "org_123",
  "repositoryId": "repo_456",  // Optional, null for org-level
  "version": "1.0.0",
  "source": "{\"version\": \"1.0.0\", \"rules\": []}",  // JSON or YAML string
  "rules": [  // Optional, can also be in source
    {
      "ruleId": "security.sql-injection",
      "severityMapping": {
        "critical": "block",
        "high": "block",
        "medium": "warn",
        "low": "allow"
      },
      "enabled": true,
      "params": {}
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": "pack_789",
  "organizationId": "org_123",
  "repositoryId": "repo_456",
  "version": "1.0.0",
  "checksum": "abc123...",
  "rules": [...],
  "createdAt": "2026-01-02T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

---

### List Policy Packs

**GET** `/api/v1/policies`

Lists policy packs with tenant isolation.

**Query Parameters**:
- `organizationId` (optional) - Filter by organization
- `repositoryId` (optional) - Filter by repository
- `limit` (optional, default: 20) - Page size
- `offset` (optional, default: 0) - Pagination offset

**Response** (200 OK):
```json
{
  "policies": [
    {
      "id": "pack_789",
      "organizationId": "org_123",
      "repositoryId": "repo_456",
      "version": "1.0.0",
      "checksum": "abc123...",
      "rules": [...],
      "createdAt": "2026-01-02T00:00:00Z",
      "updatedAt": "2026-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Policy Pack

**GET** `/api/v1/policies/:packId`

Gets detailed information about a policy pack.

**Response** (200 OK):
```json
{
  "id": "pack_789",
  "organizationId": "org_123",
  "repositoryId": "repo_456",
  "version": "1.0.0",
  "source": "...",
  "checksum": "abc123...",
  "rules": [...],
  "organization": {
    "id": "org_123",
    "name": "Acme Corp",
    "slug": "acme"
  },
  "repository": {
    "id": "repo_456",
    "name": "my-repo",
    "fullName": "acme/my-repo"
  },
  "createdAt": "2026-01-02T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

---

### Update Policy Pack

**PUT** `/api/v1/policies/:packId`

Updates a policy pack.

**Request Body**:
```json
{
  "version": "1.1.0",  // Optional
  "source": "...",     // Optional
  "rules": [...]       // Optional, replaces all rules
}
```

**Response** (200 OK): Same as Get Policy Pack

---

### Delete Policy Pack

**DELETE** `/api/v1/policies/:packId`

Deletes a policy pack (cascade deletes rules).

**Response** (200 OK):
```json
{
  "message": "Policy pack deleted successfully"
}
```

---

## Policy Rule Management

### Add Rule to Pack

**POST** `/api/v1/policies/:packId/rules`

Adds a rule to a policy pack.

**Request Body**:
```json
{
  "ruleId": "security.sql-injection",
  "severityMapping": {
    "critical": "block",
    "high": "block",
    "medium": "warn",
    "low": "allow"
  },
  "enabled": true,
  "params": {}
}
```

**Response** (201 Created):
```json
{
  "id": "rule_123",
  "policyPackId": "pack_789",
  "ruleId": "security.sql-injection",
  "severityMapping": {...},
  "enabled": true,
  "params": {},
  "createdAt": "2026-01-02T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

---

### List Rules in Pack

**GET** `/api/v1/policies/:packId/rules`

Lists all rules in a policy pack.

**Response** (200 OK):
```json
{
  "rules": [
    {
      "id": "rule_123",
      "policyPackId": "pack_789",
      "ruleId": "security.sql-injection",
      "severityMapping": {...},
      "enabled": true,
      "params": {},
      "createdAt": "2026-01-02T00:00:00Z",
      "updatedAt": "2026-01-02T00:00:00Z"
    }
  ]
}
```

---

### Update Rule

**PUT** `/api/v1/policies/:packId/rules/:ruleId`

Updates a policy rule.

**Request Body**:
```json
{
  "severityMapping": {...},  // Optional
  "enabled": false,          // Optional
  "params": {}               // Optional
}
```

**Response** (200 OK): Same as Add Rule

---

### Remove Rule

**DELETE** `/api/v1/policies/:packId/rules/:ruleId`

Removes a rule from a policy pack.

**Response** (200 OK):
```json
{
  "message": "Policy rule deleted successfully"
}
```

---

## Waiver Management

### Create Waiver

**POST** `/api/v1/waivers`

Creates a waiver to temporarily suppress findings.

**Request Body**:
```json
{
  "organizationId": "org_123",
  "repositoryId": "repo_456",  // Optional, null for org-level
  "ruleId": "security.sql-injection",
  "scope": "repo",  // "repo" | "branch" | "path"
  "scopeValue": "main",  // Optional, branch name or path pattern
  "reason": "False positive, will fix in next sprint",
  "expiresAt": "2026-02-01T00:00:00Z"  // Optional
}
```

**Response** (201 Created):
```json
{
  "id": "waiver_123",
  "organizationId": "org_123",
  "repositoryId": "repo_456",
  "ruleId": "security.sql-injection",
  "scope": "repo",
  "scopeValue": "main",
  "reason": "...",
  "expiresAt": "2026-02-01T00:00:00Z",
  "createdBy": "user_789",
  "createdAt": "2026-01-02T00:00:00Z",
  "updatedAt": "2026-01-02T00:00:00Z"
}
```

---

### List Waivers

**GET** `/api/v1/waivers`

Lists waivers with filtering.

**Query Parameters**:
- `organizationId` (optional) - Filter by organization
- `repositoryId` (optional) - Filter by repository
- `ruleId` (optional) - Filter by rule ID
- `activeOnly` (optional, default: false) - Only show non-expired waivers
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response** (200 OK):
```json
{
  "waivers": [...],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Waiver

**GET** `/api/v1/waivers/:waiverId`

Gets waiver details.

**Response** (200 OK): Same as Create Waiver (includes organization/repository info)

---

### Revoke Waiver

**DELETE** `/api/v1/waivers/:waiverId`

Revokes a waiver (immediately effective).

**Response** (200 OK):
```json
{
  "message": "Waiver revoked successfully"
}
```

---

## Evidence Access

### Get Evidence Bundle

**GET** `/api/v1/evidence/:bundleId`

Gets evidence bundle details.

**Response** (200 OK):
```json
{
  "id": "bundle_123",
  "reviewId": "review_456",
  "testId": null,
  "docId": null,
  "inputsMetadata": {
    "diffHash": "abc123...",
    "fileListHash": "def456...",
    "commitSha": "abc123def456",
    "prNumber": 42
  },
  "rulesFired": ["security.sql-injection", "quality.unused-variable"],
  "deterministicScore": 85.5,
  "artifacts": {},
  "policyChecksum": "xyz789...",
  "toolVersions": {
    "policyEngine": "1.0.0",
    "nodeVersion": "v20.0.0"
  },
  "timings": {
    "totalMs": 1234
  },
  "createdAt": "2026-01-02T00:00:00Z"
}
```

---

### List Evidence Bundles

**GET** `/api/v1/evidence`

Lists evidence bundles with filtering.

**Query Parameters**:
- `organizationId` (optional) - Filter by organization
- `repositoryId` (optional) - Filter by repository
- `reviewId` (optional) - Filter by review ID
- `testId` (optional) - Filter by test ID
- `docId` (optional) - Filter by doc ID
- `policyChecksum` (optional) - Filter by policy checksum
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response** (200 OK):
```json
{
  "evidence": [
    {
      "id": "bundle_123",
      "reviewId": "review_456",
      "rulesFired": [...],
      "deterministicScore": 85.5,
      "policyChecksum": "xyz789...",
      "createdAt": "2026-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Export Evidence Bundle

**GET** `/api/v1/evidence/:bundleId/export`

Exports evidence bundle in stable JSON format (downloadable).

**Response** (200 OK):
```json
{
  "schemaVersion": "1.0.0",
  "evidenceBundle": {...},
  "policy": {
    "checksum": "xyz789...",
    "version": "1.0.0",
    "rules": [...]
  },
  "inputs": {...},
  "outputs": {...},
  "timestamps": {
    "createdAt": "2026-01-02T00:00:00Z",
    "evaluatedAt": "2026-01-02T00:00:00Z"
  }
}
```

**Headers**:
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="evidence-{bundleId}.json"`

---

## Policy Validation

### Validate Policy

**POST** `/api/v1/policies/validate`

Validates policy YAML/JSON syntax and structure.

**Request Body**:
```json
{
  "source": "{\"version\": \"1.0.0\", \"rules\": []}",
  "version": "1.0.0",  // Optional
  "rules": [...]       // Optional
}
```

**Response** (200 OK - Valid):
```json
{
  "valid": true,
  "checksum": "abc123...",
  "version": "1.0.0",
  "rulesCount": 5
}
```

**Response** (200 OK - Invalid):
```json
{
  "valid": false,
  "errors": [
    {
      "path": "version",
      "message": "Version is required"
    },
    {
      "path": "rules[0].severityMapping",
      "message": "Invalid severity keys: invalid. Valid: critical, high, medium, low"
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [...]  // Optional, validation errors
  }
}
```

**HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

---

## Authentication

All endpoints require authentication:

1. **Session-based**: Cookie authentication (browser)
2. **API Key**: `Authorization: Bearer <api-key>`

API keys must have appropriate scopes:
- `read` - For GET endpoints
- `write` - For POST/PUT/DELETE endpoints

---

## Tenant Isolation

All endpoints enforce tenant isolation:
- Users can only access resources from organizations they belong to
- Organization membership is verified on every request
- Repository access is verified if repositoryId is provided

---

## Examples

### Create Org-Level Policy Pack

```bash
curl -X POST https://api.readylayer.com/api/v1/policies \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_123",
    "version": "1.0.0",
    "source": "{\"version\": \"1.0.0\"}",
    "rules": [
      {
        "ruleId": "security.sql-injection",
        "severityMapping": {
          "critical": "block",
          "high": "block"
        },
        "enabled": true
      }
    ]
  }'
```

### Create Waiver for Specific Branch

```bash
curl -X POST https://api.readylayer.com/api/v1/waivers \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_123",
    "repositoryId": "repo_456",
    "ruleId": "quality.unused-variable",
    "scope": "branch",
    "scopeValue": "feature-branch",
    "reason": "Temporary waiver for refactoring branch",
    "expiresAt": "2026-02-01T00:00:00Z"
  }'
```

### Export Evidence Bundle

```bash
curl -X GET https://api.readylayer.com/api/v1/evidence/bundle_123/export \
  -H "Authorization: Bearer $API_KEY" \
  -o evidence-bundle_123.json
```
