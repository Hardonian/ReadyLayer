# GitLab CI Integration Guide

Integrate ReadyLayer into your GitLab CI/CD pipeline to automatically review every merge request.

## Prerequisites

- A ReadyLayer account ([sign up free](https://ready-layer.com/auth/signin))
- A GitLab project with CI/CD enabled
- GitLab API token with `api` scope

## Quick Start (2 minutes)

### 1. Add CI/CD Variable

1. Go to your project → Settings → CI/CD → Variables
2. Click "Add variable"
3. Name: `READYLAYER_API_KEY`
4. Value: Your ReadyLayer API key (from [Settings](https://ready-layer.com/dashboard/settings) → API Keys)
5. Protected: ✓ (if desired)

### 2. Create `.gitlab-ci.yml`

```yaml
stages:
  - review

readylayer:
  stage: review
  image: ubuntu:latest
  
  script:
    - |
      curl -X POST https://api.ready-layer.com/v1/reviews \
        -H "Authorization: Bearer $READYLAYER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"repositoryId\": \"gitlab_$CI_PROJECT_ID\",
          \"prNumber\": $CI_MERGE_REQUEST_IID,
          \"prSha\": \"$CI_COMMIT_SHA\",
          \"files\": []
        }"
  
  only:
    - merge_requests
  
  allow_failure: false
```

### 3. Done!

Push a merge request. ReadyLayer will automatically review your code.

## Advanced Configuration

### Using the Official Docker Image

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN
    MR_IID: $CI_MERGE_REQUEST_IID
  
  script:
    - readylayer review
  
  only:
    - merge_requests
```

### Policy Configuration

Create `readylayer.yml` in your project root:

```yaml
version: 1.0

policies:
  - id: security.sql-injection
    enabled: true
  - id: quality.unused-variables
    enabled: true
  - id: license.gpl-detection
    enabled: true

severity:
  critical: block
  high: block
  medium: warn
  low: info

exclude-paths:
  - "**/*.test.ts"
  - "**/vendor/**"
  - "docs/**"
```

### Conditional Blocking

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  script:
    - readylayer review
    - |
      if [ "$READYLAYER_BLOCKED" = "true" ]; then
        echo "MR blocked due to critical issues"
        exit 1
      fi
  
  only:
    - merge_requests
  
  allow_failure: false
```

### Multiple Stages

```yaml
stages:
  - lint
  - review
  - build
  - test

lint:
  stage: lint
  script:
    - npm run lint

readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  script:
    - readylayer review

build:
  stage: build
  script:
    - npm run build

test:
  stage: test
  script:
    - npm test
```

### Branch-Specific Policies

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  script:
    - |
      if [ "$CI_COMMIT_BRANCH" = "main" ]; then
        readylayer review --policy-file readylayer.main.yml
      elif [ "$CI_COMMIT_BRANCH" = "develop" ]; then
        readylayer review --policy-file readylayer.develop.yml
      else
        readylayer review
      fi
  
  only:
    - merge_requests
```

## Available Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CI_PROJECT_ID` | Integer | GitLab project ID |
| `CI_MERGE_REQUEST_IID` | Integer | MR number |
| `CI_COMMIT_SHA` | String | Commit SHA |
| `CI_COMMIT_BRANCH` | String | Branch name |
| `CI_MERGE_REQUEST_SOURCE_BRANCH` | String | Source branch |
| `CI_JOB_TOKEN` | String | Job authentication token |

## Environment Configuration

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  variables:
    READYLAYER_ENDPOINT: "https://api.ready-layer.com"
    READYLAYER_TIMEOUT: "60"
    READYLAYER_FAIL_ON_CRITICAL: "true"
    READYLAYER_FAIL_ON_HIGH: "false"
  
  script:
    - readylayer review
  
  only:
    - merge_requests
```

## Integration with Other Stages

```yaml
stages:
  - review
  - build
  - test
  - deploy

readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  script:
    - readylayer review
  only:
    - merge_requests

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
  only:
    - merge_requests

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test
  only:
    - merge_requests

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deploying..."
  only:
    - main
```

## Comments on MR

ReadyLayer automatically comments on MRs with:
- Summary of findings
- Link to detailed review
- Actionable remediation steps

Example comment:
```
🔍 ReadyLayer Review

Found 3 issues:
- 1 Critical
- 2 High

Review: https://ready-layer.com/reviews/review_123

Critical Issues:
- SQL injection in query builder (line 45)

View full report →
```

## Artifacts

Collect ReadyLayer reports as artifacts:

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  script:
    - readylayer review --output-file readylayer-report.json
  
  artifacts:
    reports:
      custom:
        readylayer-report.json
  
  only:
    - merge_requests
```

## Status Checks

ReadyLayer sets commit status automatically:

- ✅ **Success**: No blocking issues
- ⚠️ **Pending**: Review in progress
- ❌ **Failed**: Critical issues found

## Troubleshooting

### "Permission denied"

- Check `READYLAYER_API_KEY` is set in CI/CD Variables
- Ensure key hasn't expired in ReadyLayer Settings
- Verify project → Settings → CI/CD shows the variable

### "GitLab token invalid"

- Use `$CI_JOB_TOKEN` instead of personal tokens
- Ensure project → Settings → CI/CD → Token access is enabled

### "MR details not found"

- Ensure script runs `only: merge_requests`
- Check `CI_MERGE_REQUEST_IID` is available
- Verify MR is in open state

### "Review taking too long"

- Large files take longer to analyze (normal)
- Check ReadyLayer dashboard for processing status
- Try reducing `READYLAYER_TIMEOUT` if experiencing timeouts

## Examples

### Minimal Setup

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  script:
    - readylayer review
  only:
    - merge_requests
```

### Enterprise Setup

```yaml
readylayer:
  stage: review
  image: readylayer/gitlab-ci:latest
  
  variables:
    READYLAYER_FAIL_ON_CRITICAL: "true"
    READYLAYER_FAIL_ON_HIGH: "true"
  
  script:
    - readylayer review --policy-file readylayer.enterprise.yml
  
  retry:
    max: 2
    when: api_failure
  
  timeout: 5 minutes
  
  only:
    - merge_requests
    - branches:
        - main
        - develop
```

### Monorepo with Services

```yaml
stages:
  - review

review-services:
  stage: review
  image: readylayer/gitlab-ci:latest
  script:
    - readylayer review --path services/
  only:
    - merge_requests
    - changes:
        - services/**

review-shared:
  stage: review
  image: readylayer/gitlab-ci:latest
  script:
    - readylayer review --path shared/
  only:
    - merge_requests
    - changes:
        - shared/**
```

## Support

- [Documentation](https://ready-layer.com/docs)
- [GitLab Issues](https://gitlab.com/readylayer/gitlab-ci)
- [Email Support](mailto:support@ready-layer.com)
