# ReadyLayer Design System & Component Library

**Version**: 2.0 - AAAA Grade  
**Status**: Production Ready  
**Last Updated**: January 2025  

---

## Table of Contents

1. [Design System Philosophy](#design-system-philosophy)
2. [Component Primitives](#component-primitives)
3. [Type Safety & Schemas](#type-safety--schemas)
4. [Motion & Accessibility](#motion--accessibility)
5. [Charts & Data Visualization](#charts--data-visualization)
6. [Error Handling](#error-handling)
7. [Service Contracts](#service-contracts)
8. [API Patterns](#api-patterns)
9. [Migration Guide](#migration-guide)

---

## Design System Philosophy

### Principles

- **Accessibility First**: WCAG 2.1 AA compliant out of the box
- **Type Safety**: Zero `any` types; discriminated unions for complex types
- **Consistency**: Single source of truth for colors, spacing, and behaviors
- **Performance**: Optimized animations respect user preferences
- **Developer Experience**: Clear patterns and predictable APIs

### Architecture Layers

```
┌─────────────────────────────────────────────┐
│  UI Components (Button, Card, Modal, etc)  │
├─────────────────────────────────────────────┤
│  Design Tokens (colors, spacing, motion)   │
├─────────────────────────────────────────────┤
│  Type System (Zod schemas, inferred types) │
├─────────────────────────────────────────────┤
│  Service Layer (ServiceResult<T> pattern)  │
├─────────────────────────────────────────────┤
│  API Routes (typed requests/responses)     │
└─────────────────────────────────────────────┘
```

---

## Component Primitives

### Core Components

All components follow these patterns:

- **Fully typed props** using TypeScript interfaces
- **Forward refs** for DOM manipulation
- **Class variance authority** for variants
- **Accessible** ARIA roles and attributes
- **Motion-friendly** with Framer Motion integration

### Button Component

```typescript
import { Button } from '@/components/ui'

// All variants type-safe
<Button variant="default" size="md" disabled={false}>
  Click me
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default (44px), sm (40px), lg (48px), icon
```

**Accessibility**: 
- ✅ 44px minimum touch target (mobile-friendly)
- ✅ Focus visible ring
- ✅ Disabled state managed
- ✅ Proper ARIA labels for icon-only buttons

### Modal/Dialog Component

```typescript
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui'

<Modal open={isOpen} onOpenChange={setIsOpen}>
  <ModalContent size="sm">
    <ModalHeader>
      <ModalTitle>Confirm action</ModalTitle>
      <ModalDescription>This cannot be undone</ModalDescription>
    </ModalHeader>
    <ModalFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

**Accessibility**:
- ✅ Automatic focus trap (focus stays inside)
- ✅ Escape key dismissal
- ✅ Keyboard-only navigation
- ✅ Focus returned when closed

### Card Component

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card padding="default">
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**Padding Variants**:
- `default`: Standard padding (24px)
- `compact`: Reduced padding (16px)
- `none`: No padding (for custom layouts)

### Other Primitives

| Component | Purpose | Export Path |
|-----------|---------|-------------|
| Badge | Status indicators | `components/ui` |
| Input | Form fields | `components/ui` |
| Textarea | Multi-line input | `components/ui` |
| Tabs | Tabbed content | `components/ui` |
| LoadingSpinner | Loading states | `components/ui` |
| Skeleton | Structure-preserving loading | `components/ui` |
| EmptyState | No data state | `components/ui` |
| ErrorState | Error fallback | `components/ui` |
| Toast | Notifications | `components/ui` |

---

## Type Safety & Schemas

### Zod Schemas for Everything

All data structures use Zod for validation and TypeScript inference:

```typescript
// lib/types/review.ts
export const ReviewSchema = z.object({
  id: z.string(),
  kind: z.enum(['review-guard', 'test-engine', 'doc-sync']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  findings: z.array(FindingSchema),
})

// Automatic TypeScript type from schema
export type Review = z.infer<typeof ReviewSchema>
```

### Available Schemas

**Core Domain**:
- `ReviewSchema` + type guards (isReviewGuardReview, etc)
- `TestRunSchema` + helpers (isTestRunFailed, isCoverageDegraded)
- `FindingSchema` with severity mapping
- `CoverageSchema` for metrics

**Integration**:
- `WebhookEventSchema` with discriminated union for all providers
- `PullRequestSchema`, `RepositorySchema`, `CIRunSchema`

**Service Contracts**:
- `ServiceResult<T>` pattern for all services
- Type guards: `isServiceResultOk`, `isServiceResultBlocked`, `isServiceResultError`

### Importing Schemas

```typescript
// Option 1: Import from specific module
import { ReviewSchema, type Review } from '@/lib/types/review'

// Option 2: Centralized import (recommended)
import { ReviewSchema, type Review } from '@/lib/contracts'

// Then validate at network boundary
const result = ReviewSchema.safeParse(jsonData)
if (result.success) {
  const review: Review = result.data // Fully typed!
}
```

---

## Motion & Accessibility

### Respecting User Preferences

All animations automatically respect `prefers-reduced-motion`:

```typescript
import { getMotionConfig } from '@/lib/design/motion'

export function MyComponent() {
  const motion = getMotionConfig()

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: motion.transitionDuration }}
    >
      Content will fade in (or instantly appear if reduced motion is set)
    </motion.div>
  )
}
```

### Motion Durations

- **micro** (150ms): Button presses, quick feedback
- **transition** (250ms): Standard state changes
- **page** (400ms): Page transitions, major changes

### Disabled for Accessibility

- ✅ Animations disabled for `prefers-reduced-motion: reduce`
- ✅ Hardware acceleration enabled
- ✅ No animation jank on scroll

---

## Charts & Data Visualization

### Simple Chart Primitives

For basic metrics and dashboards:

```typescript
import {
  ChartContainer,
  LinearProgress,
  BarChart,
  DonutChart,
  Sparkline,
} from '@/components/ui/chart'

// Linear progress bar
<LinearProgress
  value={85}
  max={100}
  label="Code Coverage"
  unit="%"
  variant="success"
/>

// Bar chart
<BarChart
  data={[
    { label: 'Tests', value: 150, variant: 'success' },
    { label: 'Failures', value: 5, variant: 'danger' },
  ]}
/>

// Donut chart
<DonutChart
  data={[
    { label: 'Passed', value: 95, variant: 'success' },
    { label: 'Failed', value: 5, variant: 'danger' },
  ]}
/>

// Sparkline (mini chart)
<Sparkline
  data={[
    { label: 'Day 1', value: 45 },
    { label: 'Day 2', value: 52 },
    { label: 'Day 3', value: 48 },
  ]}
/>
```

### Advanced Charting

For complex time-series or interactive charts, integrate `recharts` or `visx`:

```typescript
// In package.json
// "recharts": "^2.10.0"

import { LineChart, Line, CartesianGrid, Tooltip } from 'recharts'

const data = [
  { date: '2025-01-01', coverage: 75 },
  { date: '2025-01-02', coverage: 78 },
  { date: '2025-01-03', coverage: 82 },
]

<LineChart width={600} height={300} data={data}>
  <CartesianGrid />
  <Tooltip />
  <Line type="monotone" dataKey="coverage" stroke="#4F46E5" />
</LineChart>
```

---

## Error Handling

### Typed Errors

All errors are typed for exhaustive handling:

```typescript
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  RateLimitError,
} from '@/lib/errors'

try {
  // ... operation
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Handle 401
    redirect('/auth/signin')
  } else if (error instanceof ForbiddenError) {
    // Handle 403
    showErrorPage()
  } else if (error instanceof RateLimitError) {
    // Handle 429
    showRateLimitMessage()
  }
}
```

### Error Context

All errors include actionable context:

```typescript
throw new UnauthorizedError('Session expired', {
  reason: 'session_timeout',
  redirectTo: '/auth/signin'
})

throw new ValidationError('Invalid input', {
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Minimum 8 characters' }
  ]
})
```

---

## Service Contracts

### ServiceResult Pattern

All services return `ServiceResult<T>` instead of throwing mixed patterns:

```typescript
import { ServiceResult, serviceOk, serviceBlocked, serviceError } from '@/lib/types/service'

export async function myScan(input: MyInput): Promise<ServiceResult<MyScanResult>> {
  try {
    // Check preconditions
    if (!input.isValid()) {
      return serviceBlocked('Invalid input', { reason: 'missing_field' })
    }

    // Execute scan
    const result = await executeScan(input)

    // Check policy
    if (result.violatesPolicy) {
      return serviceBlocked('Policy violation', { rule: result.rule })
    }

    return serviceOk(result)
  } catch (error) {
    return serviceError(error instanceof Error ? error : new Error(String(error)))
  }
}
```

### Consuming Service Results

```typescript
import { isServiceResultOk, isServiceResultBlocked, isServiceResultError } from '@/lib/types/service'

const result = await myScan(input)

if (isServiceResultOk(result)) {
  // result.data is typed as MyScanResult
  console.log('Scan passed:', result.data)
} else if (isServiceResultBlocked(result)) {
  // result.reason is string
  logger.warn(`Blocked: ${result.reason}`)
  // Don't throw, just skip this scan
} else {
  // result.error is Error | string
  logger.error('Scan failed:', result.error)
  throw result.error instanceof Error ? result.error : new Error(String(result.error))
}
```

---

## API Patterns

### Request/Response Validation

```typescript
// app/api/my-endpoint/route.ts
import { createRouteHandler, successResponse, validateBody } from '@/lib/api-route-helpers'
import { MyRequestSchema } from '@/lib/contracts'

const handler = createRouteHandler(async (context) => {
  const { request, user, log } = context

  // Parse request body
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return bodyResult.response
  }

  // Validate against schema
  const validationResult = validateBody(bodyResult.data, MyRequestSchema)
  if (!validationResult.success) {
    return validationResult.response
  }

  const body = validationResult.data // Fully typed!

  // Execute logic
  const result = await myService.process(body)

  // Return typed response
  return successResponse(result)
})

export const POST = handler
```

### Client-Side Response Validation

```typescript
// lib/hooks/use-my-data.ts
import { useQuery } from '@tanstack/react-query'
import { MyResponseSchema } from '@/lib/contracts'

export function useMyData() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: async () => {
      const response = await fetch('/api/my-endpoint')
      const json = await response.json()

      // Always validate at network boundary
      const result = MyResponseSchema.safeParse(json.data)
      if (!result.success) {
        throw new Error('Invalid response: ' + JSON.stringify(result.error))
      }

      return result.data // Fully typed!
    }
  })
}
```

---

## Migration Guide

### From Old Patterns

**Before** (unsafe):
```typescript
// ❌ No validation
const data = await fetch('/api/data')
const json = await data.json()
const item = json.data as Review // Unsafe cast!

