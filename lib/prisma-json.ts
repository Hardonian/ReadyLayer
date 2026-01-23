/**
 * Prisma JSON Type Helpers
 *
 * TypeScript-safe utilities for working with Prisma's InputJsonValue type.
 * These helpers ensure type safety when storing complex objects as JSON in the database.
 */

import { Prisma } from '@prisma/client';

/**
 * Safely converts a value to Prisma InputJsonValue
 *
 * @param value - Any value to convert to JSON
 * @returns The value cast as InputJsonValue (safe for Prisma JSON fields)
 */
export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) {
    return Prisma.DbNull as unknown as Prisma.InputJsonValue;
  }

  if (value === null) {
    return Prisma.DbNull as unknown as Prisma.InputJsonValue;
  }

  // For primitives, arrays, and objects, cast to InputJsonValue
  return value as Prisma.InputJsonValue;
}

/**
 * Safely converts a value to nullable JSON
 *
 * @param value - Any value to convert to JSON or null
 * @returns The value as InputJsonValue or null
 */
export function toNullableJsonValue(
  value: unknown
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === null) {
    return Prisma.DbNull;
  }

  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

/**
 * Parse JSON value from database
 *
 * @param value - JSON value from database
 * @returns Parsed value with proper typing
 */
export function fromJsonValue<T = unknown>(value: Prisma.JsonValue | null): T | null {
  if (value === null) {
    return null;
  }

  return value as T;
}
