
/**
 * Error Normalization Utility
 *
 * Provides consistent error response format across all API routes
 * Ensures proper HTTP status codes, safe error messages, and request correlation
 */

import { NextResponse } from 'next/server';
import { logger } from '../../observability/logging';
import { redactSecrets } from '../secrets/redaction';

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
  meta?: {
    timestamp: string;
    path?: string;
  };
}

/**
 * Standard success response shape
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

/**
 * Known error types with their HTTP status codes
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  // Client Errors (4xx)
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,

  // Application Errors
  DATABASE_ERROR: 500,
  EXTERNAL_API_ERROR: 502,
  LLM_ERROR: 502,
  QUEUE_ERROR: 503,
  CACHE_ERROR: 500,

  // Business Logic Errors
  INSUFFICIENT_CREDITS: 402,
  USAGE_LIMIT_EXCEEDED: 429,
  SUBSCRIPTION_REQUIRED: 402,
  POLICY_VIOLATION: 403,
  BLOCKED: 403,
};

/**
 * Error class with HTTP status code
 */
export class HttpError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Normalize any error to a consistent API response
 *
 * @param error - Error to normalize
 * @param requestId - Request correlation ID
 * @param path - Request path
 * @returns Normalized NextResponse with consistent error shape
 */
export function normalizeError(
  error: unknown,
  requestId?: string,
  path?: string
): NextResponse<ErrorResponse> {
  // Extract error details
  const {
    code,
    message,
    statusCode,
    details,
  } = extractErrorDetails(error);

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(path ? { path } : {}),
    },
  };

  // Log error (redact sensitive data)
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](
    {
      error: {
        code,
        message: redactSecrets(message),
        statusCode,
        ...(details ? { details: redactSecrets(JSON.stringify(details)) } : {}),
      },
      requestId,
      path,
    },
    `API Error: ${code}`
  );

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Extract error details from unknown error type
 */
function extractErrorDetails(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
} {
  // HttpError (our custom error)
  if (error instanceof HttpError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for known error names/codes
const code = (error as { code?: string }).code || error.name || 'INTERNAL_SERVER_ERROR';
    const statusCode = ERROR_STATUS_CODES[code as keyof typeof ERROR_STATUS_CODES] || 500;

    // Safe message (don't leak internal details in production)
    const message = process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'An internal error occurred. Please try again later.'
      : error.message;

return {
      code,
      message,
      statusCode,
      details: process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined,
    } as const;
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: error,
      statusCode: 500,
    };
  }

  // Unknown error type
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    details: process.env.NODE_ENV !== 'production' ? { error: String(error) } : undefined,
  };
}

/**
 * Create a success response with consistent shape
 *
 * @param data - Response data
 * @param requestId - Request correlation ID
 * @param statusCode - HTTP status code (default: 200)
 * @returns Normalized NextResponse with success shape
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
  statusCode: number = 200
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create a paginated success response
 *
 * @param data - Response data (items)
 * @param pagination - Pagination metadata
 * @param requestId - Request correlation ID
 * @returns Normalized NextResponse with pagination
 */
export function createPaginatedResponse<T>(
  data: T,
  pagination: { page: number; limit: number; total: number },
  requestId?: string
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      pagination,
    },
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * Helper to throw HTTP errors
 */
export function throwHttpError(
  code: string,
  message: string,
  details?: unknown
): never {
  const statusCode = ERROR_STATUS_CODES[code] || 500;
  throw new HttpError(code, statusCode, message, details);
}

/**
 * Validation error helper
 */
export function throwValidationError(message: string, details?: unknown): never {
  throw new HttpError('VALIDATION_ERROR', 400, message, details);
}

/**
 * Not found error helper
 */
export function throwNotFoundError(resource: string): never {
  throw new HttpError('NOT_FOUND', 404, `${resource} not found`);
}

/**
 * Unauthorized error helper
 */
export function throwUnauthorizedError(message: string = 'Unauthorized'): never {
  throw new HttpError('UNAUTHORIZED', 401, message);
}

/**
 * Forbidden error helper
 */
export function throwForbiddenError(message: string = 'Forbidden'): never {
  throw new HttpError('FORBIDDEN', 403, message);
}

/**
 * Rate limit error helper
 */
export function throwRateLimitError(resetAt?: Date): never {
  throw new HttpError(
    'TOO_MANY_REQUESTS',
    429,
    'Rate limit exceeded',
    resetAt ? { resetAt: resetAt.toISOString() } : undefined
  );
}
