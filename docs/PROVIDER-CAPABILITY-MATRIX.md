# Git Provider Capability Matrix

This document outlines the capabilities, constraints, and implementation details for each git provider supported by ReadyLayer.

## Overview

ReadyLayer integrates with GitHub, GitLab, and Bitbucket to provide native PR/MR presence through status checks, comments, and deep links. Each provider has different APIs, webhook formats, and constraints.

---

## GitHub

### Inbound Capabilities

#### PR/MR Metadata
- **API:** `GET /repos/{owner}/{repo}/pulls/{pr_number}`
- **Available:** PR number, title, body, state, labels, assignees, reviewers, base/head branches, SHA
- **Rate Limit:** 5,000 requests/hour (authenticated)
- **Constraints:** Fork PRs require special handling (use `pull_request.head.repo.full_name`)

#### Reviews/Approvals
- **API:** `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews`
- **Available:** Review state (APPROVED, CHANGES_REQUESTED, COMMENTED), reviewer, comments
- **Rate Limit:** Same as PR metadata
- **Constraints:** Reviews only available after PR is opened

#### Status Checks
- **API:** `GET /repos/{owner}/{repo}/commits/{sha}/status`
- **Available:** Status state (success, failure, pending, error), context, description, target_url
- **Rate Limit:** Same as PR metadata
- **Constraints:** Status checks are commit-scoped, not PR-scoped

#### Check Runs
- **API:** `GET /repos/{owner}/{repo}/commits/{sha}/check-runs`
- **Available:** Check run name, status, conclusion, annotations (up to 50), output summary
- **Rate Limit:** Same as PR metadata
- **Constraints:** 
  - Maximum 50 annotations per check run
  - Annotations require file path and line numbers
  - Check runs are commit-scoped, not PR-scoped

#### Pipelines/Jobs
- **API:** `GET /repos/{owner}/{repo}/actions/runs`
- **Available:** Workflow run status, conclusion, jobs, artifacts
- **Rate Limit:** Same as PR metadata
- **Constraints:** Only available for GitHub Actions workflows

#### Security Alerts
- **API:** `GET /repos/{owner}/{repo}/vulnerability-alerts` (GraphQL)
- **Available:** Dependabot alerts, security advisories
- **Rate Limit:** 5,000 points/hour (GraphQL)
- **Constraints:** Requires `security_events` permission

#### Comments
- **API:** `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`
- **Available:** Comment body, author, created_at, updated_at
- **Rate Limit:** Same as PR metadata
- **Constraints:** PR comments are issue comments (PR number = issue number)

### Outbound Capabilities

#### Status Checks
- **API:** `POST /repos/{owner}/{repo}/statuses/{sha}`
- **Can Post:** State (success, failure, pending, error), description, context, target_url
- **Rate Limit:** Same as inbound
- **Constraints:** 
  - One status per context per commit
  - Can be required by branch protection rules
  - Description max 140 characters (truncated in UI)

#### Check Runs
- **API:** `POST /repos/{owner}/{repo}/check-runs` (create), `PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}` (update)
- **Can Post:** Name, status, conclusion, output (title, summary, text, annotations), details_url, external_id
- **Rate Limit:** Same as inbound
- **Constraints:**
  - Maximum 50 annotations per check run
  - Annotations require file path and line numbers
  - Can be required by branch protection rules
  - Idempotent by name + SHA (can update existing check run)

#### PR Comments
- **API:** `POST /repos/{owner}/{repo}/issues/{pr_number}/comments`
- **Can Post:** Comment body (markdown), can include file/line references
- **Rate Limit:** Same as inbound
- **Constraints:** PR comments are issue comments

#### Review Comments (Inline)
- **API:** `POST /repos/{owner}/{repo}/pulls/{pr_number}/comments`
- **Can Post:** Comment body, path, line, side (LEFT/RIGHT), start_line, start_side
- **Rate Limit:** Same as inbound
- **Constraints:** Requires diff context (path, line, side)

### Permissions/Scopes

#### Required Permissions
- `contents:read` - Read repository contents
- `pull_requests:read` - Read PR metadata
- `pull_requests:write` - Post PR comments
- `checks:write` - Create/update check runs and status checks
- `metadata:read` - Always granted

