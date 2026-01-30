// ============================================
// ReadyLayer SDK - Main Entry Point
// ============================================

/**
 * Official TypeScript SDK for the ReadyLayer API
 * @module @readylayer/sdk
 * @see https://readylayer.io/docs
 */

// Export client
export { ReadyLayerClient } from './client';
export type { ClientConfig } from './client';

// Export all types
export * from './types';

// Export errors
export {
  ReadyLayerError,
  BadRequestError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  PaymentRequiredError,
  ConflictError,
  UnprocessableError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  createErrorFromResponse,
} from './errors';

// Default export
export { ReadyLayerClient as default } from './client';
