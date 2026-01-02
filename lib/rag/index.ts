/**
 * Evidence RAG Layer
 * 
 * Main export for RAG functionality
 */

import { env } from '../env';
import { getRagStore } from './store';
import { getCachedResults, cacheResults } from './cache';
import {
  logIngestStarted,
  logIngestCompleted,
  logIngestFailed,
  logQueryStarted,
  logQueryCompleted,
  logQueryFailed,
  logFallbackUsed,
} from './observability';
import type {
  RagDocumentInput,
  RagIngestResult,
  RagQuery,
  RagResult,
} from './types';

/**
 * Check if RAG is enabled
 */
export function isRagEnabled(): boolean {
  return env.RAG_ENABLED === true;
}

/**
 * Check if RAG ingestion is enabled
 */
export function isIngestEnabled(): boolean {
  return isRagEnabled() && env.RAG_INGEST_ENABLED === true;
}

/**
 * Check if RAG query is enabled
 */
export function isQueryEnabled(): boolean {
  return isRagEnabled() && env.RAG_QUERY_ENABLED === true;
}

/**
 * Ingest document into evidence index
 */
export async function ingestDocument(
  input: RagDocumentInput,
  traceId?: string
): Promise<RagIngestResult> {
  if (!isIngestEnabled()) {
    return {
      documentId: '',
      chunksStored: 0,
      mode: 'disabled',
      embeddingStatus: 'disabled',
    };
  }

  const startTime = Date.now();
  logIngestStarted({
    organizationId: input.organizationId,
    repositoryId: input.repositoryId,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    traceId,
  });

  try {
    const store = getRagStore();
    const result = await store.upsertDocumentAndChunks(input);

    logIngestCompleted({
      organizationId: input.organizationId,
      repositoryId: input.repositoryId,
      documentId: result.documentId,
      sourceType: input.sourceType,
      chunksStored: result.chunksStored,
      mode: result.mode,
      durationMs: Date.now() - startTime,
      traceId,
    });

    return result;
  } catch (error) {
    logIngestFailed({
      organizationId: input.organizationId,
      repositoryId: input.repositoryId,
      sourceType: input.sourceType,
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId,
    });

    // Don't throw - graceful degradation
    return {
      documentId: '',
      chunksStored: 0,
      mode: 'disabled',
      embeddingStatus: 'failed',
    };
  }
}

/**
 * Query evidence index
 */
export async function queryEvidence(
  query: RagQuery,
  traceId?: string
): Promise<RagResult[]> {
  if (!isQueryEnabled()) {
    return [];
  }

  const startTime = Date.now();
  logQueryStarted({
    organizationId: query.organizationId,
    repositoryId: query.repositoryId,
    query: query.queryText,
    traceId,
  });

  try {
    // Check cache first
    const cached = getCachedResults(query);
    if (cached) {
      logQueryCompleted({
        organizationId: query.organizationId,
        repositoryId: query.repositoryId,
        resultCount: cached.length,
        mode: 'cached',
        durationMs: Date.now() - startTime,
        traceId,
      });
      return cached;
    }

    const store = getRagStore();
    const results = await store.querySimilar(query);

    // Cache results
    cacheResults(query, results);

    logQueryCompleted({
      organizationId: query.organizationId,
      repositoryId: query.repositoryId,
      resultCount: results.length,
      mode: results.length > 0 && results[0].similarity > 0.5 ? 'vector' : 'lexical',
      durationMs: Date.now() - startTime,
      traceId,
    });

    return results;
  } catch (error) {
    logQueryFailed({
      organizationId: query.organizationId,
      repositoryId: query.repositoryId,
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId,
    });

    logFallbackUsed({
      organizationId: query.organizationId,
      repositoryId: query.repositoryId,
      reason: 'query_failed',
      traceId,
    });

    // Return empty results on error - graceful degradation
    return [];
  }
}

/**
 * Format evidence results for prompt injection
 */
export function formatEvidenceForPrompt(
  results: RagResult[],
  maxTokens: number = env.RAG_MAX_CONTEXT_TOKENS || 4000
): string {
  if (results.length === 0) {
    return '';
  }

  let formatted = '\n## Evidence\n\n';
  let tokenCount = 0;

  for (const result of results) {
    // Rough token estimate: ~4 chars per token
    const snippet = result.content.substring(0, 500); // Limit snippet length
    const citation = `[${result.sourceType}:${result.sourceRef}]`;
    const entry = `- ${citation}: ${snippet}${snippet.length < result.content.length ? '...' : ''}\n`;
    const entryTokens = Math.ceil(entry.length / 4);

    if (tokenCount + entryTokens > maxTokens) {
      break;
    }

    formatted += entry;
    tokenCount += entryTokens;
  }

  return formatted;
}

// Re-export types
export type {
  RagDocumentInput,
  RagIngestResult,
  RagQuery,
  RagResult,
  SourceType,
} from './types';
