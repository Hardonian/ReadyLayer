# Demo in 60 Seconds

ReadyLayer includes a complete demo mode that showcases the full governance pipeline without requiring external credentials, databases, or services.

## Quick Start

```bash
# Start the app in demo mode
npm run demo:start

# In another terminal, run the demo E2E test
npm run demo:e2e
```

That's it! The demo mode:
- Uses deterministic seeded data
- Makes no external API calls
- Requires no database connection
- Works in CI without secrets

## How It Works

### 1. Demo Mode Endpoints

The demo mode exposes a complete API endpoint that simulates the ReadyLayer governance pipeline:

- **GET `/api/demo`** - Runs the full demo pipeline
- **POST `/api/demo`** - Same, with optional filtering via `checkIds` body param

### 2. Deterministic Seed Data

Demo mode uses fixed data so results are always reproducible:

| Component | Value |
|-----------|-------|
| Run ID | `demo_sandbox_demo_abc123def456` |
| Timestamp | `2024-01-15T10:30:00.000Z` |
| PR | #42 - "Sandbox Demo: Add user authentication" |
| Organization | `demo-org-00000000-0000-0000-0000-000000000001` |

See `content/demo/seedData.ts` for all seed values.

### 3. Sandbox Fixtures

The demo runs against realistic code fixtures that trigger actual findings:

| File | Content | Findings |
|------|---------|----------|
| `src/auth.ts` | SQL injection, hardcoded secret | 2 security findings |
| `src/api/users.ts` | Missing input validation | 1 quality finding |
| `src/utils/validation.ts` | ReDoS vulnerable regex | 1 quality finding |

See `content/demo/sandboxFixtures.ts` for the complete fixture set.

### 4. Demo Pipeline

The demo executes the full ReadyLayer pipeline:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Review Guard   │────▶│   Test Engine   │────▶│    Doc Sync     │
│  (3 checks)    │     │   (2 checks)   │     │   (3 checks)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Security issues         Unit tests             OpenAPI spec
   Performance issues      Coverage              README update
   Quality issues                                  Changelog
```

## Demo Checks

### Review Guard (3 checks)

| Check | Status | Findings |
|-------|--------|----------|
| Security scan | failure | SQL injection, hardcoded secret |
| Performance scan | success | 0 issues |
| Quality scan | failure | ReDoS vulnerability |

### Test Engine (2 checks)

| Check | Status | Metrics |
|-------|--------|---------|
| Unit tests | success | 3 tests generated |
| Coverage analysis | success | +5% delta |

### Doc Sync (3 checks)

| Check | Status | Artifacts |
|-------|--------|-----------|
| OpenAPI spec | success | Updated spec |
| README update | success | Updated docs |
| Changelog entry | success | Version 1.0.0 |

## CI Configuration

The demo E2E test runs in CI without secrets:

```yaml
# .github/workflows/ci.yml
demo-e2e:
  name: Demo E2E (no secrets)
  env:
    DEMO_MODE_ENABLED: 'true'
    NODE_ENV: test
    NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'true'
    DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
  steps:
    - run: npm run build
    - run: npx playwright test e2e/demo-sandbox.spec.ts --project=chromium
```

## Customizing the Demo

### Adding New Findings

Edit `content/demo/sandboxFixtures.ts` to add or modify code fixtures:

```typescript
{
  path: 'src/new-file.ts',
  content: `// Your code here
const secret = 'FAKE_API_KEY'; // This will trigger a finding`,
}
```

### Modifying Check Behavior

Edit `lib/demo/pipeline.ts` to change how checks analyze code:

```typescript
function analyzeCodeForSecurity(filePath: string, content: string): DemoFinding[] {
  if (content.includes('YOUR_NEW_PATTERN')) {
    // Add a new finding type
  }
}
```

### Changing Expected Results

Edit `e2e/demo-sandbox.spec.ts` to update test expectations.

## Files Reference

| File | Purpose |
|------|---------|
| `lib/demo/pipeline.ts` | Demo pipeline execution |
| `content/demo/seedData.ts` | Deterministic seed values |
| `content/demo/sandboxFixtures.ts` | Code fixtures for analysis |
| `app/api/demo/route.ts` | Demo API endpoint |
| `e2e/demo-sandbox.spec.ts` | Demo E2E tests |

## Troubleshooting

### Demo endpoint returns 403

Ensure you're running in non-production mode:
```bash
NODE_ENV=development npm run dev
```

Or set `DEMO_MODE_ENABLED=true`.

### Tests fail with "Supabase unavailable"

This is expected! The demo mode works without Supabase. The warning is logged but doesn't affect functionality.

### Results not deterministic?

Check that `DEMO_FROZEN_TIMESTAMP` isn't being modified. The demo relies on this fixed timestamp.
