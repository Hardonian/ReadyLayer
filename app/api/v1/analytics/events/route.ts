/**
 * Analytics Events Collection Endpoint
 * 
 * Collects conversion and engagement events from the frontend
 * for analysis and conversion rate optimization (CRO).
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';

interface AnalyticsEvent {
  eventId: string;
  category: string;
  eventName: string;
  userId?: string;
  organizationId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

interface AnalyticsPayload {
  events: AnalyticsEvent[];
}

export async function POST(request: NextRequest) {
  try {
    // Events are anonymous - no session required

// Parse payload
    const payload = await request.json() as AnalyticsPayload;
    const { events = [] } = payload;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'No events provided' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = events.filter((event) => {
      if (!event.eventId || !event.category || !event.eventName) {
        logger.warn(
          {
            eventId: event.eventId,
            category: event.category,
            eventName: event.eventName,
          },
          'Invalid analytics event structure'
        );
        return false;
      }
      return true;
    });

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events provided' },
        { status: 400 }
      );
    }

    // Enrich events with session data
    const enrichedEvents = validEvents.map((event) => ({
      ...event,
      userId: event.userId,
      organizationId: event.organizationId,
      processedAt: new Date().toISOString(),
    }));

    // Log events for analysis
    for (const event of enrichedEvents) {
      logger.info(
        {
          eventId: event.eventId,
          category: event.category,
          eventName: event.eventName,
          userId: event.userId,
          organizationId: event.organizationId,
          properties: event.properties,
        },
        'Analytics event received'
      );

      // Record metrics
      metrics.increment(`analytics_${event.category}_${event.eventName}`, {
        userId: event.userId || 'unknown',
        organizationId: event.organizationId || 'unknown',
      });
    }

    // Batch store events in database for later analysis
    // This could be extended to write to a separate analytics table
    // or send to an external analytics service (Mixpanel, Amplitude, etc.)

    return NextResponse.json(
      {
        success: true,
        receivedCount: enrichedEvents.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to process analytics events'
    );

    metrics.increment('analytics_processing_error');

    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Analytics events collection endpoint',
      method: 'POST',
    },
    { status: 200 }
  );
}
