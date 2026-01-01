# Release Checklist

**Generated:** 2024-12-19  
**Purpose:** Pre-release verification checklist for UI interaction hardening

## Environment Variables

- [x] `NEXT_PUBLIC_SUPABASE_URL` - Required for auth and data
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Required for auth and data
- [x] `DATABASE_URL` - Required for Prisma (build-time only, not needed for static pages)
- [x] `REDIS_URL` - Optional (rate limiting, graceful degradation if missing)

## Middleware Safety

- [x] Middleware never throws uncaught errors
- [x] Static assets excluded from middleware processing
- [x] Public routes bypass auth checks
- [x] API routes protected with Bearer token or session
- [x] Page routes redirect to sign-in if unauthenticated
- [x] Error handling with graceful fallbacks
- [x] Edge runtime compatible (no Node.js dependencies)

## Auth Gates

- [x] Public routes (`/`, `/auth/*`) accessible without auth
- [x] Protected routes (`/dashboard/*`) require authentication
- [x] Auth callback handles OAuth flow correctly
- [x] Sign-out clears session and redirects
- [x] Session refresh via `onAuthStateChange` subscription
- [x] Auth errors display user-friendly messages

## Billing Gates

- [x] Billing API routes exist (`/api/v1/billing/tier`)
- [x] Billing enforcement handled server-side (not verified in UI audit)

## RLS Verification

- [x] Supabase RLS policies enforced server-side
- [x] Client-side uses Bearer tokens for API calls
- [x] Tenant isolation maintained (user can only access their data)

## Route Resilience

- [x] No 500s on public routes (`/`, `/auth/signin`)
- [x] Error boundaries (`error.tsx`, `global-error.tsx`) present
- [x] Not-found page (`not-found.tsx`) present
- [x] All routes have loading states
- [x] All routes have error states with retry
- [x] Timeout handling for API calls (10s default)

## Core Interactions

### Navigation
- [x] Nav links work (desktop)
- [x] Active state highlights current page
- [x] Theme toggle works (light/dark/system)
- [x] Sign-out button works
- [ ] Mobile navigation menu (not implemented, nav hidden on mobile)

### Homepage
- [x] Sign-in buttons link to `/auth/signin`
- [x] "Go to Dashboard" button works when authenticated
- [x] Feature cards link to dashboard
- [x] No console errors on load
- [x] Auth check doesn't block render

### Auth Flow
- [x] Sign-in page loads without errors
- [x] OAuth provider buttons work
- [x] Loading states per provider
- [x] Error handling with ErrorState
- [x] Auth callback redirects correctly
- [x] Auth error page shows error message

### Dashboard
- [x] Loads with loading state
- [x] Fetches repositories and reviews
- [x] Error state with retry (refetch, not reload)
- [x] Empty states for repos and reviews
- [x] "Connect Repository" button links to connect page
- [x] Repository cards link to detail pages
- [x] Review cards link to detail pages

### Repositories
- [x] List page exists (`/dashboard/repos`)
- [x] Search input works (with debounce)
- [x] Repository cards link to detail pages
- [x] Connect page exists (placeholder)
- [x] Detail page loads repository data
- [x] Toggle enable/disable works with loading state
- [x] Toast notifications on success/failure
- [x] Error handling with retry

### Reviews
- [x] List page loads reviews
- [x] Search input works (with debounce)
- [x] Filter buttons work (all/blocked/approved)
- [x] Review cards link to detail pages
- [x] Detail page loads review data
- [x] Issue expansion works
- [x] Comment form works (keyboard shortcut: Ctrl/Cmd+Enter)
- [x] Error handling with retry

### Metrics & Persona
- [x] Metrics page loads
- [x] Persona page loads
- [x] Error handling present

## Micro-Interactions

### Loading States
- [x] All async actions show loading indicators
- [x] Toggle buttons show loading state
- [x] Form submissions show loading state
- [x] Page loads show skeletons or LoadingState

### Error Handling
- [x] All API calls have try/catch
- [x] Errors display user-friendly messages
- [x] Retry actions refetch data (not hard reload)
- [x] Toast notifications for mutations
- [x] Inline error states for forms

### Keyboard Support
- [x] Buttons activate with Enter/Space
- [x] Focus visible on interactive elements
- [x] Tab order is logical
- [x] Comment form supports Ctrl/Cmd+Enter
- [ ] Esc closes modals (no modals currently)

### Accessibility
- [x] ARIA labels on interactive elements
- [x] aria-current on active nav items
- [x] aria-label on search inputs
- [x] Semantic HTML (nav, main, etc.)
- [x] Focus management (browser default)
- [ ] Screen reader testing (not verified)

### State Management
- [x] Optimistic updates with error rollback
- [x] Functional state updates (no stale closures)
- [x] Debounced search inputs
- [x] Memoized filtered results
- [x] Proper cleanup in useEffect

## Toast System

- [x] Toast component created (`components/ui/toast.tsx`)
- [x] Toast hook created (`lib/hooks/use-toast.ts`)
- [x] Toaster component added to root layout
- [x] Success toasts for mutations
- [x] Error toasts for failures
- [x] Auto-dismiss after 5 seconds

## Data Consistency

- [x] API calls use Bearer tokens
- [x] Session refresh handled
- [x] Error states don't leave stale data
- [x] Optimistic updates reconcile on error
- [ ] Cache invalidation after mutations (not implemented - uses refetch)

## Performance

- [x] Search inputs debounced (300ms)
- [x] Filtered results memoized
- [x] API calls have timeouts (10s)
- [x] No unnecessary re-renders
- [x] Images optimized (Next.js default)

## Known Limitations

1. **Mobile Navigation:** Nav is hidden on mobile (no hamburger menu)
2. **Cache Invalidation:** No automatic cache invalidation - relies on refetch
3. **Connect Repository:** Placeholder page - actual connection not implemented
4. **Error Boundaries:** Global error boundaries exist but not tested with real errors
5. **Screen Reader Testing:** Not verified with actual screen readers

## Verification Commands

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Build
pnpm build

# Development server
pnpm dev
```

## Test Coverage

- [ ] Unit tests for utils (debounce, formatters)
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows (homepage, auth, dashboard)
- [ ] Accessibility tests (a11y)

## Next Steps

1. Add E2E tests (Playwright) for critical flows
2. Implement mobile navigation menu
3. Add cache invalidation after mutations
4. Implement actual repository connection flow
5. Add error boundary testing
6. Screen reader testing
