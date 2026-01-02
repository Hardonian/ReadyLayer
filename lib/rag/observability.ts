/**
 * RAG Observability
 * 
 * Structured logging for RAG operations
 */

import { logger } from '../logger';

export interface RagLogContext {
  organizationId?: string;
  repositoryId?: string;
  documentId?: string;
  sourceType?: string;
  query?: string;
  traceId?: string;
  [key: string]: unknown;
}

/**
 * Log RAG ingestion started
 */
export function logIngestStarted(context: RagLogContext): void {
  logger.info({
    ...context,
    event: 'rag.ingest.started',
  });
}

/**
 * Log RAG ingestion completed
 */
export function logIngestCompleted(
  context: RagLogContext & {
    chunksStored: number;
    mode: string;
    durationMs: number;
  }
): void {
  logger.info({
    ...context,
    event: 'rag.ingest.completed',
  });
}

/**
 * Log RAG ingestion failed
 */
export function logIngestFailed(
  context: RagLogContext & { error: string }
): void {
  logger.error({
    ...context,
    event: 'rag.ingest.failed',
  });
}

/**
 * Log RAG query started
 */
export function logQueryStarted(context: RagLogContext): void {
  logger.info({
    ...context,
    event: 'rag.query.started',
  });
}

/**
 * Log RAG query completed
 */
export function logQueryCompleted(
  context: RagLogContext & {
    resultCount: number;
    mode: string;
    durationMs: number;
  }
): void {
  logger.info({
    ...context,
    event: 'rag.query.completed',
  });
}

/**
 * Log RAG query failed
 */
export function logQueryFailed(
  context: RagLogContext & { error: string }
): void {
  logger.error({
    ...context,
    event: 'rag.query.failed',
  });
}

/**
 * Log fallback used (vector -> lexical or embeddings unavailable)
 */
export function logFallbackUsed(
  context: RagLogContext & { reason: string }
): void {
  logger.warn({
    ...context,
    event: 'rag.fallback.used',
  });
}
