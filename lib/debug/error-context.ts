/**
 * Error Context Capture
 *
 * Captures rich context around errors for better debugging and bug triage.
 * Automatically includes request details, user context, and system state.
 *
 * @example
 * ```typescript
 * import { captureErrorContext, withErrorContext } from '@/lib/debug/error-context';
 *
 * try {
 *   await processPayment(userId, amount);
 * } catch (error) {
 *   const context = captureErrorContext(error, {
 *     userId,
 *     amount,
 *     operation: 'payment-processing',
 *   });
 *
 *   logger.error('Payment failed', context);
 *   throw error;
 * }
 * ```
 */

import { redactSecrets } from '@/lib/secrets/redaction';

export interface ErrorContext {
  /** Unique error ID for tracking */
  errorId: string;

  /** When the error occurred */
  timestamp: string;

  /** Error details */
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
  };

  /** Request context (if applicable) */
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    ip?: string;
    userAgent?: string;
  };

  /** User context (if applicable) */
  user?: {
    id?: string;
    organizationId?: string;
    email?: string;
    role?: string;
  };

  /** System context */
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };

  /** Custom context from the application */
  custom?: Record<string, unknown>;

  /** Breadcrumbs leading to the error */
  breadcrumbs?: Breadcrumb[];
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

// Global breadcrumb storage (cleared per request in API routes)
let breadcrumbs: Breadcrumb[] = [];

/**
 * Add a breadcrumb to track the path leading to an error
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
): void {
  const breadcrumb: Breadcrumb = {
    timestamp: new Date().toISOString(),
    category,
    message,
    level,
    data: data ? JSON.parse(redactSecrets(JSON.stringify(data)).redacted) as Record<string, unknown> : undefined,
  };

  breadcrumbs.push(breadcrumb);

  // Keep only last 50 breadcrumbs to prevent memory issues
  if (breadcrumbs.length > 50) {
    breadcrumbs = breadcrumbs.slice(-50);
  }
}

/**
 * Clear breadcrumbs (call at the start of each request)
 */
export function clearBreadcrumbs(): void {
  breadcrumbs = [];
}

/**
 * Get current breadcrumbs
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

/**
 * Capture comprehensive error context
 */
export function captureErrorContext(
  error: Error | unknown,
  custom?: Record<string, unknown>,
  request?: Request,
  user?: { id?: string; organizationId?: string; email?: string; role?: string }
): ErrorContext {
  const errorId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Extract error details
  let errorDetails: ErrorContext['error'];
  if (error instanceof Error) {
    errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  } else {
    errorDetails = {
      name: 'UnknownError',
      message: String(error),
    };
  }

  // Extract request context
  let requestContext: ErrorContext['request'] | undefined;
  if (request) {
    const url = new URL(request.url);
    requestContext = {
      method: request.method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };
  }

  // System context
  const memUsage = process.memoryUsage();
  const systemContext = {
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
  };

  // Build context
  const context: ErrorContext = {
    errorId,
    timestamp,
    error: errorDetails,
    request: requestContext,
    user,
    system: systemContext,
    custom: custom ? JSON.parse(redactSecrets(JSON.stringify(custom)).redacted) as Record<string, unknown> : undefined,
    breadcrumbs: getBreadcrumbs(),
  };

  return context;
}

/**
 * Wrap a function with error context capture
 *
 * @example
 * ```typescript
 * const safeFn = withErrorContext(
 *   async () => await riskyOperation(),
 *   { operation: 'risky-operation', userId: '123' }
 * );
 *
 * try {
 *   await safeFn();
 * } catch (error) {
 *   // Error already has full context attached
 * }
 * ```
 */
export function withErrorContext<T>(
  fn: () => T | Promise<T>,
  custom?: Record<string, unknown>
): () => Promise<T> {
  return async () => {
    try {
      return await Promise.resolve(fn());
    } catch (error) {
      // Attach context to error if it's an Error object
      if (error instanceof Error) {
        const context = captureErrorContext(error, custom);
        (error as Error & { context?: ErrorContext }).context = context;
      }
      throw error;
    }
  };
}

/**
 * Create a breadcrumb tracker for a specific operation
 *
 * @example
 * ```typescript
 * const tracker = createBreadcrumbTracker('payment-processing');
 *
 * tracker.log('Starting payment validation');
 * tracker.log('Calling Stripe API', { amount: 1000 });
 * tracker.warn('Retry attempt 1');
 * tracker.error('Payment failed');
 * ```
 */
export function createBreadcrumbTracker(category: string): {
  debug: (message: string, data?: Record<string, unknown>) => void;
  log: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
} {
  return {
    debug(message: string, data?: Record<string, unknown>): void {
      addBreadcrumb(category, message, 'debug', data);
    },

    log(message: string, data?: Record<string, unknown>): void {
      addBreadcrumb(category, message, 'info', data);
    },

    warn(message: string, data?: Record<string, unknown>): void {
      addBreadcrumb(category, message, 'warning', data);
    },

    error(message: string, data?: Record<string, unknown>): void {
      addBreadcrumb(category, message, 'error', data);
    },
  };
}

/**
 * Format error context for display
 */
export function formatErrorContext(context: ErrorContext): string {
  const sections: string[] = [];

  // Error details
  sections.push('=== ERROR DETAILS ===');
  sections.push(`Error ID: ${context.errorId}`);
  sections.push(`Timestamp: ${context.timestamp}`);
  sections.push(`Name: ${context.error.name}`);
  sections.push(`Message: ${context.error.message}`);
  if (context.error.stack) {
    sections.push(`Stack:\n${context.error.stack}`);
  }

  // Request context
  if (context.request) {
    sections.push('\n=== REQUEST CONTEXT ===');
    sections.push(`Method: ${context.request.method}`);
    sections.push(`URL: ${context.request.url}`);
    sections.push(`IP: ${context.request.ip || 'unknown'}`);
    sections.push(`User-Agent: ${context.request.userAgent || 'unknown'}`);
  }

  // User context
  if (context.user) {
    sections.push('\n=== USER CONTEXT ===');
    sections.push(`User ID: ${context.user.id || 'unknown'}`);
    sections.push(`Organization ID: ${context.user.organizationId || 'unknown'}`);
    sections.push(`Role: ${context.user.role || 'unknown'}`);
  }

  // System context
  sections.push('\n=== SYSTEM CONTEXT ===');
  sections.push(`Node Version: ${context.system.nodeVersion}`);
  sections.push(`Platform: ${context.system.platform}`);
  sections.push(`Memory: ${context.system.memory.used}MB / ${context.system.memory.total}MB (${context.system.memory.percentage}%)`);

  // Custom context
  if (context.custom) {
    sections.push('\n=== CUSTOM CONTEXT ===');
    sections.push(JSON.stringify(context.custom, null, 2));
  }

  // Breadcrumbs
  if (context.breadcrumbs && context.breadcrumbs.length > 0) {
    sections.push('\n=== BREADCRUMBS ===');
    context.breadcrumbs.forEach((crumb, index) => {
      sections.push(`${index + 1}. [${crumb.level.toUpperCase()}] ${crumb.category}: ${crumb.message}`);
      if (crumb.data) {
        sections.push(`   Data: ${JSON.stringify(crumb.data)}`);
      }
    });
  }

  return sections.join('\n');
}
