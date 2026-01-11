# Phase 2 & 3: Spacing Normalization, Mobile Optimization & Accessibility Polish

## Phase 2: Spacing Normalization (In Progress)

### 2.1 Card Padding Normalization ✅ COMPLETED

**Status:** Card components now support padding variants

**Implementation:**
- Added padding prop to CardHeader, CardContent, CardFooter
- Options: 'default' (p-6), 'compact' (p-4), 'none' (p-0)
- Backward compatible - defaults to 'default' padding

**Example Usage:**
```tsx
<Card>
  <CardHeader padding="compact">
    <CardTitle>Compact Header</CardTitle>
  </CardHeader>
  <CardContent padding="compact">
    Content with reduced padding
  </CardContent>
</Card>
```

### 2.2 Container & Gutter Normalization (TODO)

**Tasks:**
1. Verify `components/ui/container.tsx` sizing is consistent across breakpoints
2. Document spacing scale for components:
   - Large surfaces (pages): p-8 / p-6 lg:p-8
   - Medium surfaces (cards): p-6
   - Small surfaces (panels): p-4
   - Compact surfaces: p-3

3. Audit all dashboard pages for spacing consistency
4. Ensure vertical rhythm (4px or 8px baseline grid)

**Files to Review:**
- `components/ui/container.tsx`
- All dashboard pages (10+ pages)
- Landing page components

### 2.3 Component Spacing Audit (TODO)

**Components to Normalize:**
- Input/form fields spacing
- Badge/pill padding consistency
- Button spacing (already updated)
- List item spacing
- Table cell padding

### 2.4 Responsive Spacing (TODO)

**Mobile-First Audit:**
- Verify grid collapses on mobile (grid-cols-1 md:grid-cols-X)
- Check padding adjustments for small screens
- Ensure max-widths don't overflow on 375px devices
- Test touch target spacing (min 8px between elements)

---

## Phase 3: Mobile Optimization & Accessibility Polish

### 3.1 Mobile Responsiveness Refinement (TODO)

**Target Breakpoints:**
- xs: 0px (mobile first)
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

**Pages to Audit:**
1. Landing/Home (app/page.tsx)
   - Hero section text sizing on mobile
   - Interactive demo responsive behavior
   - Button sizing and spacing

2. Dashboard Pages
   - Stats grid collapse (4 cols → 2 cols → 1 col)
   - Card layouts
   - Table responsiveness (if present)

3. Auth Pages (signin/signout)
   - Form sizing and spacing
   - Hero background on mobile

**Specific Checks:**
- [ ] All headings fit without wrapping on 375px
- [ ] Buttons are touch-friendly (min 44px × 44px)
- [ ] No horizontal scroll
- [ ] Forms are single-column on mobile
- [ ] Images scale appropriately
- [ ] Navigation is mobile-optimized

### 3.2 Form Field Accessibility (TODO)

**Audit Checklist:**
- [ ] All inputs have associated labels
- [ ] Labels use htmlFor/id association
- [ ] Placeholder is not the only label
- [ ] Error messages are associated with fields (aria-describedby)
- [ ] Focus states are visible
- [ ] Required fields are marked
- [ ] Form submission feedback is clear

**Files to Review:**
- All pages with forms (signin, policies, waivers, etc.)
- Form components

### 3.3 Keyboard Navigation Polish (TODO)

**Tests Required:**
- [ ] Tab through all pages in logical order
- [ ] All interactive elements are focusable
- [ ] Focus indicator is always visible
- [ ] No keyboard traps
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys work in menus

### 3.4 Screen Reader Testing (TODO)

**Testing Tools:**
- MacOS: VoiceOver (Cmd+F5)
- Windows: NVDA (free) or JAWS
- iOS: VoiceOver (Settings > Accessibility)
- Android: TalkBack (Settings > Accessibility)

**Pages to Test:**
1. Homepage
2. Dashboard
3. Findings/Issues pages
4. Settings pages

### 3.5 Dark Mode & High Contrast Verification (TODO)

