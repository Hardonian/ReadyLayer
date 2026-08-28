# ReadyLayer Frontend Hot Path Scoreboard

## DELIVERABLE A: Frontend Hot Path Candidate List

### Top Routes by User Importance (Ranked)

| Rank | Route | Type | User Impact | Render Mode | Notes |
|------|-------|------|-------------|-------------|-------|
| 1 | `/` (Homepage) | Public | High - First impression, SEO | SSR + Client Hydration | 6 dynamic imports, heavy landing page |
| 2 | `/dashboard` | App (Auth) | High - Primary user destination | CSR (Heavy) | Multiple API calls, framer-motion animations |
| 3 | `/open-source` | Public | Medium - Conversion page | SSR + Client Hydration | Marketing content |
| 4 | `/dashboard/repos` | App (Auth) | Medium - Core feature | CSR | Repository list, pagination |
| 5 | `/dashboard/policies` | App (Auth) | Medium - Core feature | CSR | Policy management UI |
| 6 | `/enterprise` | Public | Medium - Sales conversion | SSR + Client Hydration | Pricing/enterprise info |

### Above-the-Fold Content Inventory

#### Route: `/` (Homepage)
- **HeroProof**: Logo, headline, CTA, social proof - CRITICAL (LCP element)
- **PipelineStrip**: Visual pipeline illustration - SECONDARY
- **ProofGrid**: Feature grid with icons - BELOW FOLD
- **TrustSection**: Logos/trust signals - BELOW FOLD
- **ValueDrivers**: Value props - BELOW FOLD
- **CulturalArtifacts**: Additional content - BELOW FOLD

#### Route: `/dashboard`
- **Stats Cards (4)**: Total repos, active repos, total reviews, issues caught - CRITICAL
- **Usage Limit Banner**: Critical for user awareness - CRITICAL
- **Repositories List**: Top 10 repos - SECONDARY
- **Recent Reviews**: Top 10 reviews - SECONDARY
- **AI Optimization Insights**: Collapsible section - BELOW FOLD

### Render Mode Analysis

| Route | Strategy | Hydration Cost | Notes |
|-------|----------|----------------|-------|
| `/` | SSR + Partial Hydration | Medium | 6 dynamic imports with loading states |
| `/dashboard` | Full CSR | High | All data fetched client-side, heavy React state |
| Public pages | SSR + Hydration | Low-Medium | Mostly static content |
| `/dashboard/*` | CSR | High | All dashboard routes use client-side data fetching |

---

## DELIVERABLE B: Baseline Measurements

### Commands to Run (for reproducibility)

```bash
# Build production
npm run build

# Start production server
npm start

# In another terminal, run Lighthouse CI
npx lighthouse http://localhost:3000 --output=json --output-path=./perf/homepage-mobile.json --preset=desktop --chrome-flags="--headless"
npx lighthouse http://localhost:3000 --output=json --output-path=./perf/homepage-mobile.json --preset=mobile --chrome-flags="--headless"

# For authenticated routes, use Chrome DevTools skill:
# See chrome-devtools/scripts/performance.js
```

### Web Vitals Baseline (To be measured)

