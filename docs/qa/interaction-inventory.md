# UI Interaction Inventory

**Generated:** 2024-12-19  
**Purpose:** Comprehensive catalog of all interactive components and user flows in ReadyLayer

## Marketing Site (Public Routes)

### Homepage (`/`)
- **Hero CTAs:**
  - GitHub sign-in button → `/auth/signin`
  - GitLab sign-in button → `/auth/signin`
  - Bitbucket sign-in button → `/auth/signin`
  - Google sign-in button → `/auth/signin`
  - "Go to Dashboard" button (when authenticated) → `/dashboard`
- **Feature Cards:**
  - "View Dashboard →" links (3x) → `/dashboard`
- **Navigation:**
  - None (landing page, no nav shown)

### Auth Pages

#### Sign In (`/auth/signin`)
- **Provider Buttons:**
  - GitHub → OAuth flow → `/auth/callback`
  - GitLab → OAuth flow → `/auth/callback`
  - Bitbucket → OAuth flow → `/auth/callback`
  - Google → OAuth flow → `/auth/callback`
- **Loading States:**
  - Per-provider loading spinner during OAuth redirect
- **Error Handling:**
  - ErrorState component for auth failures
- **Navigation:**
  - None (auth page, no nav shown)

#### Auth Callback (`/auth/callback`)
- **Auto-redirect:** After successful OAuth, redirects to `callbackUrl` or `/`
- **Error Handling:** Redirects to `/auth/signin?error=AuthError` on failure

#### Auth Error (`/auth/error`)
- **Error Display:** Shows auth error message
- **Navigation:** Link back to sign-in

## App Core (Protected Routes)

### Navigation (`components/layout/app-layout.tsx`)
- **Logo:** Link to `/dashboard`
- **Nav Links:**
  - Dashboard → `/dashboard`
  - Repositories → `/dashboard/repos`
  - Reviews → `/dashboard/reviews`
  - Metrics → `/dashboard/metrics`
- **User Actions:**
  - Theme toggle (light/dark/system)
  - Sign out button → `supabase.auth.signOut()` → redirect to `/`
  - Sign in button (when not authenticated) → `/auth/signin`
- **Mobile:** Hidden on mobile (needs mobile menu)

### Dashboard (`/dashboard`)
- **Stats Cards:** 4 metric cards (read-only)
- **Verification Banner:** Status display (read-only)
- **Repositories Section:**
  - "View all" link → `/dashboard/repos`
  - Repository cards → `/dashboard/repos/[repoId]`
  - Empty state → "Connect Repository" button (no action handler)
- **Reviews Section:**
  - "View all" link → `/dashboard/reviews`
  - Review cards → `/dashboard/reviews/[reviewId]`
  - Empty state (no action)
- **Loading:** LoadingState with skeletons
- **Error:** ErrorState with "Try Again" button

### Repositories List (`/dashboard/repos`)
- **Status:** Page not found (file missing)
- **Expected:**
  - List of repositories
  - Connect new repository button
  - Filter/search
  - Pagination

### Repository Detail (`/dashboard/repos/[repoId]`)
- **Header:**
  - Breadcrumb: Dashboard → repo name
  - Enable/Disable toggle button → PATCH `/api/v1/repos/[repoId]`
- **Status Banner:** Shows enabled/disabled state
- **Metrics Cards:** 4 read-only metrics
- **Configuration Card:**
  - Enable/Disable toggle → PATCH `/api/v1/repos/[repoId]`
  - Active rules display (read-only)
- **Recent Activity:**
  - "View All Reviews" link → `/dashboard/reviews?repositoryId=[repoId]`
- **Loading:** LoadingState
- **Error:** ErrorState with "Back to Dashboard" button

### Reviews List (`/dashboard/reviews`)
- **Search Input:** Filters by PR number or review ID
- **Filter Buttons:**
  - "All" → shows all reviews
  - "Blocked" → shows only blocked reviews
  - "Approved" → shows only approved reviews
- **Review Cards:**
  - Clickable → `/dashboard/reviews/[reviewId]`
  - Shows PR number, status, issue counts, timestamp
- **Empty State:** Message when no reviews match filters
- **Loading:** LoadingState
- **Error:** ErrorState with "Back to Dashboard" button

