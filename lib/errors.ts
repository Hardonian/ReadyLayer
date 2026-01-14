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
 * Typed error classes for common scenarios
 */

/**
 * UnauthorizedError: 401 - Authentication failed or missing
 * Thrown when a request lacks valid credentials or authentication fails
 */
export class UnauthorizedError extends ApiErrorResponse {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(401, {
      code: ErrorCodes.UNAUTHORIZED,
      message,
      context,
      fix: 'Please sign in at /auth/signin or provide a valid API key in the Authorization header',
    })
    this.name = 'UnauthorizedError'
  }
}

/**
 * ForbiddenError: 403 - Authenticated but lacks permission
 * Thrown when a user is authenticated but doesn't have access to the resource
 */
export class ForbiddenError extends ApiErrorResponse {
  constructor(message: string = 'You do not have permission to perform this action', context?: Record<string, unknown>) {
    super(403, {
      code: ErrorCodes.FORBIDDEN,
      message,
      context,
      fix: 'Check your organization membership and role. Contact an organization admin if you need access',
    })
    this.name = 'ForbiddenError'
  }
}

/**
 * NotFoundError: 404 - Resource not found
 */
export class NotFoundError extends ApiErrorResponse {
  constructor(resource: string, id?: string) {
    super(404, {
      code: ErrorCodes.NOT_FOUND,
      message: `${resource} not found`,
      context: id ? { id, resource } : { resource },
      fix: `Verify the ${resource.toLowerCase()} ID exists and you have access to it`,
    })
    this.name = 'NotFoundError'
  }
}

/**
 * ValidationError: 400 - Invalid request data
 */
export class ValidationError extends ApiErrorResponse {
  constructor(message: string = 'Invalid input data', context?: Record<string, unknown>) {
    super(400, {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      context,
      fix: 'Review the request body and ensure all required fields are present and correctly formatted',
    })
    this.name = 'ValidationError'
  }
}

/**
 * DatabaseError: 500 - Database operation failed
 */
export class DatabaseError extends ApiErrorResponse {
  constructor(originalError?: Error) {
    super(500, {
      code: ErrorCodes.DATABASE_ERROR,
      message: 'Database operation failed',
      context: process.env.NODE_ENV === 'development' ? { originalMessage: originalError?.message } : undefined,
      fix: 'This is a temporary issue. Please try again in a few moments. If the problem persists, contact support@readylayer.com',
    })
    this.name = 'DatabaseError'
  }
}

/**
 * RateLimitError: 429 - Too many requests
 */
export class RateLimitError extends ApiErrorResponse {
  constructor(resetAfterSeconds: number = 60) {
    super(429, {
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      context: { resetAfterSeconds },
      fix: `Please wait ${resetAfterSeconds} seconds before making another request, or upgrade your plan for higher limits`,
    })
    this.name = 'RateLimitError'
  }
}

/**
 * Common error messages with actionable fixes
 */
export const ErrorMessages = {
  UNAUTHORIZED: {
    message: 'Authentication required',
    fix: 'Please sign in at /auth/signin or provide a valid API key in the Authorization header',
  },
  FORBIDDEN: {
    message: 'You do not have permission to perform this action',
    fix: 'Check your organization membership and role. Contact an organization admin if you need access',
  },
  NOT_FOUND: (resource: string, id?: string) => ({
    message: `${resource} not found`,
    context: id ? { id } : undefined,
    fix: `Verify the ${resource.toLowerCase()} ID exists and you have access to it. Check your organization membership`,
  }),
  VALIDATION_ERROR: {
    message: 'Invalid input data',
    fix: 'Review the request body and ensure all required fields are present and correctly formatted. See API documentation for expected format',
  },
  DATABASE_ERROR: {
    message: 'Database operation failed',
    fix: 'This is a temporary issue. Please try again in a few moments. If the problem persists, contact support@readylayer.com',
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Rate limit exceeded',
    fix: 'You have exceeded the rate limit. Please wait 60 seconds before making another request, or upgrade your plan for higher limits',
  },
  BILLING_LIMIT_EXCEEDED: (limitType: string, current: number, limit: number) => ({
    message: `${limitType} limit exceeded`,
    context: { current, limit },
    fix: `You have reached your plan limit (${current}/${limit}). Upgrade your plan at /dashboard/billing or wait for the next billing period`,
  }),
  CONFIG_INVALID: (errors: string[]) => ({
    message: 'Invalid configuration',
    context: { errors },
    fix: `Fix these configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nSee https://docs.readylayer.com/config for valid configuration options`,
  }),
  REPOSITORY_NOT_FOUND: (repoId: string) => ({
    message: 'Repository not found',
    context: { repositoryId: repoId },
    fix: `Verify the repository ID exists and you have access to it. Check that the repository is connected to your organization`,
  }),
  ORGANIZATION_ACCESS_DENIED: (orgId: string) => ({
    message: 'Access denied to organization',
    context: { organizationId: orgId },
    fix: 'You are not a member of this organization. Contact an organization admin to be added, or use a different organization',
  }),
} as const
