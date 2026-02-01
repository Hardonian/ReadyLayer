/**
 * Debug Logger Utility
 *
 * Provides safe, structured logging for debugging with automatic secret redaction.
 * Use this during bug triage to add detailed logging without exposing sensitive data.
 *
 * @example
 * ```typescript
 * import { createDebugLogger } from '@/lib/debug/debug-logger';
 *
 * const debug = createDebugLogger('user-service');
 *
 * function processUser(user: User) {
 *   debug.start('Processing user');
 *   debug.data('Input', user);
 *
 *   const validated = validateUser(user);
 *   debug.checkpoint('Validation complete', { isValid: validated.isValid });
 *
 *   debug.success('User processed successfully');
 *   return validated;
 * }
 * ```
 */

import { redactSecrets } from '@/lib/secrets/redaction';
import pino from 'pino';

export interface DebugLoggerOptions {
  /** Enable/disable debug logging (default: process.env.DEBUG_MODE === 'true') */
  enabled?: boolean;

  /** Include timestamps in console output (default: true) */
  timestamps?: boolean;

  /** Redact secrets before logging (default: true) */
  redactSecrets?: boolean;

  /** Include stack traces for errors (default: true) */
  includeStackTrace?: boolean;

  /** Pino logger instance (optional, creates new one if not provided) */
  logger?: pino.Logger;
}

export interface DebugLogger {
  /** Log the start of an operation */
  start(message: string, data?: unknown): void;

  /** Log a checkpoint with optional data */
  checkpoint(message: string, data?: unknown): void;

  /** Log data at a specific point */
  data(label: string, value: unknown): void;

  /** Log a successful outcome */
  success(message: string, data?: unknown): void;

  /** Log an error with full context */
  error(message: string, error?: Error | unknown, context?: unknown): void;

  /** Log a warning */
  warn(message: string, data?: unknown): void;

  /** Create a child logger with additional context */
  child(context: Record<string, unknown>): DebugLogger;

  /** Measure execution time of a function */
  time<T>(label: string, fn: () => T | Promise<T>): Promise<T>;

  /** Create a trace ID for request correlation */
  trace(traceId: string): DebugLogger;
}

/**
 * Create a debug logger for a specific module/service
 */