#### Optional Permissions
- `security_events:read` - Read security alerts
- `actions:read` - Read workflow runs

### Webhook Payload Availability

#### Pull Request Events
- `pull_request.opened` - PR opened
- `pull_request.synchronize` - New commits pushed
- `pull_request.closed` - PR closed/merged
- `pull_request.reopened` - PR reopened
- **Payload includes:** PR metadata, repository, sender, installation

#### Check Run Events
- `check_run.created` - Check run created
- `check_run.completed` - Check run completed
- **Payload includes:** Check run details, repository, sender

#### Status Events
- `status` - Commit status updated
- **Payload includes:** Status state, context, description, repository, commit SHA

### Rate Limits

- **Authenticated:** 5,000 requests/hour
- **Secondary Rate Limit:** 1,000 requests/hour for certain endpoints
- **GraphQL:** 5,000 points/hour
- **Strategy:** Exponential backoff, retry-after header, request queuing

### Fork Behaviors

- **Fork PRs:** Use `pull_request.head.repo.full_name` for API calls
- **Permissions:** Fork PRs may have limited permissions
- **Webhooks:** Fork PRs trigger webhooks on base repository

### Deep Link Format

- **PR:** `https://github.com/{owner}/{repo}/pull/{pr_number}`
- **Check Run:** `https://github.com/{owner}/{repo}/runs/{check_run_id}`
- **Commit:** `https://github.com/{owner}/{repo}/commit/{sha}`

---

## GitLab

### Inbound Capabilities

#### MR Metadata
- **API:** `GET /projects/{project_id}/merge_requests/{mr_iid}`
- **Available:** MR IID, title, description, state, labels, assignees, reviewers, source/target branches, SHA
- **Rate Limit:** 2,000 requests/hour (GitLab.com)
- **Constraints:** Project ID is URL-encoded (e.g., `namespace%2Fproject`)

#### Reviews/Approvals
- **API:** `GET /projects/{project_id}/merge_requests/{mr_iid}/approvals`
- **Available:** Approval state, approvers, required approvals
- **Rate Limit:** Same as MR metadata
- **Constraints:** Approvals only available if enabled in project settings

#### Pipeline Status
- **API:** `GET /projects/{project_id}/pipelines`
- **Available:** Pipeline status (running, success, failed, canceled, skipped), jobs, artifacts
- **Rate Limit:** Same as MR metadata
- **Constraints:** Pipelines are commit-scoped, not MR-scoped

#### Commit Status
- **API:** `GET /projects/{project_id}/repository/commits/{sha}/statuses`
- **Available:** Status state (success, failed, pending, canceled), name, description, target_url
- **Rate Limit:** Same as MR metadata
- **Constraints:** Status checks are commit-scoped, not MR-scoped

#### Jobs
- **API:** `GET /projects/{project_id}/pipelines/{pipeline_id}/jobs`
- **Available:** Job status, artifacts, logs
- **Rate Limit:** Same as MR metadata
- **Constraints:** Jobs are pipeline-scoped

#### Security Alerts
- **API:** `GET /projects/{project_id}/vulnerability_report` (requires Ultimate license)
- **Available:** Security vulnerabilities, dependency scanning results
- **Rate Limit:** Same as MR metadata
- **Constraints:** Requires Ultimate license for full features

#### Comments
- **API:** `GET /projects/{project_id}/merge_requests/{mr_iid}/notes`
- **Available:** Comment body, author, created_at, updated_at, position (for inline comments)
- **Rate Limit:** Same as MR metadata
- **Constraints:** Comments can be inline (position-based) or general

### Outbound Capabilities

#### Commit Status
- **API:** `POST /projects/{project_id}/statuses/{sha}`
- **Can Post:** State (success, failed, pending, canceled), name, description, target_url
- **Rate Limit:** Same as inbound
- **Constraints:**
  - One status per name per commit
  - Can be required by merge request approval rules
  - Description max 255 characters

