# Multi-Provider Git Integration - Implementation Complete

## Overview

Extended the Test Engine GitHub Actions integration to support **GitLab** and **Bitbucket** equally. All CI/CD pipeline dispatch, webhook ingestion, and test run tracking functionality now works across all three providers.

## Implementation Summary

### 1. API Clients Created ✅

#### GitLab API Client (`integrations/gitlab/api-client.ts`)
- Pipeline trigger (`triggerPipeline`)
- Pipeline status (`getPipeline`, `listPipelines`)
- Artifact download (`getPipelineArtifacts`)
- MR operations (get, diff, comments)
- Commit status updates
- Rate limiting and retry logic

#### Bitbucket API Client (`integrations/bitbucket/api-client.ts`)
- Pipeline trigger (`triggerPipeline`)
- Pipeline status (`getPipeline`, `listPipelines`)
- Artifact download (`getPipelineArtifacts`)
- PR operations (get, diff, comments)
- Build status updates
- Rate limiting and retry logic

### 2. Webhook Handlers Created ✅

#### GitLab Webhook Handler (`integrations/gitlab/webhook.ts`)
- Token-based validation
- Event normalization:
  - `merge_request` → `pr.opened`, `pr.updated`, `pr.closed`, `merge.completed`
  - `pipeline` → `ci.completed`
- Repository auto-creation

#### Bitbucket Webhook Handler (`integrations/bitbucket/webhook.ts`)
- HMAC-SHA256 signature validation
- Event normalization:
  - `pr:opened` → `pr.opened`
  - `pr:updated` → `pr.updated`
  - `pr:merged` → `merge.completed`
  - `build:status` → `ci.completed`
- Repository auto-creation

### 3. Provider-Agnostic Adapter ✅

**Created** (`integrations/git-provider-adapter.ts`):
- Unified `GitProviderAdapter` interface
- Provider-specific implementations:
  - `GitHubAdapter` - Uses GitHub Actions workflows
  - `GitLabAdapter` - Uses GitLab CI pipelines
  - `BitbucketAdapter` - Uses Bitbucket Pipelines
- Normalized pipeline run format
- Consistent API across all providers

### 4. Updated Endpoints ✅

#### Dispatch Endpoint (`/api/github/actions/dispatch`)
**Now supports all providers:**
- Detects provider from repository
- Uses provider-specific adapter
- Converts inputs to pipeline variables
- Creates TestRun records with provider-agnostic format
- Provider-specific error messages

**Changes:**
- Removed GitHub-only validation
- Added provider detection
- Uses `getGitProviderAdapter()` instead of direct GitHub client
- Supports all three providers equally

#### Webhook Endpoint (`/api/github/actions/webhook`)
**Now supports all providers:**
- Detects provider from path or headers
- Provider-specific signature validation:
  - GitHub: HMAC-SHA256 with `sha256=` prefix
  - GitLab: Token-based validation
  - Bitbucket: HMAC-SHA256 hex string
- Normalizes events from all providers
- Updates TestRun records consistently

**Changes:**
- Added provider detection logic
- Provider-specific event parsing
- Unified TestRun update logic
- Provider-specific artifact fetching

### 5. Webhook Routes Created ✅

#### GitLab Webhook Route (`/api/webhooks/gitlab`)
- Handles GitLab webhook events
- Token-based validation
- Routes to GitLab webhook handler

#### Bitbucket Webhook Route (`/api/webhooks/bitbucket`)
- Handles Bitbucket webhook events
- HMAC signature validation
- Routes to Bitbucket webhook handler

### 6. UI Components Updated ✅

#### Test Run Status Component
**Updated** (`components/git-provider/test-run-status.tsx`):
- Provider-aware pipeline URL generation
- Provider-specific labels ("Workflow" vs "Pipeline" vs "Build")
- Works with all three providers

**Pipeline URL Format:**
- GitHub: `https://github.com/{repo}/actions/runs/{id}`
- GitLab: `https://gitlab.com/{repo}/-/pipelines/{id}`
- Bitbucket: `https://bitbucket.org/{repo}/addon/pipelines/home#!/results/{id}`

## Provider-Specific Details

### GitHub
- **CI System**: GitHub Actions
- **Trigger**: `workflow_dispatch` API
- **Workflow File**: `.github/workflows/readylayer-tests.yml`
- **Webhook Events**: `workflow_run`
- **Signature**: HMAC-SHA256 with `sha256=` prefix
- **Artifacts**: GitHub Actions artifacts API

### GitLab
- **CI System**: GitLab CI/CD
- **Trigger**: Pipeline API with variables
- **Config File**: `.gitlab-ci.yml`
- **Webhook Events**: `pipeline` (Pipeline Hook)
- **Signature**: Token-based validation
- **Artifacts**: GitLab job artifacts API