| Route | LCP | INP | CLS | TTFB | JS Bytes | CSS Bytes | Image Bytes |
|-------|-----|-----|-----|------|----------|-----------|-------------|
| `/` (Mobile) | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/` (Desktop) | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `/dashboard` | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

### Critical Issues Identified from Code Review

#### Issue 1: Homepage Excessive Dynamic Imports
**Location**: `app/(public)/page.tsx`
**Evidence**: 6 dynamic imports with loading placeholders
```typescript
const PipelineStrip = dynamic(() => import('@/components/landing').then(...))
const ProofGrid = dynamic(...)  // etc.
```
**Impact**:
- Multiple chunk downloads
- Waterfall loading pattern
- Skeleton flash during hydration
**Weight**: High (affects LCP, CLS, and perceived performance)

#### Issue 2: Dashboard Heavy Client-Side Fetching
**Location**: `app/(app)/dashboard/page.tsx`
**Evidence**:
- 4 parallel API calls on mount (`/api/v1/repos`, `/api/v1/reviews`, `/api/v1/usage`, etc.)
- No server-side prefetching
- All data fetched after hydration
**Impact**:
- Loading spinner visible for extended period
- Multiple network round trips
- Poor Time to Interactive
**Weight**: Critical (primary user destination)

#### Issue 3: No Image Preloading for LCP Element
**Location**: `app/layout.tsx`
**Evidence**:
- Multiple favicon/icon links but no preload for hero image
- Logo is likely LCP element on homepage
**Impact**: LCP delay
**Weight**: High (directly affects LCP metric)

#### Issue 4: Large Static Images Without Optimization
**Location**: `public/`
**Evidence**:
- `logo-header.png`: 385KB (should be WebP/AVIF)
- `logo-seo.png`: 231KB
- `icon-512x512.png`: 434KB
**Impact**: Large network payload, slower LCP
**Weight**: Medium

#### Issue 5: Heavy Animation Library (framer-motion)
**Location**: Throughout dashboard components
**Evidence**:
- Used extensively in dashboard page
- Adds ~40KB gzipped to bundle
**Impact**: Main thread blocking, slower INP
**Weight**: Medium

---

## DELIVERABLE C: UI Hot Path Scoreboard (Ranked Issues)

| Rank | Issue | Score | Evidence | Root Cause |
|------|-------|-------|----------|------------|
| **1** | Dashboard CSR Data Waterfall | 28 | 4 API calls on mount, no prefetch | Missing server-side data fetching |
| **2** | Homepage Dynamic Import Cascade | 24 | 6 dynamic imports with waterfalls | Over-eager code splitting |
| **3** | No LCP Image Preload | 21 | Hero logo not preloaded | Missing `<link rel="preload">` |
| 4 | Large Unoptimized Images | 18 | PNGs instead of WebP/AVIF | Missing modern formats |
| 5 | Framer-motion Bundle Cost | 15 | Used heavily in dashboard | Animation library overhead |
| 6 | Layout Loading Flash | 12 | Skeleton mismatches cause CLS | Poor loading state design |

**Scoring Formula**: (LCP weight 3 + INP weight 3 + CLS weight 2 + Bytes weight 2)

### Top 3 Issues Selected for Patching

1. **Issue #1**: Dashboard CSR Data Waterfall → Implement server-side data fetching
2. **Issue #2**: Homepage Dynamic Import Cascade → Consolidate critical path imports
3. **Issue #3**: No LCP Image Preload → Add preload for hero/logo images

---

## DELIVERABLE D: Patch Playbook

### Patch A: Dashboard Data Waterfall (Issue #1)
**Hypothesis**: Moving data fetching to server-side will eliminate loading states and reduce TTI.

**Baseline to Beat**:
- Current: 4 sequential API calls after hydration
- Target: Data available at render time

**Implementation**:
1. Convert dashboard page to async server component
2. Fetch data server-side with Supabase service role
3. Pass data as props to client components
4. Keep client interactivity for real-time updates

**Files to Change**:
- `app/(app)/dashboard/page.tsx` - Convert to server component
- Create `app/(app)/dashboard/dashboard-client.tsx` - Client wrapper for interactivity
- `lib/supabase/server.ts` - Ensure server client is available

**Guardrails**:
- Feature flag: `DASHBOARD_SSR_ENABLED`
- Fallback to CSR if server fetch fails
- Maintain real-time updates via useEffect polling

### Patch B: Homepage Dynamic Import Optimization (Issue #2)
**Hypothesis**: Consolidating above-fold imports will reduce waterfall and improve LCP.

**Baseline to Beat**:
- Current: 6 separate dynamic imports
- Target: Hero + first 2 sections loaded synchronously

**Implementation**:
1. Synchronously import HeroProof and PipelineStrip
2. Keep below-fold sections dynamic (ProofGrid, TrustSection, etc.)
3. Add priority loading for hero images

**Files to Change**:
- `app/(public)/page.tsx` - Reorganize imports
- `components/landing/HeroProof.tsx` - Add priority image loading

**Guardrails**:
- Maintain skeleton fallbacks for below-fold
- Verify no layout shift after change

### Patch C: LCP Image Preload (Issue #3)
**Hypothesis**: Preloading hero/logo images will reduce LCP by 200-500ms.

**Baseline to Beat**:
- Current: No preload hints for images
- Target: LCP image discovered in `<head>`

**Implementation**:
1. Add `<link rel="preload">` for critical images in layout
2. Convert logo-header.png to WebP with fallback
3. Add `priority` prop to Next.js Image components

**Files to Change**:
- `app/layout.tsx` - Add preload links
- `app/(public)/layout.tsx` - Add image preloads
- `components/landing/HeroProof.tsx` - Add priority loading
- `public/logo-header.webp` - Already exists, verify usage

**Guardrails**:
- Don't preload too many images (max 2-3)
- Maintain PNG fallback for old browsers
- Verify no console warnings

---

## DELIVERABLE E: After Measurements

(To be completed after patches)

| Metric | Before | After | Delta | % Change |
|--------|--------|-------|-------|----------|
| LCP | - | - | - | - |
| INP | - | - | - | - |
| CLS | - | - | - | - |
| TTFB | - | - | - | - |
| JS Bytes | - | - | - | - |
| CSS Bytes | - | - | - | - |
| Image Bytes | - | - | - | - |

---

## DELIVERABLE F: Verification Steps

```bash
# 1. Build verification
npm run build

# 2. Type check
npm run type-check

# 3. Lint check
npm run lint

# 4. Visual regression (if available)
npm run test:visual

# 5. E2E smoke tests
npm run test:e2e:headed -- --grep "dashboard"

# 6. Lighthouse CI
npx lighthouse http://localhost:3000 --preset=desktop
npx lighthouse http://localhost:3000 --preset=mobile
```

---

## Next 3 UI Hot Path Candidates

1. **`/dashboard/repos`** - Repository list page with pagination
   - Likely issues: Large lists, no virtualization, heavy table rendering

2. **`/open-source`** - Marketing page for open source
   - Likely issues: Similar to homepage, dynamic content loading

3. **`/dashboard/policies`** - Policy management interface
   - Likely issues: Complex forms, heavy client-side state
