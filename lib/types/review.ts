/**
 * Review & Review Guard Type Definitions
 * 
 * Centralized types for all review-related data structures.
 * Exports both Zod schemas and inferred TypeScript types for type-safe validation.
 * 
 * ARCHITECTURE:
 * - Schemas provide runtime validation (server & client)
 * - Inferred types provide compile-time safety
 * - Discriminated unions for different review states/kinds
 */

import { z } from 'zod'

/**
 * Severity levels for findings
 */
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export type Severity = z.infer<typeof SeveritySchema>

/**
 * Finding status (resolved, acknowledged, etc.)
 */
export const FindingStatusSchema = z.enum(['open', 'acknowledged', 'resolved', 'ignored'])
export type FindingStatus = z.infer<typeof FindingStatusSchema>

/**
 * Individual security/quality/performance finding
 */
export const FindingSchema = z.object({
  id: z.string().min(1, 'Finding ID required'),
  ruleId: z.string().min(1, 'Rule ID required'),
  title: z.string().min(1, 'Finding title required'),
  description: z.string(),
  severity: SeveritySchema,
  status: FindingStatusSchema,
  file: z.string().optional(),
  line: z.number().int().optional(),
  confidence: z.number().min(0).max(1).describe('Model confidence 0-1'),
  detectedBy: z.enum(['ai', 'human', 'policy']).optional(),
  remediation: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // Governance & variance metadata
  modelId: z.string().optional().describe('Model that generated this finding'),
  modelEpoch: z.string().optional().describe('ISO timestamp or semantic version of model'),
  variance_score: z.number().min(0).max(1).optional().describe('Multi-model disagreement score'),
  intent_drift: z.object({
    score: z.number().min(0).max(1),
    category: z.enum(['high', 'medium', 'low', 'none']),
    signals: z.array(z.string()).optional(),
  }).optional(),
  confidence_inflation_risk: z.object({
    score: z.number().min(0).max(1),
    quadrant: z.enum(['confident+stable', 'confident+unstable', 'cautious+stable', 'cautious+unstable']),
  }).optional(),
  temporal_fragility: z.object({
    tag: z.enum(['fresh', 'stale-14d', 'stale-90d', 'deprecated']),
    age_days: z.number().int(),
  }).optional(),
  negative_space_risk: z.object({
    type: z.enum(['missing-auth', 'missing-ratelimit', 'missing-timeout', 'missing-errorbound']),
    severity: SeveritySchema,
    recommendation: z.string(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type Finding = z.infer<typeof FindingSchema>

/**
 * Review Guard scan result (security, performance, quality)
 */
export const ReviewGuardScanTypeSchema = z.enum(['security', 'performance', 'quality'])
export type ReviewGuardScanType = z.infer<typeof ReviewGuardScanTypeSchema>

export const ReviewGuardScanSchema = z.object({
  id: z.string(),
  type: ReviewGuardScanTypeSchema,
  title: z.string(),
  status: z.enum(['passed', 'failed', 'warning', 'skipped']),
  findings: z.array(FindingSchema).default([]),
  fingerprintHash: z.string().optional().describe('Deterministic scan hash for reproducibility'),
  policyVersion: z.string().optional(),
  detectionType: z.enum(['deterministic', 'ai-assisted', 'manual']).optional(),
  executedAt: z.coerce.date(),
  durationMs: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ReviewGuardScan = z.infer<typeof ReviewGuardScanSchema>

/**
 * Test Engine result
 */
export const TestEngineResultSchema = z.object({
  id: z.string(),
  status: z.enum(['passed', 'failed', 'skipped']),
  totalTests: z.number().int(),
  passedTests: z.number().int(),
  failedTests: z.number().int(),
  coverage: z.number().min(0).max(100).optional(),
  coverageDelta: z.number().optional().describe('% change from baseline'),
  generatedTests: z.number().int().default(0),
  updatedTests: z.number().int().default(0),
  executedAt: z.coerce.date(),
  durationMs: z.number().int().optional(),
  findings: z.array(FindingSchema).default([]),
  artifacts: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.enum(['test', 'coverage-report', 'log']),
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type TestEngineResult = z.infer<typeof TestEngineResultSchema>

/**
 * Doc Sync result
 */
export const DocSyncResultSchema = z.object({
  id: z.string(),
  status: z.enum(['in-sync', 'drift', 'error']),
  docsUpdated: z.number().int(),
  docsRemoved: z.number().int(),
  docsAdded: z.number().int(),
  findings: z.array(FindingSchema).default([]),
  executedAt: z.coerce.date(),
  durationMs: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type DocSyncResult = z.infer<typeof DocSyncResultSchema>

/**
 * Review Kind discriminator
 * Allows proper type narrowing for different review types
 */
export const ReviewKindSchema = z.enum([
  'review-guard',
  'test-engine',
  'doc-sync',
  'composite',
])
export type ReviewKind = z.infer<typeof ReviewKindSchema>

/**
 * Review status
 */
export const ReviewStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>

/**
 * Base Review object
 */
export const ReviewBaseSchema = z.object({
  id: z.string().min(1, 'Review ID required'),
  kind: ReviewKindSchema,
  status: ReviewStatusSchema,
  title: z.string(),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  repositoryId: z.string(),
  prNumber: z.number().int().optional(),
  commitHash: z.string().optional(),
  branch: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  durationMs: z.number().int().optional(),
  detectionMode: z.enum(['deterministic', 'ai-assisted']).optional(),
  deterministic: z.boolean().optional().describe('Marked as deterministic/reproducible'),
  signed: z.boolean().optional().describe('Cryptographically signed'),
  signatureHash: z.string().optional().describe('SHA256 signature for verification'),
  createdBy: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ReviewBase = z.infer<typeof ReviewBaseSchema>

/**
 * Review Guard composite review
 */
export const ReviewGuardReviewSchema = ReviewBaseSchema.extend({
  kind: z.literal('review-guard'),
  securityScan: ReviewGuardScanSchema.optional(),
  performanceScan: ReviewGuardScanSchema.optional(),
  qualityScan: ReviewGuardScanSchema.optional(),
})

export type ReviewGuardReview = z.infer<typeof ReviewGuardReviewSchema>

/**
 * Test Engine review
 */
export const TestEngineReviewSchema = ReviewBaseSchema.extend({
  kind: z.literal('test-engine'),
  result: TestEngineResultSchema,
})

export type TestEngineReview = z.infer<typeof TestEngineReviewSchema>

/**
 * Doc Sync review
 */
export const DocSyncReviewSchema = ReviewBaseSchema.extend({
  kind: z.literal('doc-sync'),
  result: DocSyncResultSchema,
})

export type DocSyncReview = z.infer<typeof DocSyncReviewSchema>

/**
 * Composite review containing all types
 */
export const CompositeReviewSchema = ReviewBaseSchema.extend({
  kind: z.literal('composite'),
  reviewGuard: ReviewGuardReviewSchema.optional(),
  testEngine: TestEngineReviewSchema.optional(),
  docSync: DocSyncReviewSchema.optional(),
})

export type CompositeReview = z.infer<typeof CompositeReviewSchema>

/**
 * Discriminated union for all review types
 */
export const ReviewSchema = z.discriminatedUnion('kind', [
  ReviewGuardReviewSchema,
  TestEngineReviewSchema,
  DocSyncReviewSchema,
  CompositeReviewSchema,
])

export type Review = z.infer<typeof ReviewSchema>

/**
 * Type guards for narrowing review types
 */
export function isReviewGuardReview(review: Review): review is ReviewGuardReview {
  return review.kind === 'review-guard'
}

export function isTestEngineReview(review: Review): review is TestEngineReview {
  return review.kind === 'test-engine'
}

export function isDocSyncReview(review: Review): review is DocSyncReview {
  return review.kind === 'doc-sync'
}

export function isCompositeReview(review: Review): review is CompositeReview {
  return review.kind === 'composite'
}

/**
 * Review List Response
 */
export const ReviewListSchema = z.array(ReviewSchema)
export type ReviewList = z.infer<typeof ReviewListSchema>

/**
 * API Response schemas for reviews
 */
export const ReviewApiResponseSchema = z.object({
  data: ReviewSchema,
})

export const ReviewListApiResponseSchema = z.object({
  data: ReviewListSchema,
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }).optional(),
})
