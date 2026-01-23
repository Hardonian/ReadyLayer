/**
 * Distributed Tracing Context
 * 
 * Adds OpenTelemetry tracing to correlate requests across serverless functions,
 * workers, and database operations.
 * 
 * Provides:
 * - Trace ID propagation across services
 * - Span tracking for request flows
 * - Performance metrics per service
 * - Request correlation via X-Trace-ID header
 */

import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags: number; // Trace flags (sampled, debug, etc.)
  startTime: Date;
  userId?: string;
  organizationId?: string;
  requestId?: string;
}

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'unset' | 'ok' | 'error';
  attributes: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: Date;
    attributes?: Record<string, unknown>;
  }>;
}

class TraceContextManager {
  private currentTrace: TraceContext | null = null;
  private spans: Map<string, Span> = new Map();
  private maxSpans = 1000;
  private sampled = true; // Always sample (can be configured)

  /**
   * Create or get current trace context
   */
  getOrCreateContext(headers?: Record<string, string>): TraceContext {
    // Check if we're continuing a trace from headers
    if (headers) {
      const traceId = headers['x-trace-id'] || headers['traceparent']?.split('-')[1];
      if (traceId) {
        return {
          traceId,
          spanId: randomUUID(),
          flags: parseInt(headers['x-trace-flags'] || '1'),
          startTime: new Date(),
        };
      }
    }

    // Create new trace
    if (!this.currentTrace) {
      this.currentTrace = {
        traceId: randomUUID(),
        spanId: randomUUID(),
        flags: this.sampled ? 1 : 0,
        startTime: new Date(),
      };
    }

    return this.currentTrace;
  }

  /**
   * Set trace context
   */
  setContext(context: TraceContext): void {
    this.currentTrace = context;
  }

  /**
   * Get current trace context
   */
  getContext(): TraceContext | null {
    return this.currentTrace;
  }

  /**
   * Clear trace context
   */
  clearContext(): void {
    this.currentTrace = null;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, kind: Span['kind'] = 'internal'): string {
    const context = this.getOrCreateContext();
    const spanId = randomUUID();

    const span: Span = {
      id: spanId,
      traceId: context.traceId,
      parentSpanId: context.spanId,
      name,
      kind,
      startTime: new Date(),
      status: 'unset',
      attributes: {
        'service.name': 'readylayer',
        'span.kind': kind,
      },
      events: [],
    };

    this.spans.set(spanId, span);

    // Prune old spans if needed
    if (this.spans.size > this.maxSpans) {
      const firstKey = this.spans.keys().next().value;
      if (firstKey) this.spans.delete(firstKey);
    }

    return spanId;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = new Date();
      span.duration = span.endTime.getTime() - span.startTime.getTime();
      span.status = status;
    }
  }

  /**
   * Add attribute to current span
   */
  setSpanAttribute(spanId: string, key: string, value: unknown): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  /**
   * Add event to current span
   */
  recordSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.events.push({
        name,
        timestamp: new Date(),
        attributes,
      });
    }
  }

  /**
   * Get span
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span[] {
    return Array.from(this.spans.values()).filter((s) => s.traceId === traceId);
  }

  /**
   * Export trace in OpenTelemetry format
   */
  exportTrace(traceId: string): Record<string, unknown> {
    const spans = this.getTraceSpans(traceId);

    return {
      traceId,
      spans: spans.map((span) => ({
        traceId: span.traceId,
        spanId: span.id,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        startTimeUnixNano: BigInt(span.startTime.getTime()) * BigInt(1_000_000),
        endTimeUnixNano:
          span.endTime ? BigInt(span.endTime.getTime()) * BigInt(1_000_000) : undefined,
        attributes: span.attributes,
        events: span.events.map((e) => ({
          timeUnixNano: BigInt(e.timestamp.getTime()) * BigInt(1_000_000),
          name: e.name,
          attributes: e.attributes,
        })),
        status: {
          code: span.status === 'ok' ? 0 : 1,
          message: span.status === 'error' ? 'Error' : '',
        },
      })),
    };
  }

  /**
   * Generate W3C Trace Context headers
   */
  generateW3CHeaders(traceId?: string, spanId?: string): Record<string, string> {
    const context = traceId ? { traceId, spanId: spanId || randomUUID(), flags: 1, startTime: new Date() } : this.getOrCreateContext();

    return {
      'traceparent': `00-${context.traceId}-${context.spanId}-${context.flags ? '01' : '00'}`,
      'tracestate': `readylayer-${context.spanId}`,
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      'x-trace-flags': context.flags.toString(),
    };
  }

  /**
   * Parse W3C Trace Context headers
   */
  static parseW3CHeaders(headers: Record<string, string>): Partial<TraceContext> | null {
    const traceparent = headers['traceparent'];
    if (!traceparent) return null;

    // Format: 00-<trace-id>-<span-id>-<flags>
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    return {
      traceId: parts[1],
      spanId: parts[2],
      flags: parseInt(parts[3], 16),
    };
  }

  /**
   * Get trace summary (for debugging)
   */
  getTraceSummary(traceId: string): {
    traceId: string;
    spanCount: number;
    duration: number;
    spans: Array<{
      name: string;
      duration: number;
      status: string;
    }>;
  } {
    const spans = this.getTraceSpans(traceId);
    const minStart = Math.min(...spans.map((s) => s.startTime.getTime()));
    const maxEnd = Math.max(...spans.map((s) => s.endTime?.getTime() || s.startTime.getTime()));

    return {
      traceId,
      spanCount: spans.length,
      duration: maxEnd - minStart,
      spans: spans.map((s) => ({
        name: s.name,
        duration: s.duration || 0,
        status: s.status,
      })),
    };
  }
}

// Singleton instance
export const traceContextManager = new TraceContextManager();

/**
 * Middleware to inject trace context into requests
 */
export function traceMiddleware(
  req: { headers?: Record<string, string> },
  _res?: unknown
): (next: () => Promise<void>) => Promise<void> {
  return async (next: () => Promise<void>) => {
    const headers = req.headers || {};
    const context = traceContextManager.getOrCreateContext(headers);

    // Store in a way that can be accessed throughout the request
    // (Implementation depends on framework - Next.js, Express, etc.)
    const globalWithTrace = globalThis as typeof globalThis & { __trace_context?: TraceContext };
    globalWithTrace.__trace_context = context;

    const spanId = traceContextManager.startSpan('request', 'server');

    try {
      await next();
      traceContextManager.endSpan(spanId, 'ok');
    } catch (error) {
      traceContextManager.endSpan(spanId, 'error');
      traceContextManager.setSpanAttribute(spanId, 'error.type', (error as Error).name);
      traceContextManager.setSpanAttribute(spanId, 'error.message', (error as Error).message);
      throw error;
    } finally {
      traceContextManager.clearContext();
    }
  };
}

/**
 * Helper to get current trace ID
 */
export function getCurrentTraceId(): string | null {
  const context = traceContextManager.getContext();
  return context?.traceId || null;
}

/**
 * Helper to get current span ID
 */
export function getCurrentSpanId(): string | null {
  const context = traceContextManager.getContext();
  return context?.spanId || null;
}

/**
 * Helper to record timing
 */
export function recordTiming(name: string, duration: number, attributes?: Record<string, unknown>): void {
  const context = traceContextManager.getContext();
  if (context) {
    const spanId = traceContextManager.startSpan(`timing:${name}`, 'internal');
    traceContextManager.setSpanAttribute(spanId, 'duration.ms', duration);
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        traceContextManager.setSpanAttribute(spanId, key, value);
      }
    }
    traceContextManager.endSpan(spanId, 'ok');
  }
}
