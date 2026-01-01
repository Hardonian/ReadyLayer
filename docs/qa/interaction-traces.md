# Interaction Traces & Issue Analysis

**Generated:** 2024-12-19  
**Purpose:** Detailed execution traces for all user flows with identified issues

## Flow A: Marketing Site - Homepage

### Flow: Anonymous User Visits Homepage
1. **Trigger:** GET `/`
2. **Middleware:** Public route → allowed through
3. **Component:** `app/page.tsx` (client component)
4. **State:** `useState` for user, loading
5. **Auth Check:** `useEffect` → `supabase.auth.getUser()`
6. **UI Render:**
   - If loading: `<LoadingState />`
   - If no user: Show sign-in buttons (GitHub, GitLab, Bitbucket, Google)
   - If user: Show "Go to Dashboard" button
7. **Issues Found:**
   - ✅ No 500 errors observed
   - ⚠️ Auth check happens client-side (potential flash)
   - ⚠️ No error handling if Supabase client creation fails
   - ⚠️ Feature cards "View Dashboard" links work but no loading state on navigation

### Flow: User Clicks Sign-In Button
1. **Trigger:** Click GitHub/GitLab/Bitbucket/Google button
2. **Action:** Link to `/auth/signin` (not direct OAuth)
3. **Navigation:** Client-side navigation via Next.js Link
4. **Issues Found:**
   - ✅ Links work correctly
   - ⚠️ No loading state during navigation

## Flow B: Authentication

### Flow: Sign-In Page Load
1. **Trigger:** GET `/auth/signin`
2. **Middleware:** Public route → allowed through
3. **Component:** `app/auth/signin/page.tsx`
4. **State:** `useState` for loading (per provider), error
5. **UI:** Provider buttons with loading states
6. **Issues Found:**
   - ✅ Loading states per provider
   - ✅ Error handling with ErrorState
   - ⚠️ SearchParams wrapped in Suspense (good, but fallback is generic)

### Flow: OAuth Sign-In
1. **Trigger:** Click provider button (e.g., GitHub)
2. **Action:** `handleSignIn('github')`
3. **State Update:** `setLoading('github')`, `setError(null)`
4. **API Call:** `supabase.auth.signInWithOAuth({ provider: 'github', redirectTo: '/auth/callback?redirect=...' })`
5. **Redirect:** Browser redirects to OAuth provider
6. **Callback:** OAuth provider redirects to `/auth/callback?code=...&redirect=...`
7. **Issues Found:**
   - ✅ Loading state prevents double-click
   - ✅ Error handling with ErrorState
   - ⚠️ No timeout handling (OAuth redirect could hang)
   - ⚠️ Error state doesn't clear on retry

### Flow: Auth Callback
1. **Trigger:** GET `/auth/callback?code=...&redirect=...`
2. **Middleware:** Public route → allowed through
3. **Route Handler:** `app/auth/callback/route.ts`
4. **Action:** `supabase.auth.exchangeCodeForSession(code)`
5. **Success:** Redirect to `redirect` param or `/`
6. **Failure:** Redirect to `/auth/signin?error=AuthError`
7. **Issues Found:**
   - ✅ Error handling with logger
   - ✅ Graceful fallback to sign-in
   - ⚠️ No user-visible error message (just query param)
   - ⚠️ Error page doesn't parse query param to show message

### Flow: Sign-Out
1. **Trigger:** Click sign-out button in nav
2. **Action:** `handleSignOut()` → `supabase.auth.signOut()`
3. **Redirect:** `window.location.href = '/'`
4. **Issues Found:**
   - ✅ Sign-out works
   - ⚠️ Hard redirect (loses client state, but acceptable)
   - ⚠️ No loading state during sign-out

## Flow C: App Core - Dashboard

### Flow: Dashboard Load (Authenticated)
1. **Trigger:** GET `/dashboard`
2. **Middleware:** Protected route → checks auth → allows through
3. **Component:** `app/dashboard/page.tsx` (client component)
4. **State:** Multiple `useState` hooks (repos, reviews, stats, verification, loading, error)
5. **Auth Check:** Client-side `supabase.auth.getSession()`
6. **API Calls:**
   - GET `/api/v1/repos?limit=10` (with Bearer token)
   - GET `/api/v1/reviews?limit=10` (with Bearer token)
7. **State Updates:**
   - Set repos, reviews, stats, verification
   - Set loading false
8. **UI Render:** Stats cards, repo list, review list
9. **Issues Found:**
   - ✅ Loading state with skeletons
   - ✅ Error state with retry
   - ⚠️ Reviews fetch silently fails (try/catch swallows error)
   - ⚠️ No timeout handling (10s timeout set but not caught properly)
   - ⚠️ "Connect Repository" button has no onClick handler
   - ⚠️ No cache invalidation after mutations elsewhere

### Flow: Repository Toggle Enable/Disable
1. **Trigger:** Click toggle button on `/dashboard/repos/[repoId]`
2. **Action:** `handleToggleEnabled()`
3. **Optimistic Update:** `setEnabled(!enabled)` immediately
4. **API Call:** PATCH `/api/v1/repos/[repoId]` with `{ enabled: !enabled }`
5. **Success:** State remains updated
6. **Failure:** Revert state (`setEnabled(enabled)`)
7. **Issues Found:**
   - ✅ Optimistic update
   - ✅ Error revert
   - ❌ **P0: No loading state** - Button doesn't show loading, can be clicked multiple times
   - ❌ **P0: No user feedback** - No toast/notification on success/failure
   - ⚠️ Error revert uses stale closure (should use functional update)

