/**
 * Database Guard Utilities
 * 
 * Provides graceful degradation when backend components are missing or misconfigured.
 * Never hard-500 user routes - return friendly errors instead.
 */

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logger } from './logger';

export interface DatabaseGuardResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    userMessage: string;
    diagnostic?: string;
  };
}

/**
 * Check if a database error indicates a missing table or schema issue
 */
function isSchemaError(error: unknown): boolean {
  if (error instanceof PrismaClientKnownRequestError) {
    // P2021: Table does not exist
    // P2022: Column does not exist
    // P2023: Foreign key constraint failed (might indicate missing table)
    return ['P2021', 'P2022', 'P2023'].includes(error.code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('does not exist') ||
      message.includes('relation') ||
      message.includes('table') ||
      message.includes('column') ||
      message.includes('schema')
    );
  }

  return false;
}

/**
 * Wrap a database operation with graceful error handling
 */
export async function withDatabaseGuard<T>(
  operation: () => Promise<T>,
  context: { operation: string; resource?: string }
): Promise<DatabaseGuardResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
      ...context,
    }, `Database operation failed: ${context.operation}`);

    if (isSchemaError(error)) {
      return {
        success: false,
        error: {
          code: 'DATABASE_SCHEMA_ERROR',
          message: error instanceof Error ? error.message : 'Database schema error',
          userMessage: 'The database is not properly configured. Please contact support.',
          diagnostic: `Schema error in ${context.operation}: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }

    // Other database errors (connection, constraint violations, etc.)
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        userMessage: 'A database error occurred. Please try again later.',
        diagnostic: `Database error in ${context.operation}: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

/**
 * Check if required tables exist (for runtime validation)
 */
export async function checkRequiredTables(
  prisma: any,
  tables: string[]
): Promise<{ exists: boolean; missing: string[] }> {
  try {
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY(${tables}::text[])
    `;

    const foundTables = new Set(result.map((t: { tablename: string }) => t.tablename));
    const missing = tables.filter(t => !foundTables.has(t));

    return {
      exists: missing.length === 0,
      missing,
    };
  } catch (error) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
    }, 'Failed to check required tables');
    return {
      exists: false,
      missing: tables, // Assume all missing if check fails
    };
  }
}
