// ============================================
// ReadyLayer SDK - Error Hierarchy
// ============================================

import type { ErrorDetails, ValidationError } from './types';

/**
 * Base error class for all ReadyLayer SDK errors.
 */
export class ReadyLayerError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string,
    options: {
      context?: Record<string, unknown>;
      statusCode?: number;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.context = options.context;
    this.statusCode = options.statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Error thrown when the API returns a 400 Bad Request response.
 * Usually indicates validation errors in the request.
 */
export class BadRequestError extends ReadyLayerError {
  public readonly validationErrors?: ValidationError[];

  constructor(
    message: string,
    options: {
      context?: Record<string, unknown>;
      validationErrors?: ValidationError[];
      cause?: Error;
    } = {}
  ) {
    super(message, 'BAD_REQUEST', {
      context: options.context,
      statusCode: 400,
      cause: options.cause,
    });
    this.validationErrors = options.validationErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Error thrown when the API returns a 401 Unauthorized response.
 * Indicates missing or invalid authentication credentials.
 */
export class AuthenticationError extends ReadyLayerError {
  constructor(
    message = 'Authentication required. Please provide a valid API key or token.',
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'UNAUTHORIZED', {
      context: options.context,
      statusCode: 401,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 403 Forbidden response.
 * Indicates insufficient permissions for the requested operation.
 */
export class PermissionError extends ReadyLayerError {
  constructor(
    message = 'You do not have permission to perform this action.',
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'FORBIDDEN', {
      context: options.context,
      statusCode: 403,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 404 Not Found response.
 * Indicates the requested resource does not exist.
 */
export class NotFoundError extends ReadyLayerError {
  public readonly resourceId?: string;
  public readonly resourceType?: string;

  constructor(
    message: string,
    options: {
      resourceId?: string;
      resourceType?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'NOT_FOUND', {
      context: options.context,
      statusCode: 404,
      cause: options.cause,
    });
    this.resourceId = options.resourceId;
    this.resourceType = options.resourceType;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceId: this.resourceId,
      resourceType: this.resourceType,
    };
  }
}

/**
 * Error thrown when the API returns a 402 Payment Required response.
 * Indicates billing limit exceeded or subscription required.
 */
export class PaymentRequiredError extends ReadyLayerError {
  constructor(
    message = 'Payment required. Please upgrade your plan to continue.',
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'PAYMENT_REQUIRED', {
      context: options.context,
      statusCode: 402,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 409 Conflict response.
 * Indicates a conflict with the current state of the resource.
 */
export class ConflictError extends ReadyLayerError {
  constructor(
    message: string,
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'CONFLICT', {
      context: options.context,
      statusCode: 409,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 422 Unprocessable Entity response.
 * Indicates semantic errors in the request.
 */
export class UnprocessableError extends ReadyLayerError {
  constructor(
    message: string,
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'UNPROCESSABLE_ENTITY', {
      context: options.context,
      statusCode: 422,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 429 Too Many Requests response.
 * Indicates rate limit exceeded.
 */
export class RateLimitError extends ReadyLayerError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Rate limit exceeded. Please retry after the specified duration.',
    options: {
      retryAfter?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'RATE_LIMITED', {
      context: options.context,
      statusCode: 429,
      cause: options.cause,
    });
    this.retryAfter = options.retryAfter;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Error thrown when the API returns a 5xx Server Error response.
 */
export class ServerError extends ReadyLayerError {
  constructor(
    message = 'An internal server error occurred. Please try again later.',
    options: {
      context?: Record<string, unknown>;
      statusCode?: number;
      cause?: Error;
    } = {}
  ) {
    super(message, 'SERVER_ERROR', {
      context: options.context,
      statusCode: options.statusCode ?? 500,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the API returns a 503 Service Unavailable response.
 */
export class ServiceUnavailableError extends ReadyLayerError {
  constructor(
    message = 'Service temporarily unavailable. Please try again later.',
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'SERVICE_UNAVAILABLE', {
      context: options.context,
      statusCode: 503,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when a network error occurs (e.g., connection refused, timeout).
 */
export class NetworkError extends ReadyLayerError {
  constructor(
    message = 'A network error occurred. Please check your connection and try again.',
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, 'NETWORK_ERROR', {
      context: options.context,
      cause: options.cause,
    });
  }
}

/**
 * Error thrown when the maximum number of retries is exceeded.
 */
export class RetryExhaustedError extends ReadyLayerError {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(
    attempts: number,
    lastError: Error,
    options: {
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(`Request failed after ${attempts} attempts`, 'RETRY_EXHAUSTED', {
      context: options.context,
      cause: lastError,
    });
    this.attempts = attempts;
    this.lastError = lastError;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      attempts: this.attempts,
      lastError: this.lastError.message,
    };
  }
}

/**
 * Error thrown when the request times out.
 */
export class TimeoutError extends ReadyLayerError {
  public readonly timeoutMs: number;

  constructor(
    timeoutMs: number,
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', {
      context: options.context,
      cause: options.cause,
    });
    this.timeoutMs = timeoutMs;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Maps HTTP status codes to appropriate error classes.
 */
export function createErrorFromResponse(
  statusCode: number,
  errorDetails?: ErrorDetails
): ReadyLayerError {
  const message = errorDetails?.message ?? `HTTP ${statusCode}`;
  const context = errorDetails?.context;
  const validationErrors = errorDetails?.errors;

  switch (statusCode) {
    case 400:
      return new BadRequestError(message, { context, validationErrors });
    case 401:
      return new AuthenticationError(message, { context });
    case 402:
      return new PaymentRequiredError(message, { context });
    case 403:
      return new PermissionError(message, { context });
    case 404:
      return new NotFoundError(message, { context });
    case 409:
      return new ConflictError(message, { context });
    case 422:
      return new UnprocessableError(message, { context });
    case 429:
      return new RateLimitError(message, { context });
    case 503:
      return new ServiceUnavailableError(message, { context });
    default:
      if (statusCode >= 500) {
        return new ServerError(message, { statusCode, context });
      }
      return new ReadyLayerError(message, `HTTP_${statusCode}`, {
        statusCode,
        context,
      });
  }
}
