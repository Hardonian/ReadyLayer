/**
 * API Route Helpers
 * 
 * Standardized utilities for API route handlers
 * Provides consistent error handling, validation, and response formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '../observability/logging';
import { requireAuth, AuthUser } from './auth';
import { createAuthzMiddleware, AuthzOptions } from './authz';
import {
  ApiErrorResponse,
  ErrorCodes,
  UnauthorizedError,
  ForbiddenError,
} from './errors';
import { UsageLimitExceededError } from './usage-enforcement';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Type for route handler function
 */
export type RouteHandler = (context: RouteContext) => Promise<NextResponse>;

/**
 * Request context available in route handlers
 */
export interface RouteContext {
  request: NextRequest;
  user: AuthUser;
  log: ReturnType<typeof logger.child>;
  requestId: string;
}

/**
 * Parse JSON body with proper error handling
 */
export async function parseJsonBody(
  request: NextRequest
): Promise<{ success: true; data: unknown } | { success: false; response: NextResponse }> {
  try {
    const body = (await request.json()) as unknown;
    return { success: true, data: body };
  } catch (_error) {
    return {
      success: false,
      response: errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400),
    };
  }
}

/**
 * Validate body against Zod schema
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400,
        { errors: result.error.issues }
      ),
    };
  }
  return { success: true, data: result.data };
}

/**
 * Create standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  context?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(context && { context }),
      },
    },
    { status }
  );
}

/**
 * Create standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      data: items,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    },
    { status }
  );
}

/**
 * Create route context with authentication
 */
export async function createRouteContext(
  request: NextRequest
): Promise<{ success: true; context: RouteContext } | { success: false; response: NextResponse }> {
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  const log = logger.child({ requestId });

  try {
    const user = await requireAuth(request);
    return {
      success: true,
      context: {
        request,
        user,
        log,
        requestId,
      },
    };
  } catch (_error) {
    // Handle typed auth errors
    if (_error instanceof UnauthorizedError) {
      return {
        success: false,
        response: errorResponse(_error.error.code, _error.error.message, 401, _error.error.context),
      };
    }
    if (_error instanceof ForbiddenError) {
      return {
        success: false,
        response: errorResponse(_error.error.code, _error.error.message, 403, _error.error.context),
      };
    }
    log.error(_error, 'Failed to create route context');
    return {
      success: false,
      response: errorResponse('INTERNAL_ERROR', 'Failed to authenticate', 500),
    };
  }
}

/**
 * Wrapper for API route handlers with standardized error handling
 */
export function createRouteHandler(
  handler: RouteHandler,
  options?: {
    authz?: AuthzOptions;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
    const log = logger.child({ requestId });

    try {
      // Create context
      const contextResult = await createRouteContext(request);
      if (!contextResult.success) {
        return contextResult.response;
      }
      const { context } = contextResult;

      // Check authorization if specified
      if (options?.authz) {
        const authzResponse = await createAuthzMiddleware(options.authz)(request);
        if (authzResponse) {
          return authzResponse;
        }
      }

      // Execute handler
      return await handler(context);
    } catch (_error) {
      log.error(_error, 'Route handler error');

      // Handle typed auth/permission errors first (highest priority)
      if (_error instanceof UnauthorizedError) {
        return errorResponse(_error.error.code, _error.error.message, 401, _error.error.context);
      }
      if (_error instanceof ForbiddenError) {
        return errorResponse(_error.error.code, _error.error.message, 403, _error.error.context);
      }

      // Handle generic ApiErrorResponse (includes all typed errors)
      if (_error instanceof ApiErrorResponse) {
        return errorResponse(_error.error.code, _error.error.message, _error.statusCode, _error.error.context);
      }

      // Handle usage limit errors (429/402)
      if (_error instanceof UsageLimitExceededError) {
        return errorResponse(
          'USAGE_LIMIT_EXCEEDED',
          _error.message,
          _error.httpStatus,
          {
            limitType: _error.limitType,
            current: _error.current,
            limit: _error.limit,
            remaining: _error.limit - _error.current,
          }
        );
      }

      // Handle Prisma errors (common database scenarios)
      if (_error && typeof _error === 'object' && 'code' in _error) {
        const prismaError = _error as { code: string; meta?: unknown };
        if (prismaError.code === 'P2002') {
          return errorResponse('DUPLICATE_ENTRY', 'A record with this value already exists', 409);
        }
        if (prismaError.code === 'P2025') {
          return errorResponse(ErrorCodes.NOT_FOUND, 'Record not found', 404);
        }
        // Other Prisma errors are database errors
        return errorResponse(
          ErrorCodes.DATABASE_ERROR,
          'Database operation failed',
          500,
          process.env.NODE_ENV === 'development' ? { prismaCode: prismaError.code } : undefined
        );
      }

      // Generic error fallback
      return errorResponse(
        'INTERNAL_ERROR',
        _error instanceof Error ? _error.message : 'An unexpected error occurred',
        500
      );
    }
  };
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(request: NextRequest): { limit: number; offset: number } {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  return { limit, offset };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),
  id: z.string().min(1),
  organizationId: z.string().uuid(),
  repositoryId: z.string().min(1),
  userId: z.string().uuid(),
};

/**
 * Type guard for checking if value is a valid object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Safely extract string from unknown value
 */
export function safeString(value: unknown, defaultValue?: string): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

/**
 * Safely extract number from unknown value
 */
export function safeNumber(value: unknown, defaultValue?: number): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Safely extract array from unknown value
 */
export function safeArray<T>(value: unknown, guard?: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (guard) {
    return value.filter(guard);
  }
  return value as T[];
}
