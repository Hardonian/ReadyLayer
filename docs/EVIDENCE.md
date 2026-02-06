# Evidence Pack

## Phase 0 — Discovery (Commands & Outputs)

> **Note:** Outputs captured verbatim during discovery.

### Install

```
npm install
```

```
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'readylayer@1.0.0',
npm warn EBADENGINE   required: { node: '20.x' },
npm warn EBADENGINE   current: { node: 'v22.21.1', npm: '11.4.2' }
npm warn EBADENGINE }

> readylayer@1.0.0 postinstall
> prisma generate

Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 1.27s

> readylayer@1.0.0 prepare
> husky install || true

sh: 1: husky: not found
```

### Lint

```
npm run lint
```

```
/workspace/ReadyLayer/app/api/demo/route.ts
  65:7  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
  65:7  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unsafe-member-access')
  69:9  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
```

### Typecheck

```
npm run type-check
```

```
(no output, success)
```

### Unit Tests

```
npm test
```

```
RUN  v4.0.18 /workspace/ReadyLayer
✓ __tests__/api/sad-paths.test.ts (20 tests)
✓ sdk/typescript/src/__tests__/client.test.ts (31 tests)
✓ __tests__/demo-mode.test.ts (14 tests)
```

### Build

```
npm run build
```

```
✓ Compiled successfully in 47s
✓ Generating static pages using 2 workers (132/132)
```

### Smoke

```
npm run middleware:smoke
```

```
✅ Homepage (public): 200
✅ Sign in page (public): 200
✅ Health check (public): 503
✅ Ready check (public): 503
✅ Dashboard (protected, should redirect): 307
✅ Static asset (favicon): 200
✅ Next.js static asset: 404
✅ All smoke tests passed!
```

## Issue Ledger (Severity + Root Cause Hypotheses)

| Severity | Issue | Hypothesis |
|----------|-------|------------|
| Low | Lint warnings in `app/api/demo/route.ts` | Unused `eslint-disable` directives after refactor. |
| Medium | Demo sandbox IDs were non-deterministic | `Date.now()` used in demo IDs; conflicts with deterministic demo requirement. |
| Medium | Demo scripts missing | No reset/prepare scripts; no standardized demo workflow. |
| Medium | Contract tests missing for webhook + health API | Schemas existed but not enforced in tests. |
| Medium | Hot path timing not recorded for demo/sandbox | No lightweight profiling for demo endpoints. |

## Phase 1+ Verification (Post-Change)

### Lint

```
npm run lint
```

```
(no errors)
```

### Typecheck

```
npm run type-check
```

```
(no output, success)
```

### Unit Tests

```
npm test
```

```
Test Files  21 passed | 2 skipped (23)
Tests       236 passed | 29 skipped (265)
```
