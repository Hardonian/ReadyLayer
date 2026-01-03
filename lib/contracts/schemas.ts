/**
 * Contract Schemas
 * 
 * Runtime validation schemas for critical API endpoints.
 * Ensures request/response shapes match expectations and prevents drift.
 */

import { z } from 'zod';

/**
 * Run creation request schema
 */
export const createRunRequestSchema = z.object({
  repositoryId: z.string().optional(),
  sandboxId: z.string().optional(),
  trigger: z.enum(['webhook', 'manual', 'sandbox']),
  triggerMetadata: z.object({
    prNumber: z.number().optional(),
    prSha: z.string().optional(),
    prTitle: z.string().optional(),
    diff: z.string().optional(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      beforeContent: z.string().nullable().optional(),
    })).optional(),
    userId: z.string().optional(),
  }).optional(),
  config: z.object({
    skipReviewGuard: z.boolean().optional(),
    skipTestEngine: z.boolean().optional(),
    skipDocSync: z.boolean().optional(),
  }).optional(),
});

/**
 * Run response schema
 */
export const runResponseSchema = z.object({
  id: z.string(),
  correlationId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  conclusion: z.enum(['success', 'failure', 'partial_success', 'cancelled']).optional(),
  reviewGuardStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  testEngineStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  docSyncStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  reviewGuardResult: z.object({
    reviewId: z.string().optional(),
    issuesFound: z.number(),
    isBlocked: z.boolean(),
    summary: z.object({
      total: z.number(),
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
  }).optional(),
  testEngineResult: z.object({
    testsGenerated: z.number(),
    coverage: z.object({
      lines: z.number(),
      branches: z.number(),
      functions: z.number(),
    }).optional(),
    meetsThreshold: z.boolean(),
  }).optional(),
  docSyncResult: z.object({
    docId: z.string().optional(),
    driftDetected: z.boolean(),
    missingEndpoints: z.number(),
    changedEndpoints: z.number(),
  }).optional(),
  aiTouchedDetected: z.boolean(),
  aiTouchedFiles: z.array(z.object({
    path: z.string(),
    confidence: z.number(),
    methods: z.array(z.string()),
  })).optional(),
  gatesPassed: z.boolean(),
  gatesFailed: z.array(z.object({
    gate: z.string(),
    reason: z.string(),
  })).optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  reviewGuardStartedAt: z.string().optional(),
  reviewGuardCompletedAt: z.string().optional(),
  testEngineStartedAt: z.string().optional(),
  testEngineCompletedAt: z.string().optional(),
  docSyncStartedAt: z.string().optional(),
  docSyncCompletedAt: z.string().optional(),
});

/**
 * Runs list response schema
 */
export const runsListResponseSchema = z.object({
  data: z.array(runResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }).optional(),
});

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    context: z.record(z.unknown()).optional(),
  }),
});

/**
 * Validate request against schema
 */
export function validateRequest<T>(data: unknown, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate response against schema (for testing)
 */
export function validateResponse<T>(data: unknown, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodError } {
  return validateRequest(data, schema);
}
