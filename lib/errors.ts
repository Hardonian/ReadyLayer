/**
 * Error Handling Utilities
 * 
 * Provides structured error responses with actionable information
 */

export interface ApiError {
  code: string
  message: string
  context?: Record<string, unknown>
  fix?: string
}

export class ApiErrorResponse extends Error {
  constructor(
    public statusCode: number,
    public error: ApiError
  ) {
    super(error.message)
    this.name = 'ApiErrorResponse'
  }
}

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 500,
  context?: Record<string, unknown>,
  fix?: string
): ApiErrorResponse {
  return new ApiErrorResponse(statusCode, {
    code,
    message,
    context,
    fix,
  })
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Common error messages with fixes
 */
export const ErrorMessages = {
  UNAUTHORIZED: {
    message: 'Authentication required',
    fix: 'Please authenticate and try again',
  },
  FORBIDDEN: {
    message: 'You do not have permission to perform this action',
    fix: 'Check your permissions or contact an administrator',
  },
  NOT_FOUND: (resource: string, id?: string) => ({
    message: `${resource} not found`,
    context: id ? { id } : undefined,
    fix: `Verify the ${resource.toLowerCase()} ID and try again`,
  }),
  VALIDATION_ERROR: {
    message: 'Invalid input data',
    fix: 'Check your request data and try again',
  },
  DATABASE_ERROR: {
    message: 'Database operation failed',
    fix: 'Please try again later. If the problem persists, contact support',
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Rate limit exceeded',
    fix: 'Please wait before making another request',
  },
} as const
