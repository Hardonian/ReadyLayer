# ReadyLayer Architecture Quick Start

**For developers**: Quick patterns to follow when building new features.

---

## 1. Define Types with Zod Schemas

```typescript
// lib/types/my-feature.ts
import { z } from 'zod'

// Always export both schema and inferred type
export const MyFeatureSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.coerce.date(),
})

// Type is automatically derived from schema
export type MyFeature = z.infer<typeof MyFeatureSchema>

// For list responses
export const MyFeatureListSchema = z.array(MyFeatureSchema)
export type MyFeatureList = z.infer<typeof MyFeatureListSchema>
```

---

## 2. Create Typed API Route

```typescript
// app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler, successResponse } from '@/lib/api-route-helpers'
import { MyFeatureSchema } from '@/lib/types/my-feature'

// Handler receives validated context with user
const handler = createRouteHandler(async (context) => {
  const { request, user, log } = context

  try {
    // Fetch data
    const items = await prisma.myFeature.findMany({
      where: { organizationId: user.organizationIds[0] }
    })

    // Return with automatic status code mapping
    return successResponse(items)
  } catch (error) {
    // Errors are automatically caught and formatted
    throw error
  }
})

// Export as GET/POST/etc.
export const GET = handler
```

---

## 3. Validate Client Responses

```typescript
// lib/hooks/use-my-features.ts
import { useQuery } from '@tanstack/react-query'
import { MyFeatureSchema, MyFeatureListSchema } from '@/lib/types/my-feature'

export function useMyFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const response = await fetch('/api/my-feature')
      const json = await response.json()

      // Always validate at network boundary
      const result = MyFeatureListSchema.safeParse(json.data)
      if (!result.success) {
        throw new Error('Invalid response: ' + JSON.stringify(result.error))
      }

      return result.data // Fully typed!
    }
  })
}
```

---

## 4. Use Typed Errors

```typescript
// OLD: String-based error checking ❌
if (error.message === 'UNAUTHORIZED') { }

// NEW: Type-safe error handling ✅
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

try {
  const user = await requireAuth(request)
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Handle 401
  } else if (error instanceof ForbiddenError) {
    // Handle 403
  }
  throw error // Let createRouteHandler map to response
}
```

---

## 5. Create Type-Safe Components

```typescript
// components/my-feature-card.tsx
import { MyFeature } from '@/lib/types/my-feature'

interface MyFeatureCardProps {
  feature: MyFeature // Fully typed!
  onSelect: (id: string) => void
}

export function MyFeatureCard({ feature, onSelect }: MyFeatureCardProps) {
  return (
    <Card>
      <h3>{feature.name}</h3>
      <p>{feature.status}</p>
      <Button onClick={() => onSelect(feature.id)}>Select</Button>
    </Card>
  )
}
```

---

## 6. Use Modal Primitives

```typescript
import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  Button,
} from '@/components/ui'

export function ConfirmDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Are you sure?</ModalTitle>
          <ModalDescription>This action cannot be undone.</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

---

## 7. Discriminated Unions for Review Types

```typescript
import { Review, isReviewGuardReview, isTestEngineReview } from '@/lib/types/review'

export function ReviewCard({ review }: { review: Review }) {
  // Type narrowing with discriminator
  if (isReviewGuardReview(review)) {
    return <ReviewGuardUI review={review} />
  } else if (isTestEngineReview(review)) {
    return <TestEngineUI review={review} />
  }

  return <CompositeReviewUI review={review} />
}
```

---

## 8. Standardize Service Results

```typescript
// services/my-feature/index.ts
import { ServiceResult } from '@/lib/types/service'

export async function processFeature(
  input: MyFeatureInput
): Promise<ServiceResult<MyFeatureOutput>> {
  try {
    // ... process
    return { status: 'ok', data: result }
  } catch (error) {
    if (error instanceof PolicyError) {
      return { status: 'blocked', reason: error.message }
    }
    return { status: 'error', error }
  }
}

// In API route:
const result = await processFeature(input)

if (result.status === 'ok') {
  return successResponse(result.data)
} else if (result.status === 'blocked') {
  return errorResponse('FEATURE_BLOCKED', result.reason, 422)
} else {
  throw result.error
}
```

---

## Checklist: Before You Push

- [ ] All types defined in `lib/types/*.ts` with Zod schemas
- [ ] API routes use `createRouteHandler` for consistent error handling
- [ ] Client hooks validate responses with `schema.safeParse()`
- [ ] No `any` types except where explicitly documented
- [ ] Error handling uses typed error classes, not string comparisons
- [ ] Discriminated unions used for complex types
- [ ] Modal/Dialog uses `ModalContent` primitive, not custom divs
- [ ] All animated components use proper `HTMLMotionProps` typing
- [ ] Tests written for schema validation (happy + sad path)

---

## Common Patterns

### Pagination
```typescript
import { commonSchemas } from '@/lib/api-route-helpers'

const { limit, offset } = commonSchemas.pagination.parse({
  limit: '20',
  offset: '0'
})
```

### ID Validation
```typescript
import { commonSchemas } from '@/lib/api-route-helpers'

const id = commonSchemas.id.parse(request.query.id)
```

### Safe Type Extraction
```typescript
import { safeString, safeNumber, safeArray } from '@/lib/api-route-helpers'

const name = safeString(body.name, 'unknown')
const count = safeNumber(body.count, 0)
const tags = safeArray<string>(body.tags)
```

---

## Need More?

- **Error Handling Details**: See `lib/errors.ts`
- **Full Type Definitions**: See `lib/types/review.ts` and `lib/types/test-run.ts`
- **Service Patterns**: See `ARCHITECTURE-HARDENING-REMEDIATION.md`
- **Component Library**: See `components/ui/index.ts`

---

**Version**: 1.0  
**Updated**: January 2025
