# Accessibility & Theming Verification Guide

This document outlines accessibility requirements and verification steps for the ReadyLayer theming system.

## Core Principles

1. **Semantic Tokens Only**: Components must use semantic tokens, never hardcoded colors
2. **WCAG AA Contrast**: All text/surface pairs meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
3. **Keyboard Navigation**: All interactive elements are keyboard accessible
4. **Focus Visibility**: Focus indicators are always visible and not dependent on color alone
5. **Reduced Motion**: Animations respect `prefers-reduced-motion`
6. **Theme Parity**: Dark mode is separately tuned, not inverted light mode

## Token Contrast Verification

### Text on Surface Pairs (WCAG AA)

| Token Pair | Light Mode | Dark Mode | Status |
|------------|------------|-----------|--------|
| `text-primary` on `surface` | 16.8:1 | 15.2:1 | ✅ Pass |
| `text-muted` on `surface` | 4.8:1 | 4.6:1 | ✅ Pass |
| `text-subtle` on `surface` | 3.2:1 | 3.1:1 | ⚠️ Large text only |
| `accent-foreground` on `accent` | 4.7:1 | 4.9:1 | ✅ Pass |
| `success-foreground` on `success` | 4.6:1 | 4.8:1 | ✅ Pass |
| `danger-foreground` on `danger` | 4.5:1 | 4.7:1 | ✅ Pass |

### Verification Commands

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build and verify no warnings
npm run build
```

## Manual Verification Checklist

### Theme Switching
- [ ] Theme toggle cycles through light/dark/system correctly
- [ ] No flash of wrong theme on page load
- [ ] Theme preference persists across page reloads
- [ ] System preference is detected correctly

### Focus States
- [ ] All buttons show visible focus ring
- [ ] Focus ring is visible in both light and dark modes
- [ ] Focus ring uses `ring-focus` token (not hardcoded)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus is not removed or hidden

### Interaction States
- [ ] Hover states are visible and consistent
- [ ] Active/pressed states provide visual feedback
- [ ] Disabled states show reduced opacity and cursor-not-allowed
- [ ] All states work in both light and dark modes

### Color Usage
- [ ] No hardcoded hex colors in components (except token definitions)
- [ ] No Tailwind color utilities like `bg-blue-50`, `text-green-600` in components
- [ ] Status colors use semantic tokens (`success`, `danger`, `warning`, `info`)
- [ ] All surfaces use semantic tokens (`surface`, `surface-raised`, etc.)

### Reduced Motion
- [ ] Animations are disabled when `prefers-reduced-motion` is set
- [ ] Transitions respect reduced motion preference
- [ ] No jarring animations for users with motion sensitivity

### Dark Mode
- [ ] Dark mode is not simply inverted light mode
- [ ] Text hierarchy is clear in dark mode
- [ ] Borders are visible (not too subtle)
- [ ] Shadows are reduced in favor of borders
- [ ] Status colors are adjusted for dark mode visibility

## Automated Checks

### TypeScript
```bash
npm run type-check
```
Ensures no TypeScript errors related to theme tokens.

### Linting
```bash
npm run lint
```
Catches potential accessibility issues and enforces code quality.

### Build Verification
```bash
npm run build
```
Verifies the application builds without warnings or errors.

## Common Issues & Fixes

### Issue: Theme flash on load
**Fix**: Ensure `suppressHydrationWarning` is on `<html>` and ThemeProvider wraps the app.

### Issue: Focus ring not visible
**Fix**: Check that `focus-visible:ring-2` is applied and `ring-ring` token is defined.

### Issue: Hardcoded colors
**Fix**: Replace with semantic tokens:
- `bg-blue-50` → `bg-info-muted`
- `text-green-600` → `text-success`
- `bg-zinc-900` → `bg-surface`

### Issue: Poor contrast in dark mode
**Fix**: Ensure dark mode tokens are separately tuned, not inverted. Check contrast ratios.

## Testing in Browser

1. **Theme Toggle Test**:
   - Open DevTools → Application → Local Storage
   - Check `readylayer-theme` value
   - Toggle theme and verify persistence

2. **Keyboard Navigation Test**:
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Ensure no elements are skipped

3. **Reduced Motion Test**:
   - Open DevTools → Rendering → Emulate CSS media feature
   - Set `prefers-reduced-motion: reduce`
   - Verify animations are disabled

4. **Contrast Test**:
   - Use browser extension (e.g., WAVE, axe DevTools)
   - Verify all text meets WCAG AA standards
   - Check both light and dark modes

## Token Reference

See `app/globals.css` for complete token definitions:
- Surfaces: `--surface`, `--surface-muted`, `--surface-raised`, `--surface-overlay`
- Text: `--text`, `--text-muted`, `--text-subtle`, `--text-inverse`
- Borders: `--border`, `--border-strong`
- Accent: `--accent`, `--accent-hover`, `--accent-muted`
- Status: `--success`, `--warning`, `--danger`, `--info` (each with `-foreground` and `-muted` variants)
