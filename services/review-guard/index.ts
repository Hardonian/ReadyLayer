/**
 * Review Guard Service
 * 
 * AI-aware code review and risk analysis
 * Enforces blocking by default for critical/high issues
 */

import { prisma } from '../../lib/prisma';
import { llmService, LLMRequest, LLMResponse } from '../llm';
import { staticAnalysisService, Issue } from '../static-analysis';
import { schemaReconciliationService } from '../schema-reconciliation';
import { queryEvidence, formatEvidenceForPrompt, isQueryEnabled } from '../../lib/rag';
import { policyEngineService } from '../policy-engine';
import { createHash } from 'crypto';
import { UsageLimitExceededError } from '../../lib/usage-enforcement';
// import { aiAnomalyDetectionService } from '../ai-anomaly-detection'; // Reserved for future use
import { selfLearningService } from '../self-learning';
import { predictiveDetectionService } from '../predictive-detection';
import { failureIntelligenceService } from '../failure-intelligence';

export interface ReviewRequest {
  repositoryId: string;
  prNumber: number;
  prSha: string;
  prTitle?: string;
  diff?: string;
  files: Array<{ path: string; content: string; beforeContent?: string | null }>;
  config?: ReviewConfig;
}

export interface ReviewConfig {
  failOnCritical: boolean; // Always true, cannot disable
  failOnHigh: boolean; // Default true, can disable with admin approval
  failOnMedium: boolean;
  failOnLow: boolean;
  enabledRules?: string[];
  disabledRules?: string[];
  excludedPaths?: string[];
}

