# ReadyLayer — CI/CD Integrations (GitHub Actions, GitLab CI)

## Overview

ReadyLayer integrates with CI/CD pipelines to enforce quality gates, run tests, and update status checks. CI integrations ensure that ReadyLayer checks run automatically as part of the build process.

---

## GitHub Actions Integration

### Core Use Cases

#### 1. PR Review in CI
**Use Case:** Run ReadyLayer review as part of CI pipeline

**Flow:**
1. PR opened or updated
2. GitHub Actions workflow triggered
3. ReadyLayer review action runs
4. Review results posted as PR comments
5. CI status check updated (pass/fail)

**Value:** Automated code review in CI, block PRs on critical issues

---

#### 2. Test Coverage Enforcement
**Use Case:** Enforce test coverage thresholds in CI

**Flow:**
1. CI runs tests
2. ReadyLayer action calculates coverage
3. ReadyLayer compares to threshold
4. If below threshold, CI fails
5. PR blocked from merge

**Value:** Enforce coverage standards automatically

---

#### 3. Test Generation in CI
**Use Case:** Generate tests for AI-touched files in CI

**Flow:**
1. CI detects AI-touched files
2. ReadyLayer action generates tests
3. Tests committed to PR (or posted as comment)
4. CI re-runs with new tests

**Value:** Automatically generate tests in CI

---

### Installation

#### Add GitHub Action to Workflow
```yaml
name: ReadyLayer Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          repo-id: ${{ github.repository }}
          fail-on-critical: true
```

#### Configure Secrets
1. Go to repo Settings → Secrets → Actions
2. Add secret: `READYLAYER_API_KEY`
3. Get API key from ReadyLayer dashboard

### Configuration

#### Action Inputs
- **`api-key`:** ReadyLayer API key (required)
- **`repo-id`:** Repository ID (default: `github.repository`)
- **`fail-on-critical`:** Fail CI on critical issues (default: `false`)
- **`fail-on-high`:** Fail CI on high issues (default: `false`)
- **`coverage-threshold`:** Coverage threshold (default: `80`)
- **`generate-tests`:** Generate tests for AI-touched files (default: `false`)

#### Action Outputs
- **`issues-found`:** Number of issues found
- **`coverage`:** Test coverage percentage
- **`review-id`:** ReadyLayer review ID

### Example Workflows

#### Workflow 1: Review Only
```yaml
name: ReadyLayer Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          fail-on-high: false
```

#### Workflow 2: Review + Coverage
```yaml
name: ReadyLayer Review and Coverage

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests
        run: npm test -- --coverage
      
      - name: ReadyLayer Review
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          coverage-threshold: 80
          coverage-report: coverage/lcov.info
```

#### Workflow 3: Review + Test Generation
```yaml
name: ReadyLayer Review and Test Generation

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ReadyLayer Review and Generate Tests
        uses: readylayer/action-review@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          generate-tests: true
          test-framework: jest
      
      - name: Run Generated Tests
        run: npm test
```

### Status Checks

#### Update Status Check
```typescript
POST /repos/{owner}/{repo}/statuses/{sha}
Body: {
  "state": "success", // success, failure, pending, error
  "target_url": "https://readylayer.com/reviews/{review_id}",
  "description": "Review completed, 3 issues found",
  "context": "readylayer/review"
}
```

#### Status Check States
- **Success:** No critical issues, coverage above threshold
- **Failure:** Critical issues found, or coverage below threshold
- **Pending:** Review in progress
- **Error:** Review failed (network error, etc.)

### Failure Modes

#### Review Fails
- **Action:** Log error, set status to "error", don't fail CI (unless configured)
- **User:** See error in CI logs, check ReadyLayer dashboard

#### Coverage Below Threshold
- **Action:** Set status to "failure", fail CI
- **User:** Fix coverage or adjust threshold

#### Critical Issues Found
- **Action:** Set status to "failure", fail CI (if `fail-on-critical: true`)
- **User:** Fix issues or adjust severity

---

## GitLab CI Integration

### Core Use Cases

#### 1. PR Review in CI
**Use Case:** Run ReadyLayer review as part of GitLab CI pipeline

**Flow:**
1. Merge request opened or updated
2. GitLab CI pipeline triggered
3. ReadyLayer review job runs
4. Review results posted as MR comments
5. Pipeline status updated (pass/fail)

**Value:** Automated code review in CI, block MRs on critical issues

---

#### 2. Test Coverage Enforcement
**Use Case:** Enforce test coverage thresholds in CI

**Flow:**
1. CI runs tests
2. ReadyLayer job calculates coverage
3. ReadyLayer compares to threshold
4. If below threshold, pipeline fails
5. MR blocked from merge

**Value:** Enforce coverage standards automatically

---

### Installation

#### Add GitLab CI Job
```yaml
readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
  only:
    - merge_requests
  variables:
    READYLAYER_API_KEY: $READYLAYER_API_KEY
```

#### Configure Variables
1. Go to repo Settings → CI/CD → Variables
2. Add variable: `READYLAYER_API_KEY`
3. Get API key from ReadyLayer dashboard

