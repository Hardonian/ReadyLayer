/**
 * ReadyLayer Design Tokens
 * 
 * Visual depth, spacing, and typography system
 * for consistent, professional UI
 */

/**
 * Typography Scale
 * Clear hierarchy: hero, section, body, meta
 */
export const typography = {
  hero: {
    fontSize: '2.5rem',      // 40px
    lineHeight: '1.2',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  h1: {
    fontSize: '2rem',        // 32px
    lineHeight: '1.25',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  h2: {
    fontSize: '1.5rem',      // 24px
    lineHeight: '1.3',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.25rem',     // 20px
    lineHeight: '1.4',
    fontWeight: '600',
  },
  body: {
    fontSize: '1rem',        // 16px
    lineHeight: '1.5',
    fontWeight: '400',
  },
  bodyLarge: {
    fontSize: '1.125rem',    // 18px
    lineHeight: '1.5',
    fontWeight: '400',
  },
  small: {
    fontSize: '0.875rem',    // 14px
    lineHeight: '1.5',
    fontWeight: '400',
  },
  meta: {
    fontSize: '0.75rem',     // 12px
    lineHeight: '1.4',
    fontWeight: '500',
    letterSpacing: '0.01em',
  },
} as const

/**
 * Spacing Scale
 * Consistent vertical rhythm
 */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const

/**
 * Elevation System
 * Restrained depth: flat / raised / overlay
 */
export const elevation = {
  flat: {
    shadow: 'none',
    border: '1px solid hsl(var(--border))',
  },
  raised: {
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    border: '1px solid hsl(var(--border))',
  },
  overlay: {
    shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    border: '1px solid hsl(var(--border))',
  },
} as const

/**
 * Border Radius Scale
 */
export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px',
} as const
