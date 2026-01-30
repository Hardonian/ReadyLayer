/**
 * Safe JSON parsing utilities
 *
 * Provides error-safe JSON parsing with fallback values and validation.
 * Prevents hard 500 errors from malformed LLM responses and user input.
 */

import { logger } from '@/observability/logging';

export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Safely parse JSON with try/catch and optional validation
 *
 * @param input - String to parse
 * @param fallback - Fallback value if parsing fails
 * @param validator - Optional validation function
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(
  input: string,
  fallback: T,
  validator?: (value: unknown) => value is T
): T {
  try {
    const parsed: unknown = JSON.parse(input);

    // If validator provided, check if parsed value is valid
    if (validator && !validator(parsed)) {
      logger.warn('JSON parsed but failed validation', {
        input: input.substring(0, 100),
      });
      return fallback;
    }

    return parsed as T;
  } catch (error) {
    logger.warn('JSON parse failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input: input.substring(0, 100),
    });
    return fallback;
  }
}

/**
 * Safely parse JSON and return Result type
 *
 * @param input - String to parse
 * @returns Result object with success flag and data or error
 */
export function safeJsonParseResult<T>(input: string): SafeParseResult<T> {
  try {
    const data = JSON.parse(input) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('JSON parse failed'),
    };
  }
}

/**
 * Extract and safely parse JSON from LLM response text
 * Handles common LLM response patterns:
 * - JSON wrapped in markdown code blocks (```json ... ```)
 * - JSON with surrounding text
 * - Multiple JSON objects
 *
 * @param text - LLM response text
 * @param fallback - Fallback value if no valid JSON found
 * @returns Parsed JSON or fallback
 */
export function extractAndParseJson<T>(text: string, fallback: T): T {
  try {
    // Try direct parse first
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return safeJsonParse(codeBlockMatch[1], fallback);
    }

    // Try to find JSON object in text (first { to matching })
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return safeJsonParse(jsonMatch[0], fallback);
    }

    // Try to find JSON array in text (first [ to matching ])
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return safeJsonParse(arrayMatch[0], fallback);
    }

    logger.warn('No JSON found in LLM response', {
      text: text.substring(0, 200),
    });
    return fallback;
  }
}
