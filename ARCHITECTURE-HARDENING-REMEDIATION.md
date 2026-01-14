# ReadyLayer AAAA-Grade Architecture Hardening

**Status**: Phase 1 & 2 Complete (4/10 critical tasks done)  
**Last Updated**: 2025  
**Owner**: Architecture Team  

---

## Executive Summary

This document codifies the systematic hardening of the ReadyLayer platform to **AAAA-grade production standards**. The work is organized into three phases:

1. **CRITICAL Fixes** (Type Safety & Error Handling) ✅ 80% Complete
2. **MAJOR Improvements** (Service Contracts & Validation) 🔄 In Progress
3. **NICE-to-Have** (Motion & Visualization) ⏳ Pending

---

## ✅ Completed: Critical Fixes

### 1. Typed Authentication Errors [COMPLETE]

**What was done:**
- Created typed error classes: `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `DatabaseError`, `RateLimitError`
- Updated `lib/auth.ts` to throw `UnauthorizedError` instead of `Error('UNAUTHORIZED')`
- Updated `lib/api-route-helpers.ts` to handle typed errors with proper HTTP status codes

**Files Modified:**
- `lib/errors.ts` (+150 lines of typed error classes)
- `lib/auth.ts` (import + requireAuth refactor)
- `lib/api-route-helpers.ts` (error handling in createRouteHandler)

**Benefits:**
- ✅ Type-safe error handling (no string comparisons)
- ✅ Consistent HTTP status mapping (401/403/404/500)
- ✅ Better error context and debugging (structured logs)
- ✅ All API routes inherit proper error handling

**Migration Pattern:**
```typescript
// OLD
throw new Error('UNAUTHORIZED')

// NEW
throw new UnauthorizedError('Session expired', { reason: 'session_timeout' })
```

---

### 2. Motion Props Type Safety [COMPLETE]

**What was done:**
- Replaced `props as any` in Button component with proper `HTMLMotionProps<'button'>` typing
- Fixed Skeleton component to accept `HTMLMotionProps<'div'>` instead of `any`
- Removed eslint-disable comments

**Files Modified:**
- `components/ui/button.tsx` (HTMLMotionProps type)
- `components/ui/loading.tsx` (Skeleton component)

**Benefits:**
- ✅ Full TypeScript validation for motion props
- ✅ IDE autocomplete for animation parameters
- ✅ Prevents runtime errors from typos in motion props
- ✅ Consistent pattern for all animated components

**Pattern to Apply Elsewhere:**
```typescript
import { type HTMLMotionProps } from 'framer-motion'

// For any component wrapping motion.X:
interface MyComponentProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  // ... other props
}
```

---

### 3. Centralized Type Schemas [COMPLETE]

**What was done:**
- Created `lib/types/review.ts` (264 lines, 15+ Zod schemas)
  - Discriminated union for review kinds (ReviewGuard, TestEngine, DocSync, Composite)
  - Detailed Finding, Scan, Result schemas
  - Type guards and helpers
  
- Created `lib/types/test-run.ts` (259 lines, 10+ Zod schemas)
  - TestRun, TestRunDetail, TestRunSummary schemas
  - TestSuite, TestCase, Coverage schemas
  - State machine helpers (canCancel, canRetry, etc.)

**Export Pattern:**
```typescript
// In lib/types/review.ts
export const ReviewSchema = z.discriminatedUnion('kind', [
  ReviewGuardReviewSchema,
  TestEngineReviewSchema,
  DocSyncReviewSchema,
])

export type Review = z.infer<typeof ReviewSchema>

// Server-side validation
const result = ReviewSchema.safeParse(jsonResponse)
if (!result.success) throw new ValidationError(...)

// Client-side typing
const review: Review = result.data // Fully typed!
```

**Benefits:**
- ✅ Single source of truth for reviews/test-runs
- ✅ Runtime validation on both server & client
- ✅ Compile-time type safety via `z.infer<>`
- ✅ Discriminated unions for proper type narrowing
- ✅ Built-in helpers (isTestRunFailed, etc.)

---

### 4. Modal Primitive with Focus Management [COMPLETE]

**What was done:**
- Created `components/ui/modal.tsx` (232 lines)
  - Built on Radix Dialog (battle-tested, accessible)
  - Automatic focus trap & keyboard handling
  - Proper ARIA roles & attributes
  - Animated with Framer Motion (scale + fade)
  - Fully composable (Modal, ModalContent, ModalHeader, etc.)

**Exports:**
- `Dialog` (Radix Root)
- `Modal` (convenience wrapper)
- `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription`
- `ModalFooter`, `ModalCloseButton`
- `ModalOverlay` (backdrop)

**Example Usage:**
```tsx
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter, Button } from '@/components/ui'

