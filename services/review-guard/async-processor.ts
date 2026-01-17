/**
 * Async LLM Processor for Review Guard
 * 
 * Handles asynchronous LLM enrichment with fallback to static analysis.
 * - Separates fast static analysis from slow LLM calls
 * - Returns immediately with deterministic results
 * - Queues LLM enrichment for background processing
 * - Provides polling mechanism for frontend to check enrichment status
 */

import { prisma } from '../../lib/prisma';
import { llmService } from '../llm';
import { queryEvidence, formatEvidenceForPrompt, isQueryEnabled } from '../../lib/rag';
import { logger } from '../../observability/logging';
import { metrics } from '../../observability/metrics';
import { redactSecrets, updateRedactionStats } from '../../lib/secrets/redaction';

export interface LLMEnrichmentRequest {
  reviewId: string;
  repositoryId: string;
  organizationId: string;
  filePath: string;
  fileContent: string;
  staticIssues: any[]; // Issues from static analysis
}

export interface LLMEnrichmentResult {
  reviewId: string;
  filePath: string;
  aiIssues: any[];
  status: 'completed' | 'failed' | 'timeout';
  completedAt: Date;
  durationMs: number;
  error?: string;
}

/**
 * Process LLM enrichment with timeout and error handling
 */
export async function processLLMEnrichment(
  request: LLMEnrichmentRequest,
  timeoutMs: number = 60000 // 60 second default timeout
): Promise<LLMEnrichmentResult> {
  const startTime = Date.now();
  const requestId = `llm_${request.reviewId}_${Math.random().toString(36).slice(2, 9)}`;

  logger.info(
    { reviewId: request.reviewId, filePath: request.filePath, requestId },
    'Starting LLM enrichment'
  );

  try {
    // Check if LLM queries are enabled for this org
    const llmEnabled = isQueryEnabled(request.organizationId);
    if (!llmEnabled) {
      metrics.increment('llm_enrichment_skipped', { reason: 'disabled' });
      logger.debug({ reviewId: request.reviewId }, 'LLM queries disabled for org');
      return {
        reviewId: request.reviewId,
        filePath: request.filePath,
        aiIssues: [],
        status: 'completed',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Create timeout promise
    const timeoutPromise = new Promise<LLMEnrichmentResult>((_, reject) => {
      setTimeout(() => {
        const error = new Error(`LLM enrichment timeout after ${timeoutMs}ms`);
        reject(error);
      }, timeoutMs);
    });

    // Create enrichment promise
    const enrichmentPromise = analyzeWithLLM(request, requestId);

    // Race: enrichment vs timeout
    const result = await Promise.race([enrichmentPromise, timeoutPromise]);
    
    const durationMs = Date.now() - startTime;
    metrics.recordHistogram('llm_enrichment_duration_ms', durationMs);
    metrics.increment('llm_enrichment_success');

    logger.info(
      { reviewId: request.reviewId, durationMs, issueCount: result.aiIssues.length, requestId },
      'LLM enrichment completed'
    );

    return {
      ...result,
      completedAt: new Date(),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const isTimeout = error instanceof Error && error.message.includes('timeout');
    
    logger.warn(
      {
        reviewId: request.reviewId,
        filePath: request.filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        isTimeout,
        requestId,
      },
      'LLM enrichment failed'
    );

    metrics.increment('llm_enrichment_failed', {
      reason: isTimeout ? 'timeout' : 'error',
    });

    return {
      reviewId: request.reviewId,
      filePath: request.filePath,
      aiIssues: [],
      status: isTimeout ? 'timeout' : 'failed',
      completedAt: new Date(),
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform LLM analysis with RAG evidence
 */
async function analyzeWithLLM(
  request: LLMEnrichmentRequest,
  requestId: string
): Promise<Omit<LLMEnrichmentResult, 'completedAt' | 'durationMs'>> {
  try {
    // SECURITY: Redact secrets before sending code to LLM
    const redactionResult = redactSecrets(request.fileContent, {
      redactEmail: false,
      logDetections: true,
    });
    updateRedactionStats(redactionResult);

    const redactedCode = redactionResult.redacted;

    // Query RAG evidence if enabled (use redacted code)
    let evidence = '';
    if (isQueryEnabled(request.organizationId)) {
      const rawEvidence = await queryEvidence(
        request.repositoryId,
        redactedCode,
        request.filePath
      );
      evidence = formatEvidenceForPrompt(rawEvidence);
    }

    // Build LLM prompt with redacted code
    const prompt = buildLLMPrompt(request.filePath, redactedCode, evidence);

    // Call LLM service with REDACTED code (security critical!)
    const llmResponse = await llmService.analyzeCode({
      code: redactedCode, // Use redacted code, NEVER original
      filePath: request.filePath,
      prompt,
      context: {
        organizationId: request.organizationId,
        repositoryId: request.repositoryId,
        reviewId: request.reviewId,
      },
    });

    // Extract issues from LLM response
    const aiIssues = parseLLMResponse(llmResponse, request.filePath);

    logger.debug(
      { reviewId: request.reviewId, filePath: request.filePath, issueCount: aiIssues.length, requestId },
      'LLM analysis completed'
    );

    return {
      reviewId: request.reviewId,
      filePath: request.filePath,
      aiIssues,
      status: 'completed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { reviewId: request.reviewId, error: message, requestId },
      'LLM analysis error'
    );
    throw error;
  }
}

/**
 * Build LLM analysis prompt
 */
function buildLLMPrompt(filePath: string, fileContent: string, evidence: string): string {
  return `You are a code security and quality expert. Analyze the following code file for security vulnerabilities, performance issues, and code quality problems.

File: ${filePath}
Code:
\`\`\`
${fileContent}
\`\`\`

${evidence ? `Similar patterns from codebase:\n${evidence}\n` : ''}

Identify:
1. Security vulnerabilities (SQL injection, XSS, auth bypass, etc.)
2. Performance issues (N+1 queries, inefficient loops, etc.)
3. Code quality issues (error handling, logging, testing, etc.)

Return a JSON array with objects containing: ruleId, title, severity (critical/high/medium/low), line, message, and fix.`;
}

/**
 * Parse LLM response into issues
 */
function parseLLMResponse(response: string, filePath: string): any[] {
  try {
    // Attempt to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn({ filePath }, 'No JSON found in LLM response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      logger.warn({ filePath }, 'LLM response is not an array');
      return [];
    }

    // Validate and normalize issues
    return parsed
      .filter((issue: any) => issue.ruleId && issue.severity && issue.message)
      .map((issue: any) => ({
        ruleId: `ai.${issue.ruleId}`,
        severity: issue.severity,
        file: filePath,
        line: issue.line || 1,
        message: issue.message,
        fix: issue.fix,
        confidence: issue.confidence || 0.7,
        detectedBy: 'ai',
      }));
  } catch (error) {
    logger.warn(
      { filePath, error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to parse LLM response'
    );
    return [];
  }
}

/**
 * Check enrichment status for a review
 */
export async function checkEnrichmentStatus(reviewId: string): Promise<{
  status: 'pending' | 'enriching' | 'completed';
  enrichedFiles: number;
  totalFiles: number;
  completedAt?: Date;
}> {
  // Query database for enrichment progress
  // This would be tracked via a separate table or metadata field
  // For now, returning a simple status
  const enrichmentData = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      status: true,
      updatedAt: true,
      metadata: true,
    },
  });

  if (!enrichmentData) {
    return {
      status: 'pending',
      enrichedFiles: 0,
      totalFiles: 0,
    };
  }

  const metadata = enrichmentData.metadata as any;
  return {
    status: enrichmentData.status === 'completed' ? 'completed' : 'enriching',
    enrichedFiles: metadata?.enrichedFiles || 0,
    totalFiles: metadata?.totalFiles || 0,
    completedAt: enrichmentData.status === 'completed' ? enrichmentData.updatedAt : undefined,
  };
}
