/**
 * ReadyLayer Motion System
 *
 * PRINCIPLES:
 * - Motion is semantic, not decorative
 * - Every async action has a visible, calm state transition
 * - UI never surprises; it reassures
 * - Performance and accessibility outrank visual novelty
 * - Silence (white space, pauses) is a design tool
 */

import { Variants, Transition } from 'framer-motion'

/**
 * Duration tiers for consistent timing
 */
export const motionDurations = {
  micro: 0.15,      // Button presses, quick feedback
  transition: 0.25, // Standard state changes
  page: 0.4,       // Page transitions, major state changes
} as const

/**
 * Easing curves - engineered, not playful
 */
export const motionEasing = {
  standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  decelerate: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  accelerate: [0.4, 0.0, 1, 1] as [number, number, number, number],
  sharp: [0.4, 0.0, 0.6, 1] as [number, number, number, number],
} as const

/**
 * Standard transition configuration
 */
export const standardTransition: Transition = {
  duration: motionDurations.transition,
  ease: motionEasing.standard,
}

export const microTransition: Transition = {
  duration: motionDurations.micro,
  ease: motionEasing.standard,
}

export const pageTransition: Transition = {
  duration: motionDurations.page,
  ease: motionEasing.decelerate,
}

/**
 * Fade variants for content reveal
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: standardTransition,
  },
}

/**
 * Slide up variants for content entry
 */
export const slideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: standardTransition,
  },
}

/**
 * Scale variants for button/control feedback
 */
export const scalePress: Variants = {
  rest: { scale: 1 },
  pressed: {
    scale: 0.98,
    transition: microTransition,
  },
}

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: motionDurations.transition,
      ease: motionEasing.accelerate,
    },
  },
}

/**
 * Stagger children variants for list animations
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: standardTransition,
  },
}

/**
 * Respect reduced motion preferences
 * Use in components that check prefers-reduced-motion media query
 */
export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0 },
  },
}

/**
 * Get motion configuration respecting user preferences
 * Returns transitions and durations that respect prefers-reduced-motion
 *
 * USAGE:
 * ```typescript
 * import { getMotionConfig } from '@/lib/design/motion'
 *
 * export function MyComponent() {
 *   const motion = getMotionConfig()
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1 }}
 *       transition={{ duration: motion.transitionDuration }}
 *     >
 *       Content
 *     </motion.div>
 *   )
 * }
 * ```
 */
export function getMotionConfig(): {
  transitionDuration: number
  microDuration: number
  pageDuration: number
  standardEasing: [number, number, number, number]
  shouldReduceMotion: boolean
} {
  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    // Return 0 if reduced motion is preferred, otherwise standard duration
    transitionDuration: prefersReducedMotion ? 0 : motionDurations.transition,
    microDuration: prefersReducedMotion ? 0 : motionDurations.micro,
    pageDuration: prefersReducedMotion ? 0 : motionDurations.page,

    // Easing is still applied (doesn't hurt with 0 duration)
    standardEasing: motionEasing.standard,

    // Disabled all animations flag
    shouldReduceMotion: prefersReducedMotion,
  }
}