#### MR Comments
- **API:** `POST /projects/{project_id}/merge_requests/{mr_iid}/notes`
- **Can Post:** Comment body (markdown), position (for inline comments)
- **Rate Limit:** Same as inbound
- **Constraints:** Inline comments require position (base_sha, start_sha, head_sha, old_path, new_path, new_line)

### Permissions/Scopes

#### Required Scopes
- `api` - Full API access (or `read_repository` + `write_repository`)
- `read_repository` - Read repository contents
- `write_repository` - Write comments, status

#### Optional Scopes
- `read_api` - Read-only API access
- `read_user` - Read user information

### Webhook Payload Availability

#### Merge Request Events
- `merge_request` with `object_attributes.action` = `open`, `update`, `close`, `merge`
- **Payload includes:** MR metadata, project, user, changes

#### Pipeline Events
- `pipeline` with `object_attributes.status` = `running`, `success`, `failed`, `canceled`
- **Payload includes:** Pipeline details, project, commit

#### Note Events
- `note` with `object_attributes.noteable_type` = `MergeRequest`
- **Payload includes:** Comment body, MR metadata, project

### Rate Limits

- **GitLab.com:** 2,000 requests/hour (authenticated)
- **Self-hosted:** Configurable (default: 2,000 requests/hour)
- **Strategy:** Exponential backoff, retry-after header, request queuing

### Fork Behaviors

- **Fork MRs:** Use `merge_request.source_project_id` for API calls
- **Permissions:** Fork MRs may have limited permissions
- **Webhooks:** Fork MRs trigger webhooks on target project

### Deep Link Format

- **MR:** `https://gitlab.com/{namespace}/{project}/-/merge_requests/{mr_iid}`
- **Pipeline:** `https://gitlab.com/{namespace}/{project}/-/pipelines/{pipeline_id}`
- **Commit:** `https://gitlab.com/{namespace}/{project}/-/commit/{sha}`

---

## Bitbucket

### Inbound Capabilities

#### PR Metadata
- **API:** `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}`
- **Available:** PR ID, title, description, state, reviewers, source/destination branches, commit SHA
- **Rate Limit:** 1,000 requests/hour (Bitbucket Cloud)
- **Constraints:** Workspace and repo slug are separate path parameters

#### Reviews/Approvals
- **API:** `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/approvals`
- **Available:** Approval state, approver, created_at
- **Rate Limit:** Same as PR metadata
- **Constraints:** Approvals only available if enabled in repository settings

#### Build Status
- **API:** `GET /2.0/repositories/{workspace}/{repo_slug}/commit/{sha}/statuses/build`
- **Available:** Status state (SUCCESSFUL, FAILED, INPROGRESS, STOPPED), key, name, description, url
- **Rate Limit:** Same as PR metadata
- **Constraints:** Build statuses are commit-scoped, not PR-scoped

#### Pipelines
- **API:** `GET /2.0/repositories/{workspace}/{repo_slug}/pipelines/`
- **Available:** Pipeline state, build number, commit hash, steps, artifacts
- **Rate Limit:** Same as PR metadata
- **Constraints:** Pipelines are commit-scoped, not PR-scoped

#### Security Alerts
- **API:** Not available via REST API (requires Bitbucket Security features)
- **Available:** Limited security scanning via Pipelines
- **Rate Limit:** N/A
- **Constraints:** Security features are limited compared to GitHub/GitLab

#### Comments
- **API:** `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments`
- **Available:** Comment content (raw, html, markup), author, created_at, updated_at, inline (for inline comments)
- **Rate Limit:** Same as PR metadata
- **Constraints:** Comments can be inline (requires file path and line number)

### Outbound Capabilities

#### Build Status
- **API:** `POST /2.0/repositories/{workspace}/{repo_slug}/commit/{sha}/statuses/build`
- **Can Post:** State (SUCCESSFUL, FAILED, INPROGRESS, STOPPED), key, name, description, url
- **Rate Limit:** Same as inbound
- **Constraints:**
  - One status per key per commit
  - Can be required by branch restrictions
  - Description max 1,000 characters

#### PR Comments
- **API:** `POST /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments`
- **Can Post:** Comment content (raw, html, markup), inline (for inline comments)
- **Rate Limit:** Same as inbound
- **Constraints:** Inline comments require file path and line number