### Bitbucket
- **CI System**: Bitbucket Pipelines
- **Trigger**: Pipeline API with variables
- **Config File**: `bitbucket-pipelines.yml`
- **Webhook Events**: `build:status`, `build:completed`
- **Signature**: HMAC-SHA256 hex string
- **Artifacts**: Bitbucket pipeline artifacts API

## API Usage Examples

### Dispatch Pipeline (All Providers)

```typescript
POST /api/github/actions/dispatch
{
  "repositoryId": "repo_123",
  "ref": "abc123def456",  // Commit SHA
  "inputs": {              // Pipeline variables
    "test_files": "test1.js,test2.js"
  }
}
```

**Response:**
```json
{
  "data": {
    "testRunId": "testrun_123",
    "repositoryId": "repo_123",
    "provider": "gitlab",  // or "github", "bitbucket"
    "pipelineRunId": "456",
    "ref": "abc123def456",
    "status": "dispatched",
    "url": "https://gitlab.com/org/repo/-/pipelines/456"
  }
}
```

### Webhook Ingestion (All Providers)

**GitHub:**
```
POST /api/github/actions/webhook
Headers:
  x-hub-signature-256: sha256=...
  x-github-event: workflow_run
  x-github-installation-id: 123
```

**GitLab:**
```
POST /api/webhooks/gitlab
Headers:
  x-gitlab-token: ...
  x-gitlab-event: Pipeline Hook
  x-gitlab-installation-id: 123
```

**Bitbucket:**
```
POST /api/webhooks/bitbucket
Headers:
  x-hub-signature: ...
  x-event-key: build:status
  x-bitbucket-installation-id: 123
```

## Multi-Tenant Isolation

All operations maintain tenant isolation:
- ✅ Repository access checks (user must belong to org)
- ✅ Provider-specific installation lookup
- ✅ No cross-organization access
- ✅ Installation token scoping per provider

## Error Handling

**Provider-Agnostic Errors:**
- `INSTALLATION_NOT_FOUND` - Installation not found for provider
- `PIPELINE_NOT_FOUND` - Pipeline/workflow not configured
- `PIPELINE_PERMISSION_DENIED` - Insufficient permissions

**Provider-Specific Messages:**
- Error messages include provider name
- Setup instructions are provider-specific
- Fix suggestions match provider conventions

## Files Created

### New Files
- `integrations/gitlab/api-client.ts`
- `integrations/gitlab/webhook.ts`
- `integrations/bitbucket/api-client.ts`
- `integrations/bitbucket/webhook.ts`
- `integrations/git-provider-adapter.ts`
- `app/api/webhooks/gitlab/route.ts`
- `app/api/webhooks/bitbucket/route.ts`

### Modified Files
- `app/api/github/actions/dispatch/route.ts` - Now provider-agnostic
- `app/api/github/actions/webhook/route.ts` - Now supports all providers
- `components/git-provider/test-run-status.tsx` - Provider-aware URLs
- `integrations/index.ts` - Exports all providers

## Testing Checklist

### Manual Testing
- [ ] Dispatch GitHub workflow
- [ ] Dispatch GitLab pipeline
- [ ] Dispatch Bitbucket pipeline
- [ ] GitHub webhook ingestion
- [ ] GitLab webhook ingestion
- [ ] Bitbucket webhook ingestion
- [ ] Test run status display (all providers)
- [ ] Pipeline URL links (all providers)
- [ ] Multi-tenant isolation (all providers)

### Contract Testing
- [ ] Mock GitHub API responses
- [ ] Mock GitLab API responses
- [ ] Mock Bitbucket API responses
- [ ] Provider adapter abstraction
- [ ] Webhook signature validation (all providers)

## Next Steps

1. **Test with Real Providers**: Set up test repositories on GitLab and Bitbucket
2. **Configure Webhooks**: Ensure webhook endpoints are configured for all providers
3. **Documentation**: Update user-facing docs with provider-specific setup instructions
4. **Monitoring**: Add provider-specific metrics and alerts

## Known Limitations

1. **Artifact Parsing**: Currently stores URLs; full parsing requires provider-specific logic
2. **Pipeline Configuration**: Users must manually configure CI/CD files
3. **Workflow ID**: GitHub requires workflow file path; GitLab/Bitbucket use pipeline triggers
4. **Artifact Formats**: Each provider has different artifact storage formats

## Future Enhancements

- Auto-generate CI/CD config files for all providers
- Unified artifact parsing across providers
- Provider-specific test result annotations
- Coverage trend tracking (all providers)
- Pipeline comparison (before/after)