### Configuration

#### CLI Options
- **`--api-key`:** ReadyLayer API key (required)
- **`--repo-id`:** Repository ID (default: `$CI_PROJECT_PATH`)
- **`--fail-on-critical`:** Fail pipeline on critical issues
- **`--fail-on-high`:** Fail pipeline on high issues
- **`--coverage-threshold`:** Coverage threshold (default: `80`)
- **`--coverage-report`:** Coverage report file path

### Example Pipelines

#### Pipeline 1: Review Only
```yaml
stages:
  - review

readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical
  only:
    - merge_requests
```

#### Pipeline 2: Review + Coverage
```yaml
stages:
  - test
  - review

test:
  image: node:18
  stage: test
  script:
    - npm install
    - npm test -- --coverage

readylayer-review:
  image: node:18
  stage: review
  script:
    - npm install -g @readylayer/cli
    - readylayer review --api-key $READYLAYER_API_KEY --fail-on-critical --coverage-threshold 80 --coverage-report coverage/lcov.info
  only:
    - merge_requests
```

### Pipeline Status

#### Update Pipeline Status
```typescript
POST /projects/{project_id}/statuses/{sha}
Body: {
  "state": "success", // success, failed, pending, canceled
  "ref": "main",
  "name": "readylayer/review",
  "target_url": "https://readylayer.com/reviews/{review_id}",
  "description": "Review completed, 3 issues found"
}
```

#### Pipeline Status States
- **Success:** No critical issues, coverage above threshold
- **Failed:** Critical issues found, or coverage below threshold
- **Pending:** Review in progress
- **Canceled:** Review canceled (manual or timeout)

### Failure Modes

#### Review Fails
- **Action:** Log error, set status to "failed", don't fail pipeline (unless configured)
- **User:** See error in pipeline logs, check ReadyLayer dashboard

#### Coverage Below Threshold
- **Action:** Set status to "failed", fail pipeline
- **User:** Fix coverage or adjust threshold

#### Critical Issues Found
- **Action:** Set status to "failed", fail pipeline (if `--fail-on-critical`)
- **User:** Fix issues or adjust severity

---

## Common Patterns

### Conditional Execution
- **Only on PRs:** Run only on pull requests/merge requests, not on main branch
- **Only on changes:** Run only when specific files change
- **Skip on draft:** Skip review on draft PRs/MRs

### Parallel Execution
- **Review + Tests:** Run review and tests in parallel
- **Multiple reviews:** Run different review types in parallel

### Caching
- **Dependencies:** Cache npm/pip dependencies
- **Results:** Cache review results (TTL 5 minutes)

### Notifications
- **Slack:** Notify on review completion
- **Email:** Email on critical issues
- **Jira:** Create issues for critical findings

---

## CLI Tool

### Installation
```bash
npm install -g @readylayer/cli
```

### Commands

#### Review
```bash
readylayer review [options]
```
- **Options:**
  - `--api-key`: API key (required)
  - `--repo-id`: Repository ID
  - `--fail-on-critical`: Fail on critical issues
  - `--fail-on-high`: Fail on high issues
  - `--output`: Output format (json, text)

#### Coverage
```bash
readylayer coverage [options]
```
- **Options:**
  - `--api-key`: API key (required)
  - `--threshold`: Coverage threshold
  - `--report`: Coverage report file

#### Generate Tests
```bash
readylayer generate-tests [options]
```
- **Options:**
  - `--api-key`: API key (required)
  - `--framework`: Test framework (jest, mocha, pytest, etc.)
  - `--output`: Output directory

---

## Best Practices

1. **Fail fast:** Fail CI on critical issues, don't block on warnings
2. **Cache results:** Cache review results to speed up CI
3. **Parallel execution:** Run review and tests in parallel
4. **Conditional execution:** Only run on PRs, skip on drafts
5. **Error handling:** Handle network errors, API failures gracefully
6. **Monitoring:** Track CI performance, error rates

---

## Security Considerations

### API Key Storage
- **GitHub Actions:** Store in secrets, never in workflow files
- **GitLab CI:** Store in CI/CD variables, mask in logs
- **Rotation:** Rotate API keys regularly (90 days)

### Least Privilege
- **Scopes:** Use API keys with minimum required scopes
- **Repo-level:** Use repo-specific API keys when possible

### Audit Logging
- **All CI runs:** Logged with correlation ID
- **API calls:** Logged with user, repo, timestamp
- **Failures:** Detailed error logs

---

## Monitoring and Observability

### Metrics
- **CI runs:** Number of CI runs per day/week
- **Success rate:** Percentage of successful reviews
- **Latency:** Time to complete review
- **Error rate:** Failed reviews, API errors

### Alerts
- **High error rate:** >5% failed reviews
- **Slow reviews:** >5 minutes to complete
- **API failures:** API errors, rate limits

### Logging
- **All CI runs:** Logged with correlation ID
- **API calls:** Logged with endpoint, status, duration
- **Errors:** Detailed error logs with stack traces