### Permissions/Scopes

#### Required Scopes
- `repository` - Read/write repository
- `pullrequest` - Read/write pull requests

#### Optional Scopes
- `repository:read` - Read-only repository access
- `pullrequest:write` - Write pull requests

### Webhook Payload Availability

#### Pull Request Events
- `pullrequest:created` - PR created
- `pullrequest:updated` - PR updated (new commits)
- `pullrequest:fulfilled` - PR merged
- `pullrequest:rejected` - PR closed without merge
- **Payload includes:** PR metadata, repository, actor

#### Build Status Events
- `build:status` - Build status changed
- **Payload includes:** Build status details, repository, commit

### Rate Limits

- **Bitbucket Cloud:** 1,000 requests/hour (authenticated)
- **Self-hosted:** Configurable (default: 1,000 requests/hour)
- **Strategy:** Exponential backoff, retry-after header, request queuing

### Fork Behaviors

- **Fork PRs:** Use `pullrequest.source.repository.full_name` for API calls
- **Permissions:** Fork PRs may have limited permissions
- **Webhooks:** Fork PRs trigger webhooks on destination repository

### Deep Link Format

- **PR:** `https://bitbucket.org/{workspace}/{repo_slug}/pull-requests/{pr_id}`
- **Pipeline:** `https://bitbucket.org/{workspace}/{repo_slug}/addon/pipelines/home#!/results/{pipeline_uuid}`
- **Commit:** `https://bitbucket.org/{workspace}/{repo_slug}/commits/{sha}`

---

## Comparison Matrix

| Capability | GitHub | GitLab | Bitbucket |
|------------|--------|--------|-----------|
| **Status Checks** | ✅ Status + Check Runs | ✅ Commit Status | ✅ Build Status |
| **Inline Comments** | ✅ Review Comments | ✅ Position-based | ✅ Inline Comments |
| **Annotations** | ✅ Up to 50 per check run | ❌ | ❌ |
| **Required Checks** | ✅ Branch Protection | ✅ Approval Rules | ✅ Branch Restrictions |
| **Pipeline Integration** | ✅ GitHub Actions | ✅ GitLab CI | ✅ Bitbucket Pipelines |
| **Security Alerts** | ✅ Dependabot | ✅ (Ultimate) | ⚠️ Limited |
| **Rate Limit** | 5,000/hour | 2,000/hour | 1,000/hour |
| **Webhook Validation** | HMAC-SHA256 | Token-based | HMAC-SHA256 |
| **Deep Links** | ✅ | ✅ | ✅ |
| **Fork Support** | ✅ | ✅ | ✅ |

---

## Implementation Notes

### Idempotency

All status/check updates are idempotent:
- **GitHub:** Check runs are idempotent by name + SHA (can update existing)
- **GitLab:** Commit statuses are idempotent by name + SHA
- **Bitbucket:** Build statuses are idempotent by key + SHA

### Rerun Behavior

When rerunning a ReadyLayer run:
- **GitHub:** Update existing check run (don't create duplicate)
- **GitLab:** Update existing commit status (don't create duplicate)
- **Bitbucket:** Update existing build status (don't create duplicate)

### Deep Link Strategy

All providers support deep links to ReadyLayer run detail pages:
- **GitHub:** `details_url` in check run
- **GitLab:** `target_url` in commit status
- **Bitbucket:** `url` in build status

### Error Handling

All providers handle errors gracefully:
- **Rate Limits:** Exponential backoff, retry-after header
- **Transient Errors:** Retry up to 3 times
- **Permanent Errors:** Log error, don't block PR/MR

---

## Verification Checklist

For each provider, verify:
- [ ] Status/check updates appear in PR/MR UI
- [ ] Deep links work and navigate to ReadyLayer run page
- [ ] Reruns don't create duplicate status/checks
- [ ] Required checks can block merge (if configured)
- [ ] Inline comments appear at correct file/line
- [ ] Webhook validation works correctly
- [ ] Rate limiting is respected
- [ ] Fork PRs/MRs are handled correctly