export function DeleteConfirmation() {
  const [open, setOpen] = useState(false)

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Delete account?</ModalTitle>
          <p className="text-sm text-text-muted">This cannot be undone.</p>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

**Benefits:**
- ✅ Battle-tested Radix Dialog primitive
- ✅ Automatic focus management (prevents accidental clicks)
- ✅ Escape key dismissal
- ✅ Keyboard-only navigation support
- ✅ WCAG 2.1 Level AA compliant
- ✅ Animated backdrop & scale-in effect

---

## 🔄 In Progress: Major Improvements

### 5. Audit & Type Workers/Integrations

**Scope:**
- `workers/job-processor.ts` - Job queuing & execution
- `workers/webhook-processor.ts` - Webhook handling
- `integrations/git-provider-adapter.ts` - Git provider abstraction
- `integrations/github/api-client.ts`, `integrations/gitlab/`, `integrations/bitbucket/`
- `queue/index.ts` - Job queue implementation

**Current State:**
- Many `any` types in webhook/job parsing
- Loose validation with `z.record(z.any())`
- Type mismatches between webhook input & service expectations

**Remediation Pattern:**

```typescript
// OLD (workers/webhook-processor.ts)
export async function handleGitHubWebhook(payload: any) {
  const event = payload.action
  // Fragile, no validation
}

// NEW
import { z } from 'zod'

const GitHubWebhookPayloadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('opened'),
    pull_request: z.object({
      id: z.number(),
      title: z.string(),
      // ... detailed schema
    }),
  }),
  z.object({
    action: z.literal('synchronize'),
    pull_request: z.object({ id: z.number() }),
  }),
])

export type GitHubWebhookPayload = z.infer<typeof GitHubWebhookPayloadSchema>

export async function handleGitHubWebhook(payload: unknown) {
  const result = GitHubWebhookPayloadSchema.safeParse(payload)
  if (!result.success) {
    throw new ValidationError('Invalid GitHub webhook payload', { errors: result.error.errors })
  }
  
  const event: GitHubWebhookPayload = result.data
  // Now type-safe!
}
```

**Action Items:**
1. Create `lib/contracts/webhooks.ts` with discriminated union schemas for each provider
2. Update each `workers/` handler to validate & parse input
3. Update each `integrations/*/webhook.ts` to use shared schemas
4. Add unit tests for webhook parsing (happy & sad paths)

**Priority:**
- 🔴 Critical (prevents data corruption)
- Estimated effort: **4-6 hours**
- Risk if not done: Silent failures, webhook data mishandling

---

### 6. Standardize Service Error Contracts

**Scope:**
- `services/review-guard/index.ts`
- `services/test-engine/index.ts`
- `services/doc-sync/index.ts`
- Other service modules in `services/`

**Current State:**
- Inconsistent return types (throw vs. return { status, error })
- Some services throw `Error`, others return objects
- Unclear which errors are recoverable vs. fatal

**Target State:**
```typescript
// Discriminated union for service results (success | failure)
export type ServiceResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'blocked'; reason: string }
  | { status: 'error'; error: Error }

// Services ALWAYS use this pattern:
export async function reviewGuardScan(input: ReviewGuardInput): Promise<ServiceResult<ReviewGuardScan>> {
  try {
    // ... execution
    return { status: 'ok', data: scanResult }
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      return { status: 'blocked', reason: error.message }
    }
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) }
  }
}
```

**Caller Pattern:**
```typescript
// Clean, explicit error handling
const result = await reviewGuardService.scan(input)

if (result.status === 'ok') {
  // Success path
  processFindings(result.data)
} else if (result.status === 'blocked') {
  // Recoverable blockage
  logger.info(`Scan blocked: ${result.reason}`)
} else {
  // Unrecoverable error
  logger.error('Scan failed', result.error)
  throw result.error
}
```

**Action Items:**
1. Define `ServiceResult<T>` type in `lib/types/service.ts`
2. Update each `services/*/index.ts` to use consistent pattern
3. Update all callers in `app/api/*` routes to handle new pattern
4. Add type guards (isServiceOk, isServiceBlocked, etc.)

**Priority:**
- 🔴 Critical (affects all service calls)
- Estimated effort: **6-8 hours**
- Risk if not done: Unpredictable error handling, missed blockages

---

### 7. Shared Zod Schema Exports

**Scope:**
- `lib/contracts/` (create/enhance)
- All API routes in `app/api/*`
- All client hooks in `lib/hooks/`
- Data fetching in `components/`

**Current State:**
- `lib/contracts/schemas.ts` exists but not fully utilized
- Client components often cast JSON to inline interfaces
- No validation at network boundary on client

**Target State:**

```typescript
// lib/contracts/schemas.ts (export all public API schemas)
export { ReviewSchema, FindingSchema } from '../types/review'
export { TestRunSchema, TestSuiteSchema } from '../types/test-run'

// app/api/dashboard/findings/route.ts (server)
const responseSchema = z.object({
  data: z.array(FindingSchema),
  pagination: z.object({ /* ... */ })
})

return NextResponse.json(findings, { status: 200 })

// lib/hooks/use-dashboard-findings.ts (client)
import { FindingSchema } from '@/lib/contracts/schemas'

export function useDashboardFindings(orgId: string) {
  return useQuery({
    queryKey: ['findings', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/findings?org=${orgId}`)
      const json = await response.json()
      
      // Validate before use
      const validationResult = z.array(FindingSchema).safeParse(json.data)
      if (!validationResult.success) {
        throw new ValidationError('Invalid findings response', { errors: validationResult.error.errors })
      }
      
      return validationResult.data // Fully typed!
    }
  })
}
```

**Action Items:**
1. Audit all `app/api/*` routes and ensure they match exported schemas
2. Update all client hooks to validate responses using shared schemas
3. Create `lib/contracts/index.ts` for convenient re-exports
4. Add integration tests for request/response validation

**Priority:**
- 🟡 Major (affects data reliability)
- Estimated effort: **5-7 hours**
- Risk if not done: Silent data corruption, cache mismatches

---

## ⏳ Pending: Nice-to-Have Improvements

### 8. Motion 'prefers-reduced-motion' Support

**Scope:** All Framer Motion components

**Pattern:**
```typescript
import { useReducedMotion } from 'framer-motion'

export function AnimatedCard() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
      }}
    >
      {/* content */}
    </motion.div>
  )
}
```

**Files to Update:**
- `lib/design/motion.ts` (add reducedMotionTransition)
- All components using motion in `components/`

---

### 9. Chart Primitives for Metrics

**Scope:** Metrics dashboard visualization

**Suggested Library:** `recharts` or `visx`

**Pattern:**
```typescript
// components/ui/chart.tsx
export function LineChart({ data, xKey, yKey }) {
  // Memoized chart for performance
}
```

---

### 10. Architecture Documentation & Runbook

Create comprehensive guides:
- `docs/architecture/DESIGN-SYSTEM.md` - Component library
- `docs/architecture/TYPE-SAFETY.md` - How to use Zod & infer
- `docs/architecture/ERROR-HANDLING.md` - Error patterns
- `docs/runbooks/SERVICE-INTEGRATION.md` - Adding new services

---

## Implementation Checklist

- [x] Typed error classes
- [x] Motion prop typing
- [x] Centralized review & test-run types
- [x] Modal primitive
- [ ] Audit & type workers
- [ ] Standardize service contracts
- [ ] Shared schema exports
- [ ] Reduced motion support
- [ ] Chart primitives
- [ ] Architecture documentation

---

## Integration Workflow

**For Developers:** When modifying services or adding API endpoints:

1. **Define schema first** in appropriate `lib/types/*.ts`
2. **Implement validation** using the schema in `app/api/*`
3. **Export schema** from `lib/contracts/schemas.ts`
4. **Update client** hooks to validate responses
5. **Add tests** for happy & sad path validation
6. **Document** in relevant runbook

---

## Quality Metrics

- **Type Safety**: Zero `any` types in production code
- **Error Handling**: All errors are typed and handled
- **Validation**: 100% of network boundaries validated
- **Accessibility**: All interactive elements have ARIA labels
- **Performance**: Animations respect `prefers-reduced-motion`
- **Testing**: >80% code coverage for critical paths

---

## Next Steps

1. **Review & Approve** this document
2. **Assign Ownership** for each MAJOR section
3. **Track Progress** using the TODO list
4. **Schedule Reviews** after each section completion
5. **Document Patterns** as they emerge

---

## Questions?

- **Error Handling?** See `lib/errors.ts` and `CRITICAL Fix #1`
- **Type Safety?** See `lib/types/review.ts` and `lib/types/test-run.ts`
- **Service Contracts?** See section "Standardize Service Error Contracts"
- **Component API?** See `components/ui/index.ts` and `components/ui/modal.tsx`

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Architecture Team
