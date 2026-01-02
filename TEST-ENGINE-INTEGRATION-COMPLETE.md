# Test Engine GitHub Actions Integration - Implementation Complete

## Overview

Implemented a safe MVP path for ReadyLayer Test Engine to:
1. ✅ Generate tests
2. ✅ Request CI execution (via GitHub Actions `workflow_dispatch`)
3. ✅ Ingest results (coverage + pass/fail) back into DB
4. ✅ Attach evidence to PR check

## Implementation Summary

### 1. Database Schema ✅

**Added `TestRun` model** (`prisma/schema.prisma`):
- Tracks CI/CD test execution runs
- Stores workflow run ID, status, conclusion
- Stores coverage metrics (JSON)
- Stores test summary (total, passed, failed, skipped)
- Links to repository with tenant isolation

**Migration**: `supabase/migrations/00000000000005_test_run.sql`

### 2. API Endpoints ✅

#### `/api/github/actions/dispatch` (POST)
- **Purpose**: Trigger GitHub Actions workflow
- **Auth**: Requires write scope + repository access
- **Features**:
  - Validates repository access (tenant isolation)
  - Checks GitHub installation exists
  - Dispatches workflow via GitHub API
  - Creates TestRun record
  - Graceful error handling (404 for missing workflow, 403 for permissions)
  - Helpful error messages with setup instructions

#### `/api/github/actions/webhook` (POST)
- **Purpose**: Ingest workflow completion events
- **Auth**: Webhook signature validation (HMAC)
- **Features**:
  - Validates webhook signature
  - Handles `workflow_run` events
  - Finds/creates TestRun records
  - Downloads artifacts (coverage, test results)
  - Updates TestRun with status, conclusion, coverage, summary
  - Multi-tenant isolation (repository scoping)

#### `/api/v1/test-runs` (GET)
- **Purpose**: List test runs for a repository/PR
- **Auth**: Requires read scope + repository access
- **Features**:
  - Tenant isolation (only user's repositories)
  - Filter by repositoryId, prNumber, prSha
  - Pagination support

### 3. GitHub API Client Extensions ✅

**Added methods** (`integrations/github/api-client.ts`):
- `dispatchWorkflow()` - Trigger workflow_dispatch
- `getWorkflowRun()` - Get workflow run details
- `listWorkflowRuns()` - List workflow runs
- `listWorkflowRunArtifacts()` - List artifacts
- `downloadArtifact()` - Download artifact ZIP

### 4. Webhook Handler Updates ✅

**Updated** (`integrations/github/webhook.ts`):
- Added `workflow_run` event support
- Normalizes workflow_run events to `ci.completed` type

### 5. UI Components ✅

#### `TestRunStatus` Component (`components/git-provider/test-run-status.tsx`)
- Shows test execution status
- Displays coverage metrics (with progress bar)
- Shows test summary (total, passed, failed)
- Links to workflow run and artifacts
- Provider-adaptive styling

#### Updated `PRIntegration` Component
- Now shows both Policy Status and Test Run Status
- Fetches test run data automatically
- Graceful handling when no test runs exist

### 6. Multi-Tenant Isolation ✅

All endpoints enforce:
- ✅ Repository access checks (user must belong to org)
- ✅ Organization-scoped installations
- ✅ No cross-organization access
- ✅ Installation token scoping

### 7. Error Handling ✅

**Graceful Degradation**:
- ✅ Workflow not found → 404 with setup instructions
- ✅ Permission denied → 403 with fix instructions
- ✅ Installation not found → 404 with GitHub App install link
- ✅ Missing artifacts → Continues without artifacts (not fatal)
- ✅ Repository not found in webhook → Returns success (avoids retries)

## MVP Path Chosen

**Selected**: `workflow_dispatch` + artifacts upload

**Rationale**:
- ✅ Simpler to implement
- ✅ More reliable than comment commands
- ✅ Better fits GitHub Actions ecosystem
- ✅ Can be triggered programmatically
- ✅ Standard GitHub pattern

## Setup Requirements

### GitHub App Permissions
- `actions:write` - Dispatch workflows
- `contents:read` - Read repository contents
- `metadata:read` - Required

### Webhook Events
- `workflow_run` - When workflows complete

### Workflow File
Users must create `.github/workflows/readylayer-tests.yml` with:
- `workflow_dispatch` trigger
- Test execution steps
- Artifact uploads (coverage, test-results)

## Testing Checklist

### Manual Testing
- [ ] Dispatch workflow endpoint (with valid repo)
- [ ] Dispatch workflow endpoint (with missing workflow) → 404
- [ ] Dispatch workflow endpoint (with missing installation) → 404
- [ ] Webhook ingestion (workflow_run completed)
- [ ] Webhook ingestion (invalid signature) → 401
- [ ] Test runs API (list by repository)
- [ ] Test runs API (list by PR)
- [ ] Test runs API (unauthorized access) → 403
- [ ] PR integration component (with test run)
- [ ] PR integration component (without test run)

### Contract Testing
- [ ] Mock GitHub API responses
- [ ] Test workflow dispatch success
- [ ] Test workflow dispatch 404
- [ ] Test workflow dispatch 403
- [ ] Test webhook signature validation
- [ ] Test artifact parsing

## Files Created/Modified

### Created
- `app/api/github/actions/dispatch/route.ts`
- `app/api/github/actions/webhook/route.ts`
- `app/api/v1/test-runs/route.ts`
- `components/git-provider/test-run-status.tsx`
- `supabase/migrations/00000000000005_test_run.sql`
- `docs/test-engine-github-actions.md`

### Modified
- `prisma/schema.prisma` - Added TestRun model
- `integrations/github/api-client.ts` - Added workflow methods
- `integrations/github/webhook.ts` - Added workflow_run support
- `components/git-provider/pr-integration.tsx` - Added TestRunStatus

## Next Steps

1. **Run Migration**: Execute `00000000000005_test_run.sql`
2. **Test Endpoints**: Use Postman/curl to test dispatch and webhook
3. **Create Example Workflow**: Add `.github/workflows/readylayer-tests.yml` to a test repo
4. **Configure Webhook**: Ensure GitHub App sends `workflow_run` events
5. **Test Full Flow**: Generate tests → Dispatch → Wait for completion → Verify ingestion

## Known Limitations

1. **Artifact Parsing**: Currently stores artifact URLs; full ZIP parsing requires frontend
2. **Workflow Setup**: Users must manually create workflow files
3. **GitHub Only**: Currently supports GitHub Actions only
4. **Coverage Format**: Expects specific JSON format in artifacts

## Future Enhancements

- Auto-generate workflow files
- Support GitLab CI, CircleCI, etc.
- Automatic ZIP artifact extraction
- Test result annotations in PR
- Coverage trend tracking
- Test run comparison (before/after)