### Flow: Reviews List with Filters
1. **Trigger:** GET `/dashboard/reviews`
2. **Component:** `app/dashboard/reviews/page.tsx`
3. **State:** reviews, loading, error, searchQuery, filterStatus
4. **API Call:** GET `/api/v1/reviews?limit=50`
5. **Filtering:** Client-side filter by searchQuery and filterStatus
6. **Issues Found:**
   - ✅ Search input works
   - ✅ Filter buttons work
   - ⚠️ **P1: No debounce** - Search triggers on every keystroke (performance issue)
   - ⚠️ **P1: No loading state for filters** - Instant but could show loading if API refetch needed
   - ⚠️ Empty state message is generic

## Flow D: Navigation

### Flow: Nav Link Click
1. **Trigger:** Click nav link (e.g., "Repositories")
2. **Action:** Next.js Link navigation
3. **Issues Found:**
   - ✅ Links work
   - ⚠️ No loading indicator during route transition
   - ⚠️ Active state uses pathname match (works correctly)

### Flow: Theme Toggle
1. **Trigger:** Click theme toggle button
2. **Action:** `toggleTheme()` → cycles system → light → dark → system
3. **State:** `next-themes` manages theme
4. **Issues Found:**
   - ✅ Handles hydration mismatch
   - ✅ Accessible button
   - ✅ Icon updates correctly
   - ⚠️ No visual feedback during transition (acceptable, instant)

## Flow E: Error Handling

### Flow: API Error on Dashboard
1. **Trigger:** API call fails (network error, 401, 500, etc.)
2. **Catch:** Try/catch in `fetchDashboardData()`
3. **State:** `setError(err.message)`
4. **UI:** `<ErrorState message={error} action={{ label: 'Try Again', onClick: () => window.location.reload() }} />`
5. **Issues Found:**
   - ✅ Error caught and displayed
   - ✅ Retry action available
   - ⚠️ **P1: Hard reload** - `window.location.reload()` loses all state (should refetch)
   - ⚠️ No error boundary for unhandled errors

### Flow: Middleware Error
1. **Trigger:** Middleware throws error
2. **Handler:** `handleMiddlewareError()` catches and logs
3. **Response:** 
   - API routes → 500 JSON
   - Page routes → Redirect to sign-in
   - Public routes → Allow through
4. **Issues Found:**
   - ✅ Never throws uncaught errors
   - ✅ Graceful degradation
   - ⚠️ Error logging may fail (has fallback to console)

## Flow F: Missing Pages/Features

### Flow: Repositories List Page
1. **Expected:** GET `/dashboard/repos`
2. **Reality:** File not found (`app/dashboard/repos/page.tsx` missing)
3. **Impact:** 404 when clicking "Repositories" nav link
4. **Issues Found:**
   - ❌ **P0: Missing page** - Causes 404

### Flow: Connect Repository
1. **Expected:** Button on dashboard empty state
2. **Reality:** Button exists but `onClick={() => {}}` (no-op)
3. **Impact:** Button does nothing
4. **Issues Found:**
   - ❌ **P0: Broken CTA** - Core feature inaccessible

## Prioritized Issue List

### P0 - Critical (Causes 500s, Broken Core CTAs, Missing Pages)
1. **Missing `/dashboard/repos` page** - 404 on nav click
   - File: `app/dashboard/repos/page.tsx` missing
   - Impact: Broken navigation

2. **"Connect Repository" button has no action**
   - File: `app/dashboard/page.tsx` line 377
   - Impact: Cannot connect repositories

3. **Toggle enable/disable has no loading state**
   - File: `app/dashboard/repos/[repoId]/page.tsx` line 132-157
   - Impact: Double-submit possible, no user feedback

4. **No toast/notification system**
   - Missing: Toast component wrapper
   - Impact: No success/error feedback for mutations

### P1 - Broken UX (Silent Failures, Missing Feedback)
1. **Reviews fetch silently fails on dashboard**
   - File: `app/dashboard/page.tsx` line 128-144
   - Impact: Missing reviews without user knowing

2. **Search input has no debounce**
   - File: `app/dashboard/reviews/page.tsx` line 144
   - Impact: Performance issue, unnecessary re-renders

3. **Error retry uses hard reload**
   - File: `app/dashboard/page.tsx` line 209
   - Impact: Loses all state, poor UX

4. **Toggle error revert uses stale closure**
   - File: `app/dashboard/repos/[repoId]/page.tsx` line 151, 155
   - Impact: May not revert correctly

### P2 - Polish (Accessibility, Performance, Edge Cases)
1. **No mobile navigation menu**
   - File: `components/layout/app-layout.tsx`
   - Impact: Mobile users can't navigate

2. **No loading indicator on route transitions**
   - Impact: No feedback during navigation

3. **No error boundary for unhandled errors**
   - Impact: Unhandled errors show blank screen

4. **No cache invalidation after mutations**
   - Impact: Stale data after updates

5. **No timeout handling for OAuth**
   - File: `app/auth/signin/page.tsx`
   - Impact: OAuth could hang indefinitely

6. **Auth error page doesn't show error message**
   - File: `app/auth/error/page.tsx` (needs inspection)
   - Impact: User doesn't know why auth failed

## Root Causes

1. **Missing Pages:** Incomplete implementation - repos list page not created
2. **No Action Handlers:** Placeholder buttons not wired up
3. **No Loading States:** Optimistic updates without loading indicators
4. **No Toast System:** Radix Toast imported but no wrapper/context
5. **Silent Failures:** Try/catch swallows errors without user feedback
6. **No Debounce:** Search implemented without performance optimization
7. **Hard Reloads:** Error recovery uses page reload instead of refetch
8. **Stale Closures:** State updates use stale values instead of functional updates