### Review Detail (`/dashboard/reviews/[reviewId]`)
- **Status:** Needs inspection
- **Expected:**
  - Review details
  - Issue list
  - PR link
  - Actions (approve/reject if applicable)

### Metrics (`/dashboard/metrics`)
- **Status:** Needs inspection
- **Expected:**
  - Charts/graphs
  - Time range filters
  - Export options

### Persona (`/dashboard/persona`)
- **Status:** Needs inspection
- **Expected:**
  - Persona detection/selection
  - Configuration

## API Routes

### Health (`/api/health`)
- **Public:** Yes
- **Method:** GET
- **Purpose:** Health check

### Ready (`/api/ready`)
- **Public:** Yes
- **Method:** GET
- **Purpose:** Readiness check

### Repositories (`/api/v1/repos`)
- **Protected:** Yes (Bearer token or session)
- **Methods:**
  - GET: List repositories
  - POST: Create repository (expected)

### Repository Detail (`/api/v1/repos/[repoId]`)
- **Protected:** Yes
- **Methods:**
  - GET: Get repository
  - PATCH: Update repository (used by toggle enable/disable)
  - DELETE: Delete repository (expected)

### Reviews (`/api/v1/reviews`)
- **Protected:** Yes
- **Methods:**
  - GET: List reviews (supports `repositoryId` filter, `limit`)

### Review Detail (`/api/v1/reviews/[reviewId]`)
- **Protected:** Yes
- **Methods:**
  - GET: Get review details

## UI Components

### Button (`components/ui/button.tsx`)
- **Variants:** default, destructive, outline, secondary, ghost, link
- **Sizes:** default, sm, lg, icon
- **States:** disabled, loading (via children)
- **Keyboard:** Focus-visible ring, Enter/Space activation
- **Accessibility:** ARIA labels via props

### Card (`components/ui/card.tsx`)
- **Variants:** Standard card with header/content/footer
- **Interactive:** Not directly interactive (container)

### LoadingState (`components/ui/loading.tsx`)
- **Purpose:** Full-page loading indicator
- **Props:** message

### ErrorState (`components/ui/error-state.tsx`)
- **Purpose:** Error display with optional action
- **Props:** message, action (label + onClick)

### EmptyState (`components/ui/empty-state.tsx`)
- **Purpose:** Empty list/state display
- **Props:** icon, title, description, action (optional)

### ThemeToggle (`components/ui/theme-toggle.tsx`)
- **States:** light, dark, system
- **Keyboard:** Accessible button
- **Hydration:** Handles SSR mismatch

### Toast (`components/ui/toast.tsx`)
- **Status:** Not found (Radix Toast imported but no wrapper)
- **Expected:** Toast notifications for success/error

## State Management

### Auth State
- **Client:** `createSupabaseClient()` → `supabase.auth.getUser()`
- **Server:** `createSupabaseServerClient()` → `supabase.auth.getUser()`
- **Middleware:** `getEdgeAuthUser()` for route protection
- **Session Refresh:** Via `onAuthStateChange` subscription

### Data Fetching
- **Pattern:** Direct `fetch()` calls with Bearer token
- **No React Query/SWR:** Custom hooks not observed
- **Error Handling:** Try/catch with ErrorState component
- **Loading States:** useState for loading flags

## Known Issues (Initial Scan)

1. **Missing Pages:**
   - `/dashboard/repos` (list page not found)
   - Toast component wrapper missing

2. **Missing Actions:**
   - "Connect Repository" button on dashboard has no onClick handler
   - No "Create Repository" flow visible

3. **Error Handling:**
   - Some API calls silently fail (reviews fetch on dashboard)
   - No global error boundary for API failures
   - No retry logic for failed requests

4. **Loading States:**
   - Toggle enable/disable has no loading state (optimistic update only)
   - Search/filter in reviews has no debounce

5. **Accessibility:**
   - Mobile navigation missing
   - Some buttons missing aria-labels
   - Focus management in modals (if any) not verified

6. **State Consistency:**
   - Toggle enable/disable uses optimistic update but may not reconcile on error
   - No cache invalidation after mutations

7. **Route Protection:**
   - Middleware protects routes but client-side also checks auth
   - Potential for flash of protected content before redirect
