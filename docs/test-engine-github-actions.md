# Test Engine GitHub Actions Integration

ReadyLayer can trigger GitHub Actions workflows to execute tests and ingest coverage + pass/fail results back into the system.

## Overview

The Test Engine integration allows ReadyLayer to:
1. **Generate tests** - AI-generated test files
2. **Request CI execution** - Trigger GitHub Actions workflows via `workflow_dispatch`
3. **Ingest results** - Receive coverage and pass/fail data from workflow artifacts
4. **Attach evidence** - Show test run status and coverage in PR checks

## Setup

### 1. Create GitHub Actions Workflow

Create a workflow file at `.github/workflows/readylayer-tests.yml`:

```yaml
name: ReadyLayer Test Execution

on:
  workflow_dispatch:
    inputs:
      pr_sha:
        description: 'PR commit SHA'
        required: true
      test_files:
        description: 'Comma-separated list of test files to run'
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ inputs.pr_sha }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/coverage-summary.json
          retention-days: 7

      - name: Upload test results artifact
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results.json
          retention-days: 7
```

### 2. Configure GitHub App Permissions

Ensure your GitHub App has the following permissions:
- **Actions**: `write` (to dispatch workflows)
- **Contents**: `read` (to read repository contents)
- **Metadata**: `read` (required)

### 3. Configure Webhook

The webhook endpoint `/api/github/actions/webhook` automatically handles `workflow_run` events. Ensure your GitHub App webhook is configured to send:
- `workflow_run` events (when workflows complete)

## Usage

### Triggering Test Execution

Use the dispatch endpoint to trigger a workflow:

```bash
POST /api/github/actions/dispatch
Content-Type: application/json
Authorization: Bearer <token>

{
  "repositoryId": "repo_123",
  "workflowId": "readylayer-tests.yml",  // or ".github/workflows/readylayer-tests.yml"
  "ref": "abc123def456",  // PR commit SHA
  "inputs": {
    "test_files": "test1.js,test2.js"
  }
}
```

### Response

```json
{
  "data": {
    "testRunId": "testrun_123",
    "repositoryId": "repo_123",
    "workflowId": "readylayer-tests.yml",
    "ref": "abc123def456",
    "status": "dispatched"
  }
}
```

### Webhook Ingestion

When a workflow completes, GitHub sends a `workflow_run` event to `/api/github/actions/webhook`. The system:

1. Validates the webhook signature
2. Finds or creates a `TestRun` record
3. Downloads artifacts (coverage, test results)
4. Updates the `TestRun` with:
   - Status (`completed`, `failed`, `cancelled`)
   - Coverage metrics (from `coverage` artifact)
   - Test summary (from `test-results` artifact)
   - Artifact download URLs

### Viewing Test Run Status

Test run status appears in:
- PR Integration component (`/components/git-provider/test-run-status.tsx`)
- API endpoint: `GET /api/v1/test-runs?repositoryId=X&prSha=Y`

## Artifact Format

### Coverage Artifact

Upload a JSON file with coverage metrics:

```json
{
  "total": {
    "lines": { "total": 1000, "covered": 850, "pct": 85.0 },
    "statements": { "total": 1200, "covered": 1000, "pct": 83.3 },
    "functions": { "total": 200, "covered": 180, "pct": 90.0 },
    "branches": { "total": 500, "covered": 400, "pct": 80.0 }
  }
}
```

Or simplified format:

```json
{
  "total": 85.0,
  "lines": 85.0,
  "functions": 90.0,
  "branches": 80.0
}
```

### Test Results Artifact

Upload a JSON file with test summary:

```json
{
  "total": 150,
  "passed": 145,
  "failed": 5,
  "skipped": 0
}
```

## Error Handling

### Workflow Not Found (404)

If the workflow file doesn't exist:

```json
{
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow not found. Ensure the workflow file exists and is configured correctly.",
    "context": {
      "workflowId": ".github/workflows/readylayer-tests.yml",
      "fix": "Create a workflow file at .github/workflows/readylayer-tests.yml or update workflowId parameter",
      "setupInstructions": [...]
    }
  }
}
```

### Permission Denied (403)

If the GitHub App lacks permissions:

```json
{
  "error": {
    "code": "WORKFLOW_PERMISSION_DENIED",
    "message": "Insufficient permissions to dispatch workflow.",
    "context": {
      "fix": "Update GitHub App permissions to include actions:write"
    }
  }
}
```

## Multi-Tenant Isolation

All operations are scoped to:
- **Repository** - Only repositories the user has access to
- **Organization** - Only organizations the user belongs to
- **Installation** - Only GitHub installations for the user's organizations

The system never allows:
- Cross-organization workflow dispatch
- Cross-repository artifact access
- Unauthorized test run viewing

## Security

- All webhook requests are validated with HMAC signatures
- Installation tokens are encrypted at rest
- Repository access is verified before dispatch
- Artifact downloads require valid installation tokens

## Limitations

- Currently supports GitHub Actions only
- Artifact parsing is basic (JSON format expected)
- Coverage extraction from ZIP artifacts requires frontend handling
- Workflow must be configured manually (no auto-setup)

## Future Enhancements

- Auto-generate workflow files
- Support for GitLab CI, CircleCI, etc.
- Automatic artifact parsing (ZIP extraction)
- Test result annotations in PR
- Coverage trend tracking