**Testing:**
- [ ] Light mode: all colors readable
- [ ] Dark mode: all colors readable
- [ ] High Contrast mode (.hc class): all elements visible
- [ ] All status colors work in all themes
- [ ] Badges visible and readable in all themes

**Automated Testing:**
```bash
# Add to CI/CD
npm install --save-dev @axe-core/playwright
```

### 3.6 Visual Polish & Final Refinements (TODO)

**Tasks:**
1. **Hover/Focus States:**
   - Verify all interactive elements have consistent hover feedback
   - Ensure focus rings are visible but not jarring
   - Test transitions are smooth and not too fast

2. **Loading States:**
   - Spinner animations are smooth
   - Loading skeletons match component sizes
   - Disabled states are clear

3. **Error/Empty States:**
   - Error messages are clear and actionable
   - Empty states have helpful CTAs
   - Form validation is clear

4. **Animations/Transitions:**
   - Page transitions are smooth (350ms)
   - Component animations respect prefers-reduced-motion
   - No jank or layout shift

---

## Implementation Order

### Recommended Sequence:
1. ✅ **Phase 1 (Critical)** - Mostly complete
   - Color tokens: DONE
   - Touch targets: DONE
   - Remaining: Additional color migrations + testing setup

2. **Phase 2 (High Priority)** - Ready to start
   - Card padding: DONE
   - Container/gutter audit: NEXT
   - Responsive spacing: FOLLOW

3. **Phase 3 (Polish)** - Ready after Phase 2
   - Mobile responsiveness: CRITICAL
   - Form accessibility: HIGH
   - Keyboard/SR testing: HIGH
   - Final polish: LAST

---

## Success Criteria

### Phase 2 Complete When:
- [ ] All dashboard pages use consistent padding
- [ ] Card variants are used throughout the app
- [ ] No visual spacing inconsistencies
- [ ] Vertical rhythm is maintained (4px/8px grid)

### Phase 3 Complete When:
- [ ] All pages responsive at 375px, 768px, 1024px
- [ ] Touch targets all 44px minimum
- [ ] WCAG AA contrast compliance (4.5:1 text)
- [ ] Keyboard navigation works throughout
- [ ] Screen reader testing passes
- [ ] No layout shifts or jank
- [ ] Dark mode/HC fully tested

---

## Testing Checklist

### Before Phase 2/3 Completion:
- [ ] Desktop visual scan (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Tablet testing (iPad)
- [ ] Dark mode testing
- [ ] High contrast mode testing
- [ ] Keyboard navigation (Tab/Shift+Tab/Enter/Escape)
- [ ] Screen reader test (VoiceOver/NVDA)
- [ ] Build verification (`npm run build`)
- [ ] No console errors or warnings
- [ ] Performance metrics (Lighthouse)

### Deploy Verification:
- [ ] Changes reflected on live site
- [ ] All links functional
- [ ] Forms submitting correctly
- [ ] Navigation working on all pages
- [ ] No 404 errors

---

## Files for Phase 2 & 3

### Already Updated:
- `components/ui/card.tsx` - padding variants ready
- `components/ui/button.tsx` - touch sizes finalized
- `components/ui/icon-button.tsx` - new wrapper created
- `lib/utils/color-mapping.ts` - color functions ready

### Remaining Updates Needed:
- `app/dashboard/page.tsx` - additional color migrations
- `app/dashboard/live/page.tsx` - color migrations (8+ instances)
- `app/dashboard/runs/[runId]/page.tsx` - color migrations (8+ instances)  
- `components/landing/*.tsx` - responsive updates + color fixes
- Form components - accessibility improvements
- All dashboard pages - spacing audit + updates

---

## Quick Start Commands

```bash
# Verify changes compile
npm run build

# Run linting
npm run lint

# Type check
npm run type-check

# Run tests (if available)
npm run test

# Preview changes locally
npm run dev
```

---

## Notes

- All Phase 1 color migrations use `lib/utils/color-mapping.ts`
- Button sizes now meet WCAG 2.5.5 (44px minimum)
- Card padding can be customized per instance
- Dark mode support is automatic (uses CSS variables)
- All changes are backward compatible
