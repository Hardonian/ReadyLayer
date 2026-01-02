/**
 * API Helper Utilities
 * 
 * Type-safe utilities for handling API responses
 */

import type { ApiErrorResponse } from '../types/api'

/**
 * Safely extract error message from API error response
 */
export function getApiErrorMessage(errorData: unknown): string {
  if (
    typeof errorData === 'object' &&
    errorData !== null &&
    'error' in errorData &&
    typeof (errorData as ApiErrorResponse).error === 'object' &&
    (errorData as ApiErrorResponse).error !== null
  ) {
    const apiError = errorData as ApiErrorResponse
    return apiError.error.message || 'An error occurred'
  }
  return 'An error occurred'
}

/**
 * Type-safe error data parser
 */
export function parseErrorResponse(response: Response): Promise<ApiErrorResponse> {
  return response.json().catch(() => ({
    error: {
      code: 'PARSE_ERROR',
      message: 'Failed to parse error response',
    },
  })) as Promise<ApiErrorResponse>
}
