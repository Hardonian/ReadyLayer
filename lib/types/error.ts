/**
 * Standardized Error Envelope
 * 
 * All API errors and job failures use this structure for consistent
 * error handling across the application.
 */

export interface ErrorEnvelope {
  /** Machine-readable error code */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Correlation ID for tracing (UUID v4) */
  traceId: string;
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Additional error details (safe for client exposure) */
  details?: Record<string, unknown>;
  
  /** HTTP status code (for API responses) */
  statusCode?: number;
  
  /** Timestamp when error occurred (ISO 8601) */
  timestamp?: string;
}

/**
 * Create a standardized error envelope
 */
export function createErrorEnvelope(
  code: string,
  message: string,
  options: {
    traceId?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
    statusCode?: number;
  } = {}
): ErrorEnvelope {
  return {
    code,
    message,
    traceId: options.traceId || generateTraceId(),
    retryable: options.retryable ?? false,
    details: options.details,
    statusCode: options.statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a UUID v4 for trace IDs
 */
function generateTraceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  
  // Job errors
  JOB_FAILED: 'JOB_FAILED',
  JOB_TIMEOUT: 'JOB_TIMEOUT',
  JOB_CANCELED: 'JOB_CANCELED',
  
  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  SUPABASE_ERROR: 'SUPABASE_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  
  // Multi-tenant errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_ISOLATION_VIOLATION: 'TENANT_ISOLATION_VIOLATION',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Determine if an error is retryable based on the code
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryableCodes: ErrorCode[] = [
    ErrorCodes.TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.DB_CONNECTION_ERROR,
    ErrorCodes.EXTERNAL_SERVICE_ERROR,
    ErrorCodes.GITHUB_API_ERROR,
    ErrorCodes.SUPABASE_ERROR,
    ErrorCodes.STRIPE_ERROR,
    ErrorCodes.JOB_TIMEOUT,
    ErrorCodes.RATE_LIMITED,
  ];
  
  return retryableCodes.includes(code);
}

/**
 * HTTP status code mapping
 */
export function getHttpStatusCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCodes.BAD_REQUEST]: 400,
    [ErrorCodes.UNAUTHORIZED]: 401,
    [ErrorCodes.FORBIDDEN]: 403,
    [ErrorCodes.NOT_FOUND]: 404,
    [ErrorCodes.CONFLICT]: 409,
    [ErrorCodes.VALIDATION_ERROR]: 422,
    [ErrorCodes.RATE_LIMITED]: 429,
    [ErrorCodes.INTERNAL_ERROR]: 500,
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
    [ErrorCodes.TIMEOUT]: 504,
    [ErrorCodes.JOB_FAILED]: 500,
    [ErrorCodes.JOB_TIMEOUT]: 504,
    [ErrorCodes.JOB_CANCELED]: 499,
    [ErrorCodes.DB_CONNECTION_ERROR]: 503,
    [ErrorCodes.DB_QUERY_ERROR]: 500,
    [ErrorCodes.DB_CONSTRAINT_VIOLATION]: 409,
    [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCodes.GITHUB_API_ERROR]: 502,
    [ErrorCodes.SUPABASE_ERROR]: 502,
    [ErrorCodes.STRIPE_ERROR]: 502,
    [ErrorCodes.TENANT_NOT_FOUND]: 404,
    [ErrorCodes.TENANT_ISOLATION_VIOLATION]: 403,
  };
  
  return statusMap[code] || 500;
}
