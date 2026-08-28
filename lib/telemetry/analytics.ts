/**
 * Analytics & Event Tracking Service
 *
 * Tracks conversion-related events for CRO (Conversion Rate Optimization)
 * and product engagement metrics.
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

export type EventCategory =
  | 'upgrade-prompt'
  | 'onboarding'
  | 'blocked-pr-alert'
  | 'user-engagement'
  | 'feature-adoption'
  | 'error-recovery';

export interface AnalyticsEvent {
  eventId: string;
  category: EventCategory;
  eventName: string;
  userId?: string;
  organizationId?: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * In-memory event queue for batching
 */
const eventQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Track an analytics event
 */
export function trackEvent(
  category: EventCategory,
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const event: AnalyticsEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    category,
    eventName,
    userId: typeof properties?.userId === 'string' ? properties.userId : undefined,
    organizationId: typeof properties?.organizationId === 'string' ? properties.organizationId : undefined,
    properties: {
      ...properties,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
    timestamp: new Date(),
  };

  // Add to queue
  eventQueue.push(event);

  // Log event
  logger.debug(
    {
      eventId: event.eventId,
      category,
      eventName,
      properties,
    },
    'Analytics event tracked'
  );

  // Record metric
  metrics.increment(`analytics_${category}_${eventName}`, {
    userId: (typeof properties?.userId === 'string' ? properties.userId : 'unknown'),
  });

  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
}

/**
 * Track upgrade prompt events
 */
export function trackUpgradePromptEvent(
  action: 'shown' | 'dismissed' | 'clicked' | 'clicked-upgrade',
  context: string,
  data?: Record<string, unknown>
): void {
  trackEvent('upgrade-prompt', action, {
    context,
    ...data,
  });
}

/**
 * Track onboarding events
 */
export function trackOnboardingEvent(
  action: 'started' | 'step-completed' | 'step-skipped' | 'completed' | 'abandoned',
  stepName?: string,
  data?: Record<string, unknown>
): void {
  trackEvent('onboarding', action, {
    stepName,
    ...data,
  });
}

/**
 * Track blocked PR alert events
 */
export function trackBlockedPREvent(
  action: 'shown' | 'clicked' | 'dismissed',
  prNumber?: number,
  data?: Record<string, unknown>
): void {
  trackEvent('blocked-pr-alert', action, {
    prNumber,
    ...data,
  });
}

/**
 * Track user engagement events (feature usage, etc.)
 */
export function trackEngagementEvent(
  action: string,
  feature: string,
  data?: Record<string, unknown>
): void {
  trackEvent('user-engagement', action, {
    feature,
    ...data,
  });
}

/**
 * Track feature adoption
 */
export function trackFeatureAdoption(
  featureName: string,
  action: 'enabled' | 'disabled' | 'used',
  data?: Record<string, unknown>
): void {
  trackEvent('feature-adoption', action, {
    featureName,
    ...data,
  });
}

/**
 * Track error recovery
 */
export function trackErrorRecovery(
  errorType: string,
  recoveryMethod: string,
  data?: Record<string, unknown>
): void {
  trackEvent('error-recovery', recoveryMethod, {
    errorType,
    ...data,
  });
}

/**
 * Flush event queue to analytics backend
 */
export async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToFlush = [...eventQueue];
  eventQueue.length = 0; // Clear queue

  try {
    // Send to analytics endpoint
    const response = await fetch('/api/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToFlush }),
    });

    if (!response.ok) {
      logger.warn(
        {
          status: response.status,
          eventCount: eventsToFlush.length,
        },
        'Failed to flush analytics events'
      );
      // Re-add events back to queue on failure
      eventQueue.unshift(...eventsToFlush);
    } else {
      logger.debug(
        { eventCount: eventsToFlush.length },
        'Analytics events flushed successfully'
      );
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventCount: eventsToFlush.length,
      },
      'Error flushing analytics events'
    );
    // Re-add events back to queue on failure
    eventQueue.unshift(...eventsToFlush);
  }
}

/**
 * Setup periodic event flushing
 */
export function setupEventFlushing(intervalMs: number = 30000): () => void {
  const interval = setInterval(() => {
    flushEvents();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Track page view
 */
export function trackPageView(
  pageName: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return; // Only in browser

  trackEvent('user-engagement', 'page-view', {
    pageName,
    url: window.location.pathname,
    ...data,
  });
}

/**
 * Get current event queue (for testing)
 */
export function getEventQueue(): AnalyticsEvent[] {
  return [...eventQueue];
}

/**
 * Clear event queue (for testing)
 */
export function clearEventQueue(): void {
  eventQueue.length = 0;
}
