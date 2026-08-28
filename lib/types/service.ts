/**
 * Service Result Type
 *
 * Standardized result pattern for all services.
 * Uses discriminated unions to represent three outcomes:
 * 1. Success (status: 'ok') - operation completed successfully
 * 2. Blocked (status: 'blocked') - operation is blocked/gated but not an error
 * 3. Error (status: 'error') - operation failed with an error
 *
 * ARCHITECTURE:
 * - All services return ServiceResult<T> instead of throwing mixed patterns
 * - Callers use type narrowing to handle each case
 * - Improves readability and reduces try/catch nesting
 * - Better for testing (easier to mock and assert on results)
 */

/**
 * Success result
 */
export interface ServiceResultOk<T> {
  status: 'ok'
  data: T
  metadata?: Record<string, unknown>
}

/**
 * Blocked result (operation is valid but blocked by policy/gate)
 */
export interface ServiceResultBlocked {
  status: 'blocked'
  reason: string
  details?: Record<string, unknown>
}

/**
 * Error result
 */
export interface ServiceResultError {
  status: 'error'
  error: Error | string
  details?: Record<string, unknown>
}

/**
 * Discriminated union of all service results
 */
export type ServiceResult<T> = ServiceResultOk<T> | ServiceResultBlocked | ServiceResultError

/**
 * Type guard helpers for service results
 */
export function isServiceResultOk<T>(result: ServiceResult<T>): result is ServiceResultOk<T> {
  return result.status === 'ok'
}

export function isServiceResultBlocked<T>(result: ServiceResult<T>): result is ServiceResultBlocked {
  return result.status === 'blocked'
}

export function isServiceResultError<T>(result: ServiceResult<T>): result is ServiceResultError {
  return result.status === 'error'
}

/**
 * Helper to create success result
 */
export function serviceOk<T>(data: T, metadata?: Record<string, unknown>): ServiceResultOk<T> {
  return { status: 'ok', data, metadata }
}

/**
 * Helper to create blocked result
 */
export function serviceBlocked(reason: string, details?: Record<string, unknown>): ServiceResultBlocked {
  return { status: 'blocked', reason, details }
}

/**
 * Helper to create error result
 */
export function serviceError(error: Error | string, details?: Record<string, unknown>): ServiceResultError {
  return { status: 'error', error, details }
}

/**
 * Example usage pattern (for reference):
 *
 * ```typescript
 * export async function myScan(input: MyInput): Promise<ServiceResult<MyScan>> {
 *   try {
 *     // Check preconditions
 *     if (!input.isValid()) {
 *       return serviceBlocked('Invalid input', { reason: 'missing_field_X' })
 *     }
 *
 *     // Execute scan
 *     const result = await executeScan(input)
 *
 *     // Check for policy violations
 *     if (result.violatesPolicy) {
 *       return serviceBlocked('Policy violation', { rule: result.violatingRule })
 *     }
 *
 *     return serviceOk(result)
 *   } catch (error) {
 *     return serviceError(error instanceof Error ? error : new Error(String(error)))
 *   }
 * }
 *
 * // Caller code:
 * const result = await myScan(input)
 *
 * if (isServiceResultOk(result)) {
 *   // Fully typed as ServiceResultOk<MyScan>
 *   console.log('Scan passed:', result.data)
 * } else if (isServiceResultBlocked(result)) {
 *   // Fully typed as ServiceResultBlocked
 *   logger.warn(`Scan blocked: ${result.reason}`)
 * } else {
 *   // Fully typed as ServiceResultError
 *   logger.error('Scan failed:', result.error)
 *   throw result.error instanceof Error ? result.error : new Error(String(result.error))
 * }
 * ```
 */