export function createDebugLogger(
  namespace: string,
  options: DebugLoggerOptions = {}
): DebugLogger {
  const {
    enabled = process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development',
    timestamps = true,
    redactSecrets: shouldRedact = true,
    includeStackTrace = true,
    logger: parentLogger,
  } = options;

  // Create or use provided logger
  const logger = parentLogger || pino({
    name: namespace,
    level: enabled ? 'debug' : 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      }
    } : undefined,
  });

  /**
   * Safely prepare data for logging (redact secrets, handle errors)
   */
  function prepareData(data: unknown): unknown {
    if (!data) return undefined;

    try {
      // Convert to string for redaction
      const stringified = typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);

      // Redact secrets if enabled
      const safeString = shouldRedact
        ? redactSecrets(stringified).redacted
        : stringified;

      // Parse back to object if it was originally an object
      return typeof data === 'string' ? safeString : JSON.parse(safeString);
    } catch (_err) {
      // If JSON parsing fails, return as-is (already redacted as string)
      return data;
    }
  }

  /**
   * Format message with namespace prefix
   */
  function formatMessage(message: string): string {
    return `[${namespace}] ${message}`;
  }

  const debugLogger: DebugLogger = {
    start(message: string, data?: unknown) {
      if (!enabled) return;

      logger.debug(
        {
          event: 'start',
          data: prepareData(data),
          timestamp: timestamps ? new Date().toISOString() : undefined,
        },
        `🚀 ${formatMessage(message)}`
      );
    },

    checkpoint(message: string, data?: unknown) {
      if (!enabled) return;

      logger.debug(
        {
          event: 'checkpoint',
          data: prepareData(data),
          timestamp: timestamps ? new Date().toISOString() : undefined,
        },
        `📍 ${formatMessage(message)}`
      );
    },

    data(label: string, value: unknown) {
      if (!enabled) return;

      const prepared = prepareData(value);
      logger.debug(
        {
          event: 'data',
          label,
          value: prepared,
          timestamp: timestamps ? new Date().toISOString() : undefined,
        },
        `📊 ${formatMessage(label)}: ${typeof prepared === 'object' ? JSON.stringify(prepared, null, 2) : prepared}`
      );
    },

    success(message: string, data?: unknown) {
      if (!enabled) return;

      logger.info(
        {
          event: 'success',
          data: prepareData(data),
          timestamp: timestamps ? new Date().toISOString() : undefined,
        },
        `✅ ${formatMessage(message)}`
      );
    },

    error(message: string, error?: Error | unknown, context?: unknown) {
      // Always log errors, even if debug is disabled
      const errorData: Record<string, unknown> = {
        event: 'error',
        timestamp: new Date().toISOString(),
      };

      if (error) {
        if (error instanceof Error) {
          errorData.error = {
            name: error.name,
            message: error.message,
            stack: includeStackTrace ? error.stack : undefined,
          };
        } else {
          errorData.error = prepareData(error);
        }
      }

      if (context) {
        errorData.context = prepareData(context);
      }

      logger.error(errorData, `❌ ${formatMessage(message)}`);
    },

    warn(message: string, data?: unknown) {
      if (!enabled) return;

      logger.warn(
        {
          event: 'warn',
          data: prepareData(data),
          timestamp: timestamps ? new Date().toISOString() : undefined,
        },
        `⚠️  ${formatMessage(message)}`
      );
    },

    child(context: Record<string, unknown>) {
      const childLogger = logger.child(prepareData(context) as pino.Bindings);
      return createDebugLogger(namespace, {
        ...options,
        logger: childLogger,
      });
    },

    async time<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
      const startTime = Date.now();

      if (enabled) {
        logger.debug(`⏱️  ${formatMessage(`Starting: ${label}`)}`);
      }

      try {
        const result = await Promise.resolve(fn());
        const duration = Date.now() - startTime;

        if (enabled) {
          logger.debug(
            { duration, label },
            `⏱️  ${formatMessage(`Completed: ${label}`)} (${duration}ms)`
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(
          { duration, label, error },
          `⏱️  ${formatMessage(`Failed: ${label}`)} (${duration}ms)`
        );

        throw error;
      }
    },

    trace(traceId: string) {
      return this.child({ traceId });
    },
  };

  return debugLogger;
}

/**
 * Global debug logger for quick debugging
 *
 * @example
 * ```typescript
 * import { debug } from '@/lib/debug/debug-logger';
 *
 * debug.checkpoint('User validation started');
 * debug.data('Email', user.email);
 * ```
 */
export const debug = createDebugLogger('app');

/**
 * Performance profiler for measuring execution time
 *
 * @example
 * ```typescript
 * import { profiler } from '@/lib/debug/debug-logger';
 *
 * const profile = profiler.start('database-query');
 * const users = await prisma.user.findMany();
 * profile.end(); // Logs duration
 * ```
 */
interface ProfilerHandle {
  end: (data?: unknown) => number;
}

export const profiler = {
  start(label: string): ProfilerHandle {
    const startTime = performance.now();
    const logger = createDebugLogger('profiler');

    return {
      end(data?: unknown): number {
        const duration = performance.now() - startTime;
        logger.checkpoint(`${label} completed in ${duration.toFixed(2)}ms`, data);
        return duration;
      },
    };
  },

  async measure<T>(label: string, fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const profile = this.start(label);
    try {
      const result = await Promise.resolve(fn());
      const duration = profile.end();
      return { result, duration };
    } catch (error) {
      profile.end({ error: true });
      throw error;
    }
  },
};

/**
 * Request context logger for API route debugging
 *
 * @example
 * ```typescript
 * import { createRequestLogger } from '@/lib/debug/debug-logger';
 *
 * export async function GET(request: Request) {
 *   const log = createRequestLogger(request);
 *
 *   log.start('Processing GET request');
 *   log.data('Query params', new URL(request.url).searchParams);
 *
 *   const data = await fetchData();
 *   log.success('Data fetched successfully', { count: data.length });
 *
 *   return Response.json(data);
 * }
 * ```
 */
export function createRequestLogger(request: Request): DebugLogger {
  const url = new URL(request.url);
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  return createDebugLogger('api-request', {
    enabled: true,
  }).child({
    method: request.method,
    path: url.pathname,
    correlationId,
  });
}
