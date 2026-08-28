/**
 * Onboarding Progress Hook
 *
 * Tracks user progress through the onboarding checklist
 * Persists to localStorage and syncs with backend
 */

import { useState, useEffect, useCallback } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  completed: boolean
  completedAt?: Date
}

export interface OnboardingProgress {
  started: boolean
  startedAt?: Date
  completedAt?: Date
  currentStep?: string
  steps: OnboardingStep[]
  completionPercentage: number
  isComplete: boolean
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'connect-repo',
    title: 'Connect Your First Repository',
    completed: false,
  },
  {
    id: 'review-results',
    title: 'Run Your First Review',
    completed: false,
  },
  {
    id: 'understand-enforcement',
    title: 'Understand Enforcement Policies',
    completed: false,
  },
  {
    id: 'invite-team',
    title: 'Invite Your Team',
    completed: false,
  },
  {
    id: 'configure-policies',
    title: 'Configure Custom Policies',
    completed: false,
  },
]

interface UseOnboardingProgressResult {
  progress: OnboardingProgress
  completeStep: (stepId: string) => void
  reset: () => void
  shouldShowOnboarding: () => boolean
  isLoading: boolean
}

/**
 * Use onboarding progress tracking
 */
export function useOnboardingProgress(): UseOnboardingProgressResult {
  const [storedProgress, setStoredProgress] = useLocalStorage<OnboardingProgress | null>(
    'readylayer:onboarding-progress',
    null
  )

  const [progress, setProgress] = useState<OnboardingProgress | null>(storedProgress)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize on mount
  useEffect(() => {
    if (storedProgress) {
      setProgress(storedProgress)
    } else {
      // First time - initialize with empty progress
      const initialProgress: OnboardingProgress = {
        started: false,
        steps: DEFAULT_STEPS,
        completionPercentage: 0,
        isComplete: false,
      }
      setProgress(initialProgress)
    }
    setIsLoading(false)
  }, [storedProgress])

  // Mark step as completed
  const completeStep = useCallback(
    (stepId: string): void => {
      if (!progress) return

      const updatedSteps = progress.steps.map((step) =>
        step.id === stepId
          ? { ...step, completed: true, completedAt: new Date() }
          : step
      )

      const completedCount = updatedSteps.filter((s) => s.completed).length
      const completionPercentage = Math.round(
        (completedCount / updatedSteps.length) * 100
      )

      const updatedProgress: OnboardingProgress = {
        ...progress,
        started: true,
        startedAt: progress.startedAt || new Date(),
        steps: updatedSteps,
        completionPercentage,
        isComplete: completedCount === updatedSteps.length,
        completedAt: completedCount === updatedSteps.length ? new Date() : undefined,
      }

      setProgress(updatedProgress)
      setStoredProgress(updatedProgress)

      // Track analytics event
      trackOnboardingEvent('step_completed', {
        stepId,
        completionPercentage,
      })
    },
    [progress, setStoredProgress]
  )

  // Reset onboarding
  const reset = useCallback((): void => {
    const initialProgress: OnboardingProgress = {
      started: false,
      steps: DEFAULT_STEPS,
      completionPercentage: 0,
      isComplete: false,
    }
    setProgress(initialProgress)
    setStoredProgress(initialProgress)
  }, [setStoredProgress])

  // Check if onboarding should be shown
  const shouldShowOnboarding = useCallback((): boolean => {
    if (!progress) return true
    // Show if not started or less than 100% complete
    return !progress.isComplete
  }, [progress])

  return {
    progress: progress || {
      started: false,
      steps: DEFAULT_STEPS,
      completionPercentage: 0,
      isComplete: false,
    },
    completeStep,
    reset,
    shouldShowOnboarding,
    isLoading,
  }
}

/**
 * Track onboarding event
 */
function trackOnboardingEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
  // Would send to analytics service
  // For now, just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Onboarding] ${eventName}`, data)
  }

  // TODO: Integrate with actual analytics (Mixpanel, Segment, etc.)
  // Example:
  // analytics.track(eventName, {
  //   category: 'onboarding',
  //   ...data,
  // })
}

/**
 * useLocalStorage hook implementation
 * Simple localStorage hook that syncs state
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get the item from localStorage
      if (typeof window === 'undefined') {
        return initialValue
      }

const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) as T : initialValue
    } catch {
      console.warn(`Error reading localStorage key "${key}":`)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T): void => {
    try {
const valueToStore = value instanceof Function ? (value as (prev: T) => T)(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch {
      console.warn(`Error setting localStorage key "${key}":`)
    }
  }

  return [storedValue, setValue]
}

export default useOnboardingProgress
