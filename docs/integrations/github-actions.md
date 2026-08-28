# GitHub Actions Integration Guide

Integrate ReadyLayer into your GitHub Actions CI/CD workflow to automatically review every pull request.

## Prerequisites

- A ReadyLayer account ([sign up free](https://ready-layer.com/auth/signin))
- A GitHub repository with Actions enabled
- GitHub API token (automatically available in Actions)

## Quick Start (2 minutes)

### 1. Add ReadyLayer Action

Create `.github/workflows/readylayer.yml`:

```yaml
name: ReadyLayer Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  readylayer:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: readylayer/action@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Add Your API Key

1. Go to [ReadyLayer Settings](https://ready-layer.com/dashboard/settings)
2. Click "API Keys" → "Create New Key"
3. Copy the key
4. In GitHub: Settings → Secrets and variables → Actions → "New repository secret"
5. Name: `READYLAYER_API_KEY`, paste the key

### 3. Done!

Push a PR. ReadyLayer will automatically review your code.

## Advanced Configuration

### Policy Configuration

Control which checks run with a `readylayer.yml` in your repo root:

```yaml
version: 1.0
policies:
  - id: security.sql-injection
    enabled: true
  - id: quality.unused-variables
    enabled: true
  - id: security.hardcoded-secrets
    enabled: true

severity-levels:
  critical: block    # Block PR on critical issues
  high: block        # Block PR on high severity
  medium: warn       # Just warn on medium
  low: info          # Info only on low

exclude-paths:
  - "**/*.test.ts"
  - "**/vendor/**"
```

### Custom Workflow Trigger

Run on specific conditions:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - "src/**"
      - "lib/**"
    branches:
      - main
      - develop
```

### Conditional Blocking

Block based on review results:

```yaml
  readylayer:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: readylayer/action@v1
        id: review
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
          fail-on-high: true

      - name: Check Review Status
        if: steps.review.outputs.blocked == 'true'
        run: |
          echo "PR blocked due to critical issues"
          exit 1
```

### Integration with Other Actions

```yaml
name: Complete CI

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: readylayer/action@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}

  tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - run: npm ci && npm test

  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - run: npm ci && npm run build
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `api-key` | Yes | Your ReadyLayer API key |
| `github-token` | Yes | GitHub token for accessing PR data |
| `policy-file` | No | Path to `readylayer.yml` (default: `readylayer.yml`) |
| `fail-on-critical` | No | Fail workflow on critical issues (default: `true`) |
| `fail-on-high` | No | Fail workflow on high severity (default: `false`) |

## Outputs

Access review results in subsequent steps:

```yaml
      - uses: readylayer/action@v1
        id: review
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}

      - name: Review Results
        run: |
          echo "Total issues: ${{ steps.review.outputs.total }}"
          echo "Critical: ${{ steps.review.outputs.critical }}"
          echo "Blocked: ${{ steps.review.outputs.blocked }}"
```

## Troubleshooting

### "Invalid API Key"

- Verify the key in your repository secrets
- Check it hasn't expired in Settings → API Keys
- Regenerate if needed

### "PR not found"

- Ensure `actions/checkout@v4` runs first
- Check the Action has proper GitHub token access

### "Taking too long"

- First-time reviews take 30-60 seconds
- Subsequent reviews are faster (cached)
- Check ReadyLayer dashboard for status

### "All checks skipped"

- Verify API key is correct
- Check `readylayer.yml` isn't disabling all policies
- View logs in GitHub Actions tab

## Examples

### Standard TypeScript Project

```yaml
name: ReadyLayer Review

on:
  pull_request:

jobs:
  readylayer:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: readylayer/action@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          fail-on-critical: true
```

### monorepo with Multiple Services

```yaml
name: ReadyLayer Review

on:
  pull_request:
    paths:
      - "services/**"
      - "shared/**"

jobs:
  review-services:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: readylayer/action@v1
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}
          policy-file: readylayer.services.yml
```

### With Notifications

```yaml
  readylayer:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: readylayer/action@v1
        id: review
        with:
          api-key: ${{ secrets.READYLAYER_API_KEY }}

      - name: Notify Slack
        if: steps.review.outputs.blocked == 'true'
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "PR blocked by ReadyLayer",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Critical issues found: ${{ steps.review.outputs.critical }}"
                  }
                }
              ]
            }
```

## Support

- [Documentation](https://ready-layer.com/docs)
- [GitHub Issues](https://github.com/readylayer/action/issues)
- [Email Support](mailto:support@ready-layer.com)
