# Demo Fixtures

This directory contains static demo data used for the Interactive PR Demo on the landing page.

## Files

- `prDemoFixtures.ts` - TypeScript definitions and demo data for PR checks, findings, diffs, and doc updates

## How to Tweak the Demo

### Modifying PR Checks

Edit the `demoChecks` array in `prDemoFixtures.ts`:

```typescript
export const demoChecks: PRCheck[] = [
  {
    id: 'rg-security',
    name: 'Review Guard - Security scan',
    status: 'success', // 'queued' | 'running' | 'success' | 'failure' | 'cancelled'
    duration: 12, // seconds (affects animation timing)
    category: 'review-guard', // 'review-guard' | 'test-engine' | 'doc-sync'
    details: {
      findings: [/* ... */],
    },
  },
  // Add more checks...
]
```

### Modifying Findings

Each check can have `details.findings` array:

```typescript
findings: [
  {
    id: 'f1',
    severity: 'high', // 'critical' | 'high' | 'medium' | 'low'
    title: 'Your finding title',
    description: 'Your finding description',
    file: 'src/file.ts',
    line: 23,
  },
]
```

### Modifying Code Diff

Edit the `demoDiff` object:

```typescript
export const demoDiff: CodeDiff = {
  file: 'src/your-file.ts',
  language: 'typescript',
  additions: 15,
  deletions: 8,
  hunks: [/* ... */],
}
```

### Modifying Doc Updates

Edit `demoDocUpdates` object for OpenAPI and README content.

## Notes

- All data is static and labeled as "Interactive Preview"
- No external API calls are made
- Animation timing is controlled by `duration` field (multiplied by 100ms)
- The demo respects `prefers-reduced-motion` and will skip animations if enabled
