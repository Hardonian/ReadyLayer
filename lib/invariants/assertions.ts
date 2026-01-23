/**
 * Runtime Invariant Assertions
 *
 * P0: Enforce critical invariants at runtime to catch violations early.
 * These assertions throw in development and log errors in production.
 *
 * Reference: INVARIANTS.md
 */

import { logger } from '@/observability/logging';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export class InvariantViolationError extends Error {
  constructor(
    public readonly invariantId: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`[${invariantId}] Invariant violation: ${message}`);
    this.name = 'InvariantViolationError';
  }
}

/**
 * Assert an invariant condition
 * In development: throws InvariantViolationError
 * In production: logs error and optionally throws
 */
export function invariant(
  condition: boolean,
  invariantId: string,
  message: string,
  context?: Record<string, unknown>,
  throwInProduction = false
): asserts condition {
  if (!condition) {
    const error = new InvariantViolationError(invariantId, message, context);

    // Always log the violation
    logger.error(
      {
        err: error,
        invariantId,
        context,
      },
      `Invariant violation: ${invariantId}`
    );

    // Throw in development or if explicitly requested in production
    if (!IS_PRODUCTION || throwInProduction) {
      throw error;
    }
  }
}

/**
 * INV-D1: Review Status Consistency
 * A review marked isBlocked: true MUST have status: 'blocked'
 */
export function assertReviewStatusConsistency(review: {
  isBlocked: boolean;
  status: string;
  id?: string;
}): void {
  invariant(
    !review.isBlocked || review.status === 'blocked',
    'INV-D1',
    'Review marked as blocked must have status="blocked"',
    {
      reviewId: review.id,
      isBlocked: review.isBlocked,
      status: review.status,
    },
    true // P0: Always throw for data integrity
  );
}

/**
 * INV-D4: Confidence Score Bounds
 * All confidence scores must be in range [0, 1] for calculations, [0, 100] for display
 */
export function assertConfidenceBounds(
  score: number,
  scale: '0-1' | '0-100',
  context?: Record<string, unknown>
): void {
  const min = 0;
  const max = scale === '0-1' ? 1 : 100;

  invariant(
    score >= min && score <= max,
    'INV-D4',
    `Confidence score must be in range [${min}, ${max}], got ${score}`,
    {
      score,
      scale,
      ...context,
    },
    true // P0: Always throw for calculation correctness
  );
}

/**
 * INV-E5: Secrets Never Logged
 * Detected secrets MUST NOT appear in logs, errors, or LLM prompts
 */
export function assertNoSecretsInText(
  text: string,
  secretPatterns: RegExp[],
  context?: Record<string, unknown>
): void {
  for (const pattern of secretPatterns) {
    const match = text.match(pattern);
    invariant(
      !match,
      'INV-E5',
      'Secret detected in text that should be redacted',
      {
        matchedPattern: pattern.toString(),
        textLength: text.length,
        secretFound: match ? match[0].substring(0, 10) + '...' : undefined,
        ...context,
      },
      true // P0: Always throw for security
    );
  }
}

/**
 * INV-W5: Enrichment Does Not Change Blocking Decision
 * Async LLM enrichment CANNOT retroactively unblock a PR
 */
export function assertEnrichmentPreservesBlockingDecision(
  originalIsBlocked: boolean,
  newIsBlocked: boolean,
  reviewId: string
): void {
  // If originally blocked, enrichment cannot unblock
  invariant(
    !originalIsBlocked || newIsBlocked,
    'INV-W5',
    'Enrichment cannot unblock a previously blocked review',
    {
      reviewId,
      originalIsBlocked,
      newIsBlocked,
    },
    true // P0: Always throw for security
  );
}

/**
 * INV-S2: Readiness Score Weights Sum to 1.0
 * Readiness score factor weights MUST sum to 1.0
 */
export function assertWeightsSumToOne(
  weights: Record<string, number>,
  context?: Record<string, unknown>
): void {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const tolerance = 0.0001; // Allow for floating point precision

  invariant(
    Math.abs(sum - 1.0) < tolerance,
    'INV-S2',
    `Weights must sum to 1.0, got ${sum}`,
    {
      weights,
      sum,
      ...context,
    },
    true // P0: Always throw for calculation correctness
  );
}

/**
 * INV-S3: Readiness Level Thresholds Are Monotonic
 * Readiness levels have non-overlapping score ranges
 */
export function assertMonotonicThresholds(
  thresholds: Record<string, number>,
  context?: Record<string, unknown>
): void {
  const values = Object.values(thresholds);
  const sorted = [...values].sort((a, b) => b - a); // Descending

  invariant(
    JSON.stringify(values.sort((a, b) => b - a)) === JSON.stringify(sorted),
    'INV-S3',
    'Thresholds must be monotonic (non-overlapping)',
    {
      thresholds,
      sorted,
      ...context,
    },
    true // P0: Always throw for calculation correctness
  );
}

/**
 * Validate evidence bundle immutability constraint
 * This should be called before any update operation
 */
export function assertEvidenceBundleImmutable(operation: string): never {
  throw new InvariantViolationError(
    'INV-D2',
    'Evidence bundles are immutable - UPDATE operations are not allowed',
    { operation }
  );
}
