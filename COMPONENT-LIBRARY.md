# ReadyLayer Component Library Documentation

A comprehensive guide to ReadyLayer's UI components, design system, and patterns.

---

## Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing System](#spacing-system)
4. [Components](#components)
5. [Motion System](#motion-system)
6. [Accessibility Guidelines](#accessibility-guidelines)

---

## Color System

### Semantic Tokens (Dark Mode Compatible)

All colors now use semantic tokens that automatically adapt to light/dark modes via CSS variables.

#### Status Colors
```typescript
// Success states
text-success      // Green for passed, completed, online
bg-success-muted  // Light green background

// Danger states
text-danger       // Red for failed, critical, blocked
bg-danger-muted   // Light red background

// Warning states
text-warning      // Orange/yellow for pending, caution
bg-warning-muted  // Light orange background

// Info states
text-info         // Blue for running, informational
bg-info-muted     // Light blue background

// Accent/Primary
text-accent       // Purple for highlights, interactive
bg-accent-muted   // Light purple background
```

#### Usage Pattern
```tsx
import { getSeverityColor, getStatusColor } from '@/lib/utils/color-mapping'

// For severity levels (critical, high, medium, low)
const colors = getSeverityColor('critical')
// Returns: { bg: 'bg-danger-muted', text: 'text-danger', border: 'border-danger/20', icon: 'text-danger' }

// For status types (success, failed, running, pending, blocked)
const colors = getStatusColor('failed')
// Returns: { bg: 'bg-danger-muted', text: 'text-danger', border: 'border-danger/20', icon: 'text-danger' }
```

### Deprecated Colors (Do Not Use)
```
❌ text-red-500, bg-red-500/10, text-green-600
❌ text-purple-500, text-blue-500, text-orange-600
❌ text-muted-foreground (use text-text-muted instead)
```

---

## Typography

### Heading Hierarchy

#### Page Titles (h1)
```tsx
<h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight leading-tight">
  Main page title
</h1>
```
- Mobile: 30px (text-3xl)
- Tablet: 36px (sm:text-4xl)
- Desktop: 48px (lg:text-6xl)

#### Section Titles (h2)
```tsx
<h2 className="text-2xl sm:text-3xl font-bold">Section title</h2>
```
- Mobile: 24px (text-2xl)
- Desktop: 30px (sm:text-3xl)

#### Subsection Titles (h3)
```tsx
<CardTitle className="text-xl font-semibold">Card title</CardTitle>
```
- Consistent: 20px (text-xl)

#### Body Text
```tsx
<p className="text-base sm:text-lg text-text-muted">Body paragraph</p>
```
- Mobile: 16px (text-base)
- Desktop: 18px (sm:text-lg)

#### Small/Caption
```tsx
<p className="text-xs sm:text-sm text-text-muted">Caption or metadata</p>
```

---

## Spacing System

### Consistent Padding & Margins (4px/8px Grid)

#### Container Padding
```tsx
// Standard container with responsive padding
<Container className="px-4 sm:px-6 lg:px-8 py-8">
  Content
</Container>
```

#### Card Components
```tsx
// Default: 24px padding (p-6)
<Card>
  <CardHeader padding="default">Header</CardHeader>
  <CardContent padding="default">Content</CardContent>
  <CardFooter padding="default">Footer</CardFooter>
</Card>

// Compact: 16px padding (p-4)
<Card>
  <CardHeader padding="compact">Compact Header</CardHeader>
  <CardContent padding="compact">Compact Content</CardContent>
</Card>

// None: 0 padding
<Card>
  <CardContent padding="none">No padding</CardContent>
</Card>
```

#### Grid Spacing
```tsx
// Responsive grid with consistent gap
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
  {/* Items automatically stack on mobile */}
</div>
```

#### Section Spacing
```tsx
// Vertical rhythm between sections
<div className="space-y-8">
  <Section>One</Section>
  <Section>Two</Section>
  <Section>Three</Section>
</div>
```

---

## Components

### Button Component

#### Sizes (WCAG 2.5.5 Compliant - 44px minimum)
```tsx
import { Button } from '@/components/ui/button'

// Default: 44px height (recommended for most buttons)
<Button>Click me</Button>

// Small: 40px height (for dense UIs)
<Button size="sm">Small button</Button>

// Large: 48px height (for CTAs)
<Button size="lg">Large CTA</Button>

// Icon button: 44×44px (guaranteed touch target)
<Button size="icon"><Icon /></Button>
```

#### Variants
```tsx
// Primary (default)
<Button variant="default">Primary action</Button>

// Secondary
<Button variant="secondary">Secondary</Button>

// Outline
<Button variant="outline">Outline style</Button>

// Ghost (minimal)
<Button variant="ghost">Ghost button</Button>

// Destructive
<Button variant="destructive">Delete</Button>
```

### IconButton Component

Guaranteed 44×44px touch target wrapper:
```tsx
import { IconButton } from '@/components/ui/icon-button'

<IconButton>
  <ChevronLeft className="h-5 w-5" />
</IconButton>
```

### Card Component

#### Structure
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader padding="default">
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent padding="default">
    Card content goes here
  </CardContent>
  <CardFooter padding="compact">
    Optional footer
  </CardFooter>
</Card>
```

#### Responsive Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

### Badge Component

#### Variants
```tsx
import { Badge } from '@/components/ui/badge'

// Default
<Badge>Default</Badge>

// Secondary
<Badge variant="secondary">Secondary</Badge>

// Outline
<Badge variant="outline">Outline</Badge>

// Success (green)
<Badge variant="success">Passed</Badge>

// Danger (red)
<Badge variant="danger">Failed</Badge>

// Info (blue)
<Badge variant="info">Running</Badge>
```

#### Semantic Color Usage
```tsx
import { getSeverityColor } from '@/lib/utils/color-mapping'

const colors = getSeverityColor('critical')
<Badge className={`${colors.bg} ${colors.text}`}>
  Critical Issue
</Badge>
```

### Container Component

Consistent horizontal padding and max-width:
```tsx
import { Container } from '@/components/ui/container'

// Large (max-w-6xl) - default
<Container size="lg" className="py-8">
  Content
</Container>

// Extra Large (max-w-7xl)
<Container size="xl">Wide content</Container>

// Medium (max-w-4xl)
<Container size="md">Medium width</Container>

// Small (max-w-2xl)
<Container size="sm">Narrow column</Container>

// Full width
<Container size="full">Full width</Container>
```

---

## Motion System

### Durations & Easing

#### Timing Tiers
```typescript
motionDurations = {
  micro: 0.15,      // Button feedback, quick interactions
  transition: 0.25, // Standard state changes
  page: 0.4,        // Page transitions, major changes
}

motionEasing = {
  standard: [0.4, 0.0, 0.2, 1],    // General purpose
  decelerate: [0.0, 0.0, 0.2, 1],  // Content reveal
  accelerate: [0.4, 0.0, 1, 1],    // Exit animations
  sharp: [0.4, 0.0, 0.6, 1],       // Precise movements
}
```

### Motion Variants

#### Fade In
```tsx
import { fadeIn } from '@/lib/design/motion'

<motion.div variants={fadeIn} initial="hidden" animate="visible">
  Content fades in smoothly
</motion.div>
```

#### Slide Up
```tsx
import { slideUp } from '@/lib/design/motion'

<motion.div variants={slideUp} initial="hidden" animate="visible">
  Content slides up from below
</motion.div>
```

#### Stagger Container (List Animations)
```tsx
import { staggerContainer, staggerItem } from '@/lib/design/motion'

<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  <motion.div variants={staggerItem}>Item 1</motion.div>
  <motion.div variants={staggerItem}>Item 2</motion.div>
  <motion.div variants={staggerItem}>Item 3</motion.div>
</motion.div>
```

#### Respect Reduced Motion
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

<motion.div 
  variants={prefersReducedMotion ? fadeIn : staggerContainer}
  initial="hidden" 
  animate="visible"
>
  Content respects user accessibility preferences
</motion.div>
```

---

## Accessibility Guidelines

### Touch Targets

✅ **All interactive elements must be at least 44×44px**

```tsx
// ✅ Correct
<Button size="default">Click me</Button>  // 44px height

// ✅ Correct (icon button)
<IconButton><ChevronLeft /></IconButton>  // 44×44px

// ❌ Incorrect
<button className="h-8 w-8">Too small</button>  // 32px - fails WCAG
```

### Color Contrast

✅ **All text must meet WCAG AA standards (4.5:1 for normal text)**

```tsx
// ✅ Correct - uses semantic tokens that respect dark mode
<div className="text-danger">Critical alert</div>

// ❌ Incorrect - hard-coded color may not contrast
<div className="text-red-500">Alert</div>
```

### Keyboard Navigation

✅ **All interactive elements must be keyboard accessible**

```tsx
// ✅ Correct - Button is inherently keyboard accessible
<Button onClick={handleClick}>Save</Button>

// ✅ Correct - Link is keyboard accessible
<a href="/dashboard">Go to dashboard</a>

// ❌ Incorrect - div is not keyboard accessible
<div onClick={handleClick}>Save</div>  // Add button or keyboard handler!
```

### Focus Indicators

✅ **All focusable elements must have visible focus rings**

```tsx
// ✅ Built into Button component
<Button>Focus ring appears on Tab</Button>

// ✅ For custom elements
<input className="focus:ring-2 focus:ring-accent focus:outline-none" />
```

### Labels and ARIA

✅ **Form fields must have associated labels**

```tsx
// ✅ Correct
<label htmlFor="email">Email address</label>
<input id="email" type="email" />

// ❌ Incorrect - no label
<input type="email" placeholder="Email" />
```

✅ **Icon-only buttons must have aria-labels**

```tsx
// ✅ Correct
<IconButton aria-label="Close dialog"><X /></IconButton>

// ❌ Incorrect - no aria-label
<IconButton><X /></IconButton>
```

### Dark Mode & High Contrast

✅ **Always test in light, dark, and high-contrast modes**

```tsx
// ✅ Correct - semantic token adapts automatically
<div className="text-danger">Danger message</div>

// Light mode: Red text on light background ✓
// Dark mode: Red text on dark background ✓
// High contrast: Bold red text with strong contrast ✓
```

### Motion Accessibility

✅ **Respect prefers-reduced-motion**

```tsx
// ✅ Correct
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

<motion.div 
  variants={prefersReducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : staggerContainer}
>
  Content respects accessibility preferences
</motion.div>
```

---

## Best Practices

### 1. Use Semantic Tokens
```tsx
// ✅ Do this
<div className="text-danger bg-danger-muted">Error message</div>

// ❌ Don't do this
<div className="text-red-500 bg-red-50">Error message</div>
```

### 2. Responsive First
```tsx
// ✅ Do this - mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// ❌ Don't do this - desktop-first
<div className="grid grid-cols-4 gap-4">
```

### 3. Consistent Spacing
```tsx
// ✅ Do this - use spacing utilities
<div className="space-y-6">
  <Item />
  <Item />
</div>

// ❌ Don't do this - ad-hoc margins
<div>
  <Item style={{ marginBottom: '24px' }} />
  <Item style={{ marginBottom: '20px' }} />
</div>
```

### 4. Accessible Motion
```tsx
// ✅ Do this
import { prefersReducedMotion } from '@/lib/design/motion'

const variants = prefersReducedMotion ? staticVariants : animatedVariants

// ❌ Don't do this
const variants = animatedVariants  // Ignores accessibility
```

### 5. Touch-Friendly
```tsx
// ✅ Do this - 44px minimum
<Button size="default">Click me</Button>

// ❌ Don't do this
<button className="h-8 w-8 p-1">Icon button</button>
```

---

## Migration Guide

### From Hard-Coded Colors to Semantic Tokens

```tsx
// Before (hard-coded, broken in dark mode)
const severityStyles = {
  critical: 'text-red-600 bg-red-500/10',
  high: 'text-orange-600 bg-orange-500/10',
}

// After (semantic, works everywhere)
import { getSeverityColor } from '@/lib/utils/color-mapping'

const Badge = ({ severity }) => {
  const colors = getSeverityColor(severity)
  return <div className={`${colors.text} ${colors.bg}`}>...</div>
}
```

### From Ad-Hoc Buttons to Button Component

```tsx
// Before (inconsistent sizing, no touch target guarantee)
<button className="text-xs px-3 py-1 rounded-md bg-accent">Play</button>

// After (consistent, accessible, WCAG compliant)
<Button size="sm">Play</Button>
```

### From Fixed Padding to Card Variants

```tsx
// Before (confusing, hard to maintain)
<Card>
  <CardHeader className="pb-3">Header</CardHeader>
  <CardContent className="p-0">Content</CardContent>
</Card>

// After (clear, intentional, consistent)
<Card>
  <CardHeader padding="default">Header</CardHeader>
  <CardContent padding="none">Content</CardContent>
</Card>
```

---

## File Structure

```
components/
├── ui/
│   ├── button.tsx          // Button component with sizes
│   ├── icon-button.tsx     // 44×44px icon wrapper
│   ├── card.tsx            // Card with padding variants
│   ├── container.tsx       // Responsive container
│   ├── badge.tsx           // Status badges
│   └── [other primitives]
├── dashboard/
│   ├── connection-status.tsx
│   └── [dashboard components]
└── landing/
    ├── HeroProof.tsx
    ├── CulturalArtifacts.tsx
    └── [landing components]

lib/
├── utils/
│   └── color-mapping.ts    // Semantic color functions
└── design/
    └── motion.ts           // Motion system

app/
├── globals.css             // CSS variables & theme tokens
└── [routes]
```

---

## Deployment Checklist

- [ ] All hard-coded colors migrated to semantic tokens
- [ ] All touch targets ≥ 44px
- [ ] All pages tested in light, dark, and high-contrast modes
- [ ] Color contrast verified (WCAG AA minimum 4.5:1)
- [ ] Keyboard navigation tested on all interactive elements
- [ ] Focus indicators visible on all focusable elements
- [ ] Motion respects prefers-reduced-motion
- [ ] Form labels properly associated with inputs
- [ ] Icon-only buttons have aria-labels
- [ ] Build passes with no console errors
- [ ] Visual regression testing passed

---

## Resources

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Framer Motion**: https://www.framer.com/motion/
- **Tailwind CSS**: https://tailwindcss.com/
- **Radix UI**: https://www.radix-ui.com/
- **Accessible Colors**: https://accessible-colors.com/

---

**Last Updated**: January 11, 2026  
**Component Library Version**: 1.0.0
