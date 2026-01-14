# CI/CD Integration Guide

## Overview

ReadyLayer integrates with GitHub Actions, GitLab CI, and Bitbucket Pipelines to enforce code quality and security in your CI/CD pipeline.

## GitHub Actions

### 1. Install GitHub App

Visit https://github.com/apps/readylayer to install the app in your repositories.

### 2. Basic Workflow

Create `.github/workflows/readylayer.yml`:

```yaml
name: ReadyLayer Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  readylayer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: readylayer/action@v1
        with:
          token: ${{ secrets.READYLAYER_TOKEN }}
          organization: your-org
```

### 3. Advanced Configuration

```yaml
- uses: readylayer/action@v1
  with:
    token: ${{ secrets.READYLAYER_TOKEN }}
    organization: your-org
    enforce-on: pull-request
    fail-on-critical: true
    fail-on-high: false
    require-coverage: 80
    require-tests: true
    slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

## GitLab CI

### 1. Create Project Token

1. Go to Settings → Access Tokens
2. Create token with `api` scope
3. Save as `READYLAYER_TOKEN`

### 2. Add to `.gitlab-ci.yml`:

```yaml
readylayer:
  stage: test
  image: readylayer/cli:latest
  script:
    - readylayer scan
      --token $READYLAYER_TOKEN
      --organization $CI_PROJECT_NAMESPACE
      --merge-request $CI_MERGE_REQUEST_IID
  only:
    - merge_requests
```

## Bitbucket Pipelines

### 1. Store Credentials

Settings → Repository Variables:
- `READYLAYER_TOKEN`
- `READYLAYER_ORG`

### 2. Create `bitbucket-pipelines.yml`:

```yaml
image: atlassian/default-image:latest

pipelines:
  pull-requests:
    '**':
      - step:
          name: ReadyLayer Review
          script:
            - docker pull readylayer/cli
            - docker run -e READYLAYER_TOKEN -e PR_ID
              readylayer/cli scan
```

## Environment Variables

All CI/CD platforms should set:

```bash
READYLAYER_TOKEN=your_api_token        # API token for ReadyLayer
READYLAYER_ORG=your-organization       # Your organization ID
READYLAYER_ENFORCE=pull-request        # When to enforce: pull-request|merge|both
READYLAYER_FAIL_CRITICAL=true          # Fail on critical issues
READYLAYER_FAIL_HIGH=false             # Fail on high issues
READYLAYER_MIN_COVERAGE=80             # Minimum coverage %
```

## Webhook Configuration

### GitHub Webhooks

ReadyLayer automatically configures webhooks when installed as a GitHub App.

### Custom Webhooks

For manual setup, POST to:

```
https://api.readylayer.io/webhooks/{provider}/{event}
```

Headers:
```
Authorization: Bearer {READYLAYER_TOKEN}
X-Webhook-Signature: {HMAC_SHA256}
```

## Security Best Practices

1. **Never commit tokens** to repositories
2. Use organization-level repository secrets
3. Enable webhook signature verification
4. Restrict token scopes to minimum required
5. Rotate tokens quarterly
6. Monitor webhook logs for failures

## Troubleshooting

### Action fails with "Token expired"

```bash
# Refresh your token
readylayer auth refresh --token $READYLAYER_TOKEN
```

### Coverage threshold not met

```bash
# Check coverage details
readylayer coverage --pr $PR_ID
```

### Tests not generated

Enable with configuration:

```yaml
readylayer:
  test-generation: enabled
  test-framework: jest # jest|pytest|vitest|mocha
```

## Support

For CI/CD issues:
- Docs: https://readylayer.io/docs/ci-cd
- Email: support@readylayer.io
- Slack: [Join community](https://readylayer.io/slack)