// ❌ Loose error handling
try {
  await operation()
} catch (error) {
  if (error.message === 'UNAUTHORIZED') { }
}
```

**After** (safe):
```typescript
// ✅ Validated schema
import { ReviewSchema } from '@/lib/contracts'

const response = await fetch('/api/data')
const json = await response.json()
const result = ReviewSchema.safeParse(json.data)
if (!result.success) throw new ValidationError(...)
const item: Review = result.data

// ✅ Typed error handling
import { UnauthorizedError } from '@/lib/errors'

try {
  await operation()
} catch (error) {
  if (error instanceof UnauthorizedError) { }
}
```

### Creating New Services

**Template**:

```typescript
// services/my-service/index.ts
import { ServiceResult, serviceOk, serviceBlocked, serviceError } from '@/lib/types/service'
import { MyInputSchema, type MyInput } from '@/lib/contracts'

export async function executeMyService(input: MyInput): Promise<ServiceResult<MyOutput>> {
  try {
    // Validate input
    const validationResult = MyInputSchema.safeParse(input)
    if (!validationResult.success) {
      return serviceBlocked('Invalid input', { errors: validationResult.error.errors })
    }

    const validInput = validationResult.data

    // Execute
    const output = await executeLogic(validInput)

    return serviceOk(output)
  } catch (error) {
    return serviceError(error instanceof Error ? error : new Error(String(error)))
  }
}
```

---

## Maintenance & Scaling

### Adding New Components

1. Create in `components/ui/my-component.tsx`
2. Export from `components/ui/index.ts`
3. Add to `COMPONENT-LIBRARY.md`
4. Update Storybook (if using)

### Adding New Types

1. Create in `lib/types/my-type.ts` with Zod schema
2. Export from `lib/contracts/index.ts`
3. Document in `ARCHITECTURE-QUICK-START.md`
4. Create type guards if discriminated union

### Adding New Services

1. Create `services/my-service/index.ts`
2. Use `ServiceResult<T>` pattern
3. Export types from `lib/contracts/`
4. Document error handling

### Adding New API Routes

1. Use `createRouteHandler` for consistency
2. Validate requests with Zod schemas
3. Return typed responses
4. Inherit error handling automatically

---

## Quality Checklist

Before shipping:

- [ ] All types are inferred from Zod schemas (no `any`)
- [ ] All network boundaries have validation
- [ ] All errors are typed (no string comparisons)
- [ ] All components have `aria-label` or semantic HTML
- [ ] All animations respect `prefers-reduced-motion`
- [ ] All touch targets are >= 44px
- [ ] All forms have proper labels and ARIA
- [ ] All data fetches have loading/error/empty states
- [ ] All services return `ServiceResult<T>`
- [ ] Tests cover happy + sad paths

---

## References

- [Component Library](./COMPONENT-LIBRARY.md)
- [Quick Start](../ARCHITECTURE-QUICK-START.md)
- [Error Handling](./ERROR-HANDLING.md)
- [Accessibility](./ACCESSIBILITY.md)

---

**Version**: 2.0  
**Last Updated**: January 2025  
**Maintained By**: Architecture Team