export interface ReviewResult {
  id: string;
  status: 'completed' | 'failed' | 'blocked';
  issues: Issue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  isBlocked: boolean;
  blockedReason?: string;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Review Guard Service
 * 
 * Provides AI-aware code review and risk analysis for pull requests.
 * Enforces blocking by default for critical/high issues based on policy configuration.
 * 
 * Key Features:
 * - Deterministic static analysis with founder-specific rules
 * - AI-powered analysis with RAG evidence integration
 * - Policy-driven evaluation with waiver support
 * - Complete audit trail via evidence bundles
 * - Token usage tracking for cost control
 * 
 * @example
 * const result = await reviewGuardService.review({
 *   repositoryId: 'repo_123',
 *   prNumber: 42,
 *   prSha: 'abc123',
 *   files: [{ path: 'src/index.ts', content: '...' }]
 * });
 * 
 * if (result.isBlocked) {
 *   console.log('PR blocked:', result.blockedReason);
 * }
 */
export class ReviewGuardService {
  /**
   * Review a pull request for security vulnerabilities, quality issues, and potential bugs.
   * 
   * This is the main entry point for code review. It performs:
   * 1. Static analysis (deterministic rules)
   * 2. AI analysis (LLM-powered, with RAG evidence)
   * 3. Schema reconciliation (for migration files)
   * 4. Policy evaluation (determines blocking)
   * 5. Evidence bundle creation (audit trail)
   * 
   * **Enforcement-First Behavior:**
   * - Critical issues ALWAYS block (cannot disable)
   * - High/Medium/Low blocking determined by policy
   * - LLM failures block PR (fail-secure)
   * - Parse errors block PR (fail-secure)
   * 
   * @param request - Review request with PR metadata and files to review
   * @returns Review result with issues, summary, and blocking status
   * @throws {UsageLimitExceededError} If billing limits exceeded (preserves HTTP status)
   * @throws {Error} If LLM analysis fails (PR blocked)
   * @throws {Error} If file parsing fails (PR blocked)
   * 
   * @example
   * const result = await reviewGuardService.review({
   *   repositoryId: 'repo_123',
   *   prNumber: 42,
   *   prSha: 'abc123',
   *   prTitle: 'Add user authentication',
   *   files: [
   *     { path: 'src/auth.ts', content: '...', beforeContent: '...' }
   *   ],
   *   config: {
   *     failOnCritical: true,
   *     failOnHigh: true,
   *     excludedPaths: ['test.ts']
   *   }
   * });
   */
  async review(request: ReviewRequest): Promise<ReviewResult> {
    const startedAt = new Date();
    const config = request.config || this.getDefaultConfig();

    try {
      // Filter files by excluded paths
      const filesToReview = request.files.filter((file) => {
        if (!config.excludedPaths) {
          return true;
        }
        return !config.excludedPaths.some((pattern) => this.matchesPattern(file.path, pattern));
      });

      // Analyze each file
      const allIssues: Issue[] = [];

      // FOUNDER-SPECIFIC: Diff-level analysis for overconfident refactors
      const diffIssues = await this.analyzeDiffForLargeRefactors(filesToReview);
      allIssues.push(...diffIssues);

      for (const file of filesToReview) {
        try {
          // Static analysis (includes founder-specific rules)
          const staticIssues = await staticAnalysisService.analyze(file.path, file.content);
          allIssues.push(...staticIssues);

          // AI analysis (if LLM available)
          try {
            // Get organization ID from repository
            const repo = await prisma.repository.findUnique({
              where: { id: request.repositoryId },
              select: { organizationId: true },
            });
            const organizationId = repo?.organizationId || '';
            
            const aiIssues = await this.analyzeWithAI(
              file.path,
              file.content,
              request.repositoryId,
              organizationId
            );
            allIssues.push(...aiIssues);
          } catch (error) {
            // Handle usage limit errors with clear messaging
            if (error instanceof UsageLimitExceededError) {
              // Re-throw as-is to preserve error type and HTTP status
              throw error;
            }
            
            // LLM failure MUST block PR (enforcement-first)
            throw new Error(
              `LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
              `This PR is BLOCKED until analysis completes. ` +
              `Cause: LLM API unavailable. ` +
              `Action: Retry in 60 seconds or contact support@readylayer.com`
            );
          }
        } catch (error) {
          // Parse errors MUST block PR
          throw new Error(
            `Failed to analyze ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `This PR is BLOCKED until all files can be analyzed.`
          );
        }
      }

      // FOUNDER-SPECIFIC: Schema reconciliation check
      const migrationFiles = filesToReview.filter(f => 
        f.path.includes('migration') || f.path.includes('migrations') || f.path.endsWith('.sql')
      );
      if (migrationFiles.length > 0) {
        try {
          const schemaResult = await schemaReconciliationService.reconcile({
            repositoryId: request.repositoryId,
            prNumber: request.prNumber,
            prSha: request.prSha,
            migrationFiles: migrationFiles.map(f => ({ path: f.path, content: f.content })),
            codeFiles: filesToReview.map(f => ({ path: f.path, content: f.content })),
          });
          allIssues.push(...schemaResult.issues);
        } catch (error) {
          // Schema reconciliation failure is high severity but doesn't block
          allIssues.push({
            ruleId: 'founder.schema-reconciliation',
            severity: 'high',
            file: 'migration',
            line: 1,
            message: `Schema reconciliation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fix: 'Manually verify schema changes match code expectations',
            confidence: 0.8,
          });
        }
      }

      // Get organization ID for policy evaluation
      const repo = await prisma.repository.findUnique({
        where: { id: request.repositoryId },
        select: { organizationId: true },
      });
      const organizationId = repo?.organizationId || '';

      // Load effective policy
      const policy = await policyEngineService.loadEffectivePolicy(
        organizationId,
        request.repositoryId,
        request.prSha,
        undefined // branch not available in request
      );

      // Evaluate findings against policy
      const evaluationResult = policyEngineService.evaluate(allIssues, policy);

      // Calculate summary (use non-waived findings)
      const summary = {
        total: evaluationResult.nonWaivedFindings.length,
        critical: evaluationResult.nonWaivedFindings.filter((i) => i.severity === 'critical').length,
        high: evaluationResult.nonWaivedFindings.filter((i) => i.severity === 'high').length,
        medium: evaluationResult.nonWaivedFindings.filter((i) => i.severity === 'medium').length,
        low: evaluationResult.nonWaivedFindings.filter((i) => i.severity === 'low').length,
      };

      // Use policy engine decision
      const isBlocked = evaluationResult.blocked;
      const blockedReason = evaluationResult.blockingReason;

      const completedAt = new Date();

      // Calculate input hashes for evidence
      const diffContent = request.diff || filesToReview.map(f => `${f.path}\n${f.content}`).join('\n---\n');
      const diffHash = createHash('sha256').update(diffContent, 'utf8').digest('hex');
      const fileListHash = createHash('sha256').update(
        filesToReview.map(f => f.path).sort().join('\n'),
        'utf8'
      ).digest('hex');

      // Generate signed review ID (deterministic signature)
      const reviewIdSignature = this.generateReviewIdSignature(
        request.repositoryId,
        request.prNumber,
        request.prSha,
        policy.pack.checksum
      );

      // Save review result
      const review = await prisma.review.create({
        data: {
          repositoryId: request.repositoryId,
          prNumber: request.prNumber,
          prSha: request.prSha,
          prTitle: request.prTitle,
          status: isBlocked ? 'blocked' : 'completed',
          result: {
            issues: evaluationResult.nonWaivedFindings,
            waivedIssues: evaluationResult.waivedFindings,
            summary,
            blocking: isBlocked,
            policyScore: evaluationResult.score,
            reviewIdSignature, // Include signature in result
            policyVersion: policy.pack.version,
            policyChecksum: policy.pack.checksum,
          } as any, // Prisma Json type
          issuesFound: evaluationResult.nonWaivedFindings as any, // Prisma Json type
          summary: summary as any, // Prisma Json type
          isBlocked,
          blockedReason,
          startedAt,
          completedAt,
        },
      });

      // Produce evidence bundle
      const timings = {
        totalMs: completedAt.getTime() - startedAt.getTime(),
      };
      await policyEngineService.produceEvidence(
        {
          diffHash,
          fileListHash,
          commitSha: request.prSha,
          prNumber: request.prNumber,
          files: filesToReview.map(f => ({ path: f.path, size: f.content.length })),
        },
        {
          findings: allIssues,
          evaluationResult,
        },
        policy,
        timings,
        { reviewId: review.id }
      );

      // Track violations for pattern detection (only non-waived)
      await this.trackViolations(request.repositoryId, review.id, evaluationResult.nonWaivedFindings);

      // Record failure patterns for intelligence (anonymized)
      for (const finding of evaluationResult.nonWaivedFindings) {
        try {
          await failureIntelligenceService.recordPattern(
            organizationId,
            request.repositoryId,
            finding,
            {
              language: this.detectLanguage(filesToReview),
              framework: 'unknown', // Would detect framework
            }
          );
        } catch (error) {
          // Don't fail review if pattern recording fails
          console.error('Failed to record failure pattern:', error);
        }
      }

      // Track token usage for anomaly detection
      await this.trackTokenUsage(review.id, request.repositoryId, organizationId);

      // Record model performance for self-learning
      await this.recordModelPerformance(
        organizationId,
        request.repositoryId,
        review.id,
        evaluationResult,
        completedAt.getTime() - startedAt.getTime()
      );

      // Audit log
      try {
        const { createAuditLog, AuditActions } = await import('../../lib/audit');
        await createAuditLog({
          organizationId,
          userId: null, // System action
          action: isBlocked ? AuditActions.REVIEW_BLOCKED : AuditActions.REVIEW_COMPLETED,
          resourceType: 'review',
          resourceId: review.id,
          details: {
            repositoryId: request.repositoryId,
            prNumber: request.prNumber,
            prSha: request.prSha,
            issuesFound: summary.total,
            critical: summary.critical,
            high: summary.high,
            medium: summary.medium,
            low: summary.low,
            isBlocked,
            blockedReason,
          },
        });
      } catch (error) {
        // Don't fail review on audit log errors
      }

      // Generate predictive alerts
      try {
        const predictiveAlerts = await predictiveDetectionService.predictIssues({
          repositoryId: request.repositoryId,
          organizationId,
          codeContext: request.diff,
          recentActivity: [
            {
              type: 'review',
              timestamp: completedAt,
              metadata: {
                prNumber: request.prNumber,
                issuesFound: summary.total,
                isBlocked,
              },
            },
          ],
        });

        // Store high-confidence alerts
        // Store high-confidence alerts (alerts are stored by predictive detection service)
        for (const _alert of predictiveAlerts.filter((a) => a.confidence.finalConfidence > 0.7)) {
          // Alerts are stored by predictive detection service
        }
      } catch (error) {
        // Don't fail review if predictive detection fails
        console.error('Predictive detection failed:', error);
      }

      return {
        id: review.id,
        status: isBlocked ? 'blocked' : 'completed',
        issues: evaluationResult.nonWaivedFindings,
        summary,
        isBlocked,
        blockedReason,
        startedAt,
        completedAt,
      };
    } catch (error) {
      // All failures MUST block PR
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const review = await prisma.review.create({
        data: {
          repositoryId: request.repositoryId,
          prNumber: request.prNumber,
          prSha: request.prSha,
          prTitle: request.prTitle,
          status: 'failed',
          isBlocked: true,
          blockedReason: errorMessage,
          issuesFound: [] as any, // Empty array for failed reviews
          summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } as any,
          startedAt,
        },
      });

      // Audit log failure
      try {
        const repo = await prisma.repository.findUnique({
          where: { id: request.repositoryId },
          select: { organizationId: true },
        });
        const organizationId = repo?.organizationId || '';
        
        const { createAuditLog, AuditActions } = await import('../../lib/audit');
        await createAuditLog({
          organizationId,
          userId: null,
          action: AuditActions.REVIEW_BLOCKED,
          resourceType: 'review',
          resourceId: review.id,
          details: {
            repositoryId: request.repositoryId,
            prNumber: request.prNumber,
            error: errorMessage,
            isBlocked: true,
          },
        });
      } catch {
        // Don't fail on audit log errors
      }

      throw new Error(
        `Review failed: ${errorMessage}. ` +
        `This PR is BLOCKED until review completes. ` +
        `Fix: Resolve the error and retry. If the problem persists, contact support@readylayer.com. ` +
        `Review ID: ${review.id}`
      );
    }
  }

  /**
   * Track token usage for anomaly detection
   */
  private async trackTokenUsage(
    _reviewId: string,
    _repositoryId: string,
    _organizationId: string
  ): Promise<void> {
    // Token usage is tracked per LLM call in recordTokenUsage
    // This method can be used for aggregate tracking if needed
  }

  /**
   * Analyze code with AI
   */
  private async analyzeWithAI(
    filePath: string,
    content: string,
    repositoryId: string,
    organizationId: string
  ): Promise<Issue[]> {
    // Query evidence if RAG is enabled
    let evidenceSection = '';
    if (isQueryEnabled()) {
      try {
        const evidenceQueries = [
          `similar violations in repository ${repositoryId}`,
          `prior enforcement decisions for ${filePath}`,
          `repo config constraints`,
        ];

        const allEvidence = [];
        for (const queryText of evidenceQueries) {
          const results = await queryEvidence({
            organizationId,
            repositoryId,
            queryText,
            topK: 3,
            filters: {
              sourceTypes: ['review_result', 'repo_file', 'policy_doc'],
            },
          });
          allEvidence.push(...results);
        }

        if (allEvidence.length > 0) {
          evidenceSection = formatEvidenceForPrompt(allEvidence);
        }
      } catch (error) {
        // Evidence retrieval failed - proceed without it (graceful degradation)
        // Use structured logger instead of console.warn for observability
        const { logger } = await import('../../observability/logging');
        logger.warn({
          err: error instanceof Error ? error : new Error(String(error)),
          repositoryId,
          filePath,
        }, 'Evidence retrieval failed, proceeding without evidence');
      }
    }

    const codeBlockStart = '```';
    const codeBlockEnd = '```';
    const prompt = `Analyze the following code for security vulnerabilities, quality issues, and potential bugs.

File: ${filePath}

${codeBlockStart}
${content}
${codeBlockEnd}
${evidenceSection}

Return a JSON array of issues found, each with:
- ruleId: string (e.g., "security.sql-injection")
- severity: "critical" | "high" | "medium" | "low"
- file: string
- line: number
- message: string
- fix: string (actionable fix instruction)
- confidence: number (0-1)

Format: [{"ruleId": "...", "severity": "...", "file": "...", "line": 1, "message": "...", "fix": "...", "confidence": 0.9}]`;

    const llmRequest: LLMRequest = {
      prompt,
      model: 'gpt-4-turbo-preview',
      organizationId,
      cache: true,
    };

    try {
      const response = await llmService.complete(llmRequest);
      
      // Track token usage for anomaly detection
      await this.recordTokenUsage(response, llmRequest.prompt, repositoryId, organizationId, 'review');

      const issues = JSON.parse(response.content) as Issue[];

      // Validate AI output
      return issues.filter((issue) => {
        return (
          issue.ruleId &&
          issue.severity &&
          ['critical', 'high', 'medium', 'low'].includes(issue.severity) &&
          issue.message &&
          issue.line > 0
        );
      });
    } catch (error) {
      // LLM failures MUST block PR
      throw new Error(
        `LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Cannot complete AI-aware security analysis.`
      );
    }
  }

  /**
   * Record token usage for anomaly detection
   */
  private async recordTokenUsage(
    response: LLMResponse,
    prompt: string,
    repositoryId: string,
    organizationId: string,
    service: string
  ): Promise<void> {
    try {
      // Estimate input tokens (rough: ~4 chars per token)
      const estimatedInputTokens = Math.ceil(prompt.length / 4);
      
      // Calculate waste percentage (simplified - would need more sophisticated analysis)
      const totalTokens = response.tokensUsed;
      const wastePercentage = totalTokens > 50000 ? 20 : totalTokens > 20000 ? 10 : 5;

      const tokenUsage = await prisma.tokenUsage.create({
        data: {
          repositoryId,
          organizationId,
          service,
          provider: response.model.includes('claude') ? 'anthropic' : 'openai',
          model: response.model,
          inputTokens: estimatedInputTokens,
          outputTokens: response.tokensUsed - estimatedInputTokens,
          totalTokens: response.tokensUsed,
          cost: response.cost,
          wastePercentage,
        },
      });

      // Record model performance for self-learning
      await selfLearningService.recordModelPerformance(organizationId, response.model, 
        response.model.includes('claude') ? 'anthropic' : 'openai', {
        success: true,
        responseTime: 0, // Would track actual response time
        tokensUsed: response.tokensUsed,
        cost: Number(response.cost),
        predictionId: tokenUsage.id,
      });
    } catch (error) {
      // Don't fail review if token tracking fails
      console.error('Failed to track token usage:', error);
    }
  }

  /**
   * Record model performance for self-learning
   */
  private async recordModelPerformance(
    organizationId: string,
    _repositoryId: string,
    reviewId: string,
    evaluationResult: any,
    durationMs: number
  ): Promise<void> {
    try {
      // Get model used (would track which model was used)
      const modelId = 'gpt-4-turbo-preview'; // Default, would be tracked
      const provider = 'openai'; // Default, would be tracked

      // Record performance
      await selfLearningService.recordModelPerformance(organizationId, modelId, provider, {
        success: evaluationResult.blocked !== undefined,
        responseTime: durationMs,
        tokensUsed: 0, // Would track actual tokens
        cost: 0, // Would track actual cost
        predictionId: reviewId,
      });
    } catch (error) {
      // Don't fail review if performance tracking fails
      console.error('Failed to record model performance:', error);
    }
  }


  /**
   * Generate deterministic review ID signature
   * 
   * Creates a signature that proves the review was performed with a specific
   * policy version. Same inputs + same policy = same signature.
   */
  private generateReviewIdSignature(
    repositoryId: string,
    prNumber: number,
    prSha: string,
    policyChecksum: string
  ): string {
    const signatureInput = `${repositoryId}:${prNumber}:${prSha}:${policyChecksum}`;
    return createHash('sha256').update(signatureInput, 'utf8').digest('hex').slice(0, 16);
  }

  /**
   * Detect language from files
   */
  private detectLanguage(files: Array<{ path: string; content: string }>): string {
    if (files.length === 0) return 'unknown';
    
    const extensions = files.map(f => {
      const match = f.path.match(/\.([^.]+)$/);
      return match ? match[1] : '';
    });
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
    };
    
    const mostCommon = extensions
      .filter(ext => ext)
      .reduce((acc, ext) => {
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topExt = Object.entries(mostCommon)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    return languageMap[topExt || ''] || 'unknown';
  }

  /**
   * Track violations for pattern detection
   */
  private async trackViolations(
    repositoryId: string,
    reviewId: string,
    issues: Issue[]
  ): Promise<void> {
    for (const issue of issues) {
      await prisma.violation.create({
        data: {
          repositoryId,
          reviewId,
          ruleId: issue.ruleId,
          severity: issue.severity,
          file: issue.file,
          line: issue.line,
          message: issue.message,
        },
      });
    }
  }

  /**
   * Get default config (enforcement-first)
   */
  private getDefaultConfig(): ReviewConfig {
    return {
      failOnCritical: true, // REQUIRED: Cannot disable
      failOnHigh: true, // DEFAULT: Can disable with admin approval
      failOnMedium: false,
      failOnLow: false,
    };
  }

  /**
   * Check if file path matches pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching (would use proper glob library in production)
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(path);
  }

  /**
   * FOUNDER-SPECIFIC: Analyze diff for large refactors (overconfident AI changes)
   */
  private async analyzeDiffForLargeRefactors(
    files: Array<{ path: string; content: string; beforeContent?: string | null }>
  ): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Detect large refactors
    const largeFiles = files.filter(f => {
      const lineCount = f.content.split('\n').length;
      return lineCount > 300; // Large file threshold
    });

    for (const file of largeFiles) {
      // If beforeContent exists, this is a modification (not new file)
      if (file.beforeContent) {
        const beforeLines = file.beforeContent.split('\n').length;
        const afterLines = file.content.split('\n').length;
        const changeRatio = Math.abs(afterLines - beforeLines) / beforeLines;

        // Flag files with >30% change as potentially risky refactor
        if (changeRatio > 0.3) {
          issues.push({
            ruleId: 'founder.large-refactor',
            severity: 'high',
            file: file.path,
            line: 1,
            message: `Large refactor detected: ${Math.round(changeRatio * 100)}% of file changed - ensure edge cases are tested`,
            fix: 'Review diff carefully, test edge cases, consider breaking into smaller PRs',
            confidence: 0.8,
          });
        }

        // Analyze diff for common AI refactor patterns
        const diffAnalysis = this.analyzeDiffPatterns(file.beforeContent, file.content);
        issues.push(...diffAnalysis);
      }
    }

    return issues;
  }

  /**
   * Analyze diff for common AI refactor anti-patterns
   */
  private analyzeDiffPatterns(before: string, after: string): Issue[] {
    const issues: Issue[] = [];

    // Pattern 1: Many functions changed at once
    const beforeFunctions = (before.match(/(?:function|const\s+\w+\s*=\s*(?:async\s+)?\(|export\s+(?:async\s+)?function)/g) || []).length;
    const afterFunctions = (after.match(/(?:function|const\s+\w+\s*=\s*(?:async\s+)?\(|export\s+(?:async\s+)?function)/g) || []).length;
    
    if (Math.abs(afterFunctions - beforeFunctions) > 5) {
      issues.push({
        ruleId: 'founder.large-refactor',
        severity: 'medium',
        file: 'diff',
        line: 1,
        message: `Many functions changed (${beforeFunctions} → ${afterFunctions}) - verify all functions still work correctly`,
        fix: 'Test each changed function individually',
        confidence: 0.7,
      });
    }

    // Pattern 2: Type changes (type erosion or over-typing)
    const beforeAnyCount = (before.match(/\b:\s*any\b/g) || []).length;
    const afterAnyCount = (after.match(/\b:\s*any\b/g) || []).length;
    
    if (afterAnyCount > beforeAnyCount) {
      issues.push({
        ruleId: 'founder.type-erosion',
        severity: 'high',
        file: 'diff',
        line: 1,
        message: `Type safety regression: 'any' types increased (${beforeAnyCount} → ${afterAnyCount})`,
        fix: 'Replace any types with proper types',
        confidence: 0.9,
      });
    }

    // Pattern 3: Error handling removed
    const beforeTryCatch = (before.match(/\btry\s*\{/g) || []).length;
    const afterTryCatch = (after.match(/\btry\s*\{/g) || []).length;
    
    if (afterTryCatch < beforeTryCatch) {
      issues.push({
        ruleId: 'founder.error-handling',
        severity: 'high',
        file: 'diff',
        line: 1,
        message: `Error handling removed: try/catch blocks decreased (${beforeTryCatch} → ${afterTryCatch})`,
        fix: 'Ensure error handling is not removed without proper replacement',
        confidence: 0.85,
      });
    }

    return issues;
  }
}

export const reviewGuardService = new ReviewGuardService();
