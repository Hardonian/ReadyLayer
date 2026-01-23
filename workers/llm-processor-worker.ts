/**
 * LLM Processor Worker
 * 
 * Background worker for asynchronous LLM enrichment of reviews.
 * - Processes queued LLM enrichment jobs
 * - Handles timeouts and retries
 * - Updates review with enriched issues
 * - Tracks metrics for observability
 * 
 * Run: node -r tsx workers/llm-processor-worker.ts
 */

import { queueService } from '../queue';
import { processLLMEnrichment, type LLMEnrichmentResult, type ReviewIssue } from '../services/review-guard/async-processor';
import { prisma } from '../lib/prisma';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';
import { toJsonValue } from '../lib/prisma-json';

const LLM_TIMEOUT_MS = 60000; // 60 seconds
const MAX_RETRIES = 3;
const QUEUE_NAME = 'llm-enrichment';

/**
 * Start the LLM processor worker
 */
export async function startLLMProcessorWorker(): Promise<void> {
  logger.info('Starting LLM Processor Worker');

  await queueService.processQueue(QUEUE_NAME, async (payload) => {
    return processLLMJob(payload as LLMJobPayload);
  });
}

interface LLMJobPayload {
  reviewId: string;
  repositoryId: string;
  organizationId: string;
  filePath: string;
  fileContent: string;
  staticIssues: ReviewIssue[];
}

/**
 * Process a single LLM enrichment job
 */
async function processLLMJob(payload: LLMJobPayload): Promise<void> {
  const {
    reviewId,
    repositoryId,
    organizationId,
    filePath,
    fileContent,
    staticIssues,
  } = payload;

  const requestId = `worker_${reviewId}_${Date.now()}`;

  try {
    logger.info(
      { reviewId, filePath, requestId },
      'Processing LLM enrichment job'
    );

    metrics.increment('llm_job_started');

    // Process LLM enrichment with timeout
    const result = await processLLMEnrichment(
      {
        reviewId,
        repositoryId,
        organizationId,
        filePath,
        fileContent,
        staticIssues,
      },
      LLM_TIMEOUT_MS
    );

    // Update review with enrichment result
    await updateReviewWithEnrichment(reviewId, result);

    metrics.increment('llm_job_completed');

    logger.info(
      { reviewId, filePath, durationMs: result.durationMs, issueCount: result.aiIssues.length, requestId },
      'LLM enrichment job completed'
    );
  } catch (error) {
    metrics.increment('llm_job_failed');

    logger.error(
      {
        reviewId,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      'LLM enrichment job failed'
    );

    // Mark job as failed (queue will handle retries)
    throw error;
  }
}

/**
 * Update review with enrichment results
 */
async function updateReviewWithEnrichment(
  reviewId: string,
  enrichmentResult: LLMEnrichmentResult
): Promise<void> {
  // Get current review
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      result: true,
      id: true,
    },
  });

  if (!review) {
    logger.warn({ reviewId }, 'Review not found for enrichment update');
    return;
  }

  // Store enrichment data in the result JSON field
  const currentResult = (review.result as Record<string, unknown> | null) || {};
  const enrichedFiles = ((currentResult.enrichedFiles as number | undefined) || 0) + 1;
  const totalFiles = (currentResult.totalFiles as number | undefined) || 0;

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      result: toJsonValue({
        ...currentResult,
        enrichedFiles,
        enrichmentResult: enrichmentResult,
        lastEnrichedFile: enrichmentResult.filePath,
        lastEnrichedAt: new Date().toISOString(),
        status: enrichedFiles >= totalFiles ? 'enrichment_complete' : 'enriching',
      }),
    },
  });

  logger.debug(
    { reviewId, enrichedFiles, totalFiles },
    'Review updated with enrichment result'
  );
}

/**
 * Enqueue LLM enrichment job
 */
export async function enqueueLLMEnrichment(
  reviewId: string,
  repositoryId: string,
  organizationId: string,
  filePath: string,
  fileContent: string,
  staticIssues: ReviewIssue[]
): Promise<string> {
  const jobId = await queueService.enqueue(QUEUE_NAME, {
    type: 'llm-enrichment',
    data: {
      reviewId,
      repositoryId,
      organizationId,
      filePath,
      fileContent,
      staticIssues,
    },
    idempotencyKey: `llm_${reviewId}_${filePath}`,
    maxRetries: MAX_RETRIES,
    organizationId,
  });

  logger.debug(
    { jobId, reviewId, filePath },
    'LLM enrichment job enqueued'
  );

  metrics.increment('llm_job_enqueued');

  return jobId;
}

/**
 * Get processor stats
 */
export async function getLLMProcessorStats(): Promise<{
  activeJobs: number;
  failedJobs: number;
  completedJobs: number;
  avgProcessingTimeMs: number;
}> {
  // Would query metrics/database for stats
  return {
    activeJobs: 0,
    failedJobs: 0,
    completedJobs: 0,
    avgProcessingTimeMs: 0,
  };
}

// Start worker if this file is run directly
if (require.main === module) {
  startLLMProcessorWorker().catch((error) => {
    logger.error(error, 'LLM Processor Worker failed to start');
    process.exit(1);
  });
}

export default startLLMProcessorWorker;
