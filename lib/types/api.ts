/**
 * API Type Definitions
 * 
 * Shared types for API requests and responses
 */

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    context?: Record<string, unknown>
    details?: unknown
    errors?: Array<{ path: (string | number)[]; message: string }>
  }
}

export interface ApiSuccessResponse<T = unknown> {
  data: T
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Type guard for API error response
 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorResponse).error === 'object' &&
    (value as ApiErrorResponse).error !== null &&
    'code' in (value as ApiErrorResponse).error &&
    'message' in (value as ApiErrorResponse).error
  )
}

/**
 * Safely extract error message from API response
 */
export function getErrorMessage(response: unknown): string {
  if (isApiErrorResponse(response)) {
    return response.error.message
  }
  if (response instanceof Error) {
    return response.message
  }
  return 'An unexpected error occurred'
}
