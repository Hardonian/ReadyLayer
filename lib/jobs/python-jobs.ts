/**
 * Python job enqueue API for TypeScript/Next.js
 *
 * This module provides a clean interface for enqueueing Python-specific
 * jobs from the Next.js application.
 */

import { queueService } from '@/queue';
import { logger } from '@/observability/logging';

/**
 * Python job types handled by the Python workhorse
 */
export type PythonJobType =
  | 'python.report.generate'
  | 'python.batch.export'
  | 'python.analytics.score'
  | 'python.ingest.document'
  | 'python.reconcile.violations';

/**
 * Base payload for all Python jobs
 */
export interface PythonJobPayload {
  /** Organization ID (required for tenant isolation) */
  organizationId: string;
  /** User ID for audit trail (optional) */
  userId?: string;
  /** Repository ID for repo-scoped jobs (optional) */
  repositoryId?: string;
  /** Job-specific parameters */
  parameters: Record<string, unknown>;
  /** Priority 1-5, default 3 (optional) */
  priority?: number;
  /** Timeout in seconds, default 300 (optional) */
  timeoutSeconds?: number;
}

/**
 * Enqueue a Python job
 *
 * @param type - The Python job type
 * @param payload - Job parameters including organizationId
 * @returns Job ID that can be used to poll for status
 * @throws Error if organizationId is missing or enqueue fails
 */
export async function enqueuePythonJob(
  type: PythonJobType,
  payload: PythonJobPayload
): Promise<string> {
  // Validate required fields
  if (!payload.organizationId) {
    throw new Error('organizationId is required for Python jobs (tenant isolation)');
  }

  // Log enqueue attempt (without sensitive data)
  logger.info({
    msg: 'Enqueueing Python job',
    jobType: type,
    organizationId: payload.organizationId,
    repositoryId: payload.repositoryId,
  });

  try {
    // Enqueue via existing queue service
    const jobId = await queueService.enqueue(type, {
      type,
      data: payload,
      organizationId: payload.organizationId,
      userId: payload.userId,
      maxRetries: 3,
    });

    logger.info({
      msg: 'Python job enqueued successfully',
      jobId,
      jobType: type,
    });

    return jobId;
  } catch (error) {
    logger.error({
      msg: 'Failed to enqueue Python job',
      jobType: type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Convenience functions for specific job types
 */

/**
 * Generate a PDF/SARIF report
 */
export async function enqueueReportGeneration(params: {
  organizationId: string;
  repositoryId?: string;
  reviewId?: string;
  format: 'pdf' | 'sarif' | 'json';
  includeEvidence?: boolean;
  userId?: string;
}): Promise<string> {
  return enqueuePythonJob('python.report.generate', {
    organizationId: params.organizationId,
    repositoryId: params.repositoryId,
    userId: params.userId,
    parameters: {
      format: params.format,
      reviewId: params.reviewId,
      includeEvidence: params.includeEvidence ?? true,
    },
  });
}

/**
 * Export bulk data
 */
export async function enqueueBatchExport(params: {
  organizationId: string;
  entityType: 'reviews' | 'violations' | 'tests';
  dateRange: { from: string; to: string };
  format: 'csv' | 'json';
  userId?: string;
}): Promise<string> {
  return enqueuePythonJob('python.batch.export', {
    organizationId: params.organizationId,
    userId: params.userId,
    parameters: {
      entityType: params.entityType,
      dateRange: params.dateRange,
      format: params.format,
    },
  });
}

/**
 * Calculate AI risk exposure score
 */
export async function enqueueAnalyticsScoring(params: {
  organizationId: string;
  metric?: 'ai_risk_exposure' | 'readiness_score' | 'policy_compliance';
  repositories?: string[];
  period?: '30d' | '90d' | '1y';
  userId?: string;
}): Promise<string> {
  return enqueuePythonJob('python.analytics.score', {
    organizationId: params.organizationId,
    userId: params.userId,
    parameters: {
      metric: params.metric ?? 'ai_risk_exposure',
      repositories: params.repositories,
      period: params.period ?? '30d',
    },
  });
}

/**
 * Ingest large documents for RAG
 */
export async function enqueueDocumentIngest(params: {
  organizationId: string;
  repositoryId?: string;
  documentUrl: string;
  documentType: 'pdf' | 'html' | 'markdown';
  chunkSize?: number;
  chunkOverlap?: number;
  userId?: string;
}): Promise<string> {
  return enqueuePythonJob('python.ingest.document', {
    organizationId: params.organizationId,
    repositoryId: params.repositoryId,
    userId: params.userId,
    parameters: {
      documentUrl: params.documentUrl,
      documentType: params.documentType,
      chunkSize: params.chunkSize ?? 1000,
      chunkOverlap: params.chunkOverlap ?? 200,
    },
  });
}

/**
 * Reconcile violations across repositories
 */
export async function enqueueViolationReconcile(params: {
  organizationId: string;
  repositories?: string[];
  timeWindow?: '30d' | '90d';
  patternTypes?: string[];
  userId?: string;
}): Promise<string> {
  return enqueuePythonJob('python.reconcile.violations', {
    organizationId: params.organizationId,
    userId: params.userId,
    parameters: {
      repositories: params.repositories,
      timeWindow: params.timeWindow ?? '30d',
      patternTypes: params.patternTypes ?? ['repeated_violation', 'emerging_threat'],
    },
  });
}
