/**
 * Review Guard Service
 * 
 * AI-aware code review and risk analysis
 * Enforces blocking by default for critical/high issues
 */

import { prisma } from '../../lib/prisma';
import { llmService, LLMRequest } from '../llm';
import { staticAnalysisService, Issue } from '../static-analysis';
// import { codeParserService } from '../code-parser'; // Reserved for future use

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

export class ReviewGuardService {
  /**
   * Review a pull request
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

      for (const file of filesToReview) {
        try {
          // Static analysis
          const staticIssues = await staticAnalysisService.analyze(file.path, file.content);
          allIssues.push(...staticIssues);

          // AI analysis (if LLM available)
          try {
            const aiIssues = await this.analyzeWithAI(file.path, file.content, request.repositoryId);
            allIssues.push(...aiIssues);
          } catch (error) {
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

      // Calculate summary
      const summary = {
        total: allIssues.length,
        critical: allIssues.filter((i) => i.severity === 'critical').length,
        high: allIssues.filter((i) => i.severity === 'high').length,
        medium: allIssues.filter((i) => i.severity === 'medium').length,
        low: allIssues.filter((i) => i.severity === 'low').length,
      };

      // Determine if PR should be blocked
      const isBlocked = this.shouldBlock(allIssues, config);
      const blockedReason = isBlocked
        ? this.getBlockedReason(allIssues, config)
        : undefined;

      const completedAt = new Date();

      // Save review result
      const review = await prisma.review.create({
        data: {
          repositoryId: request.repositoryId,
          prNumber: request.prNumber,
          prSha: request.prSha,
          prTitle: request.prTitle,
          status: isBlocked ? 'blocked' : 'completed',
          result: {
            issues: allIssues,
            summary,
            blocking: isBlocked,
          } as any, // Prisma Json type
          issuesFound: allIssues as any, // Prisma Json type
          summary: summary as any, // Prisma Json type
          isBlocked,
          blockedReason,
          startedAt,
          completedAt,
        },
      });

      // Track violations for pattern detection
      await this.trackViolations(request.repositoryId, review.id, allIssues);

      return {
        id: review.id,
        status: isBlocked ? 'blocked' : 'completed',
        issues: allIssues,
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

      throw new Error(
        `Review failed: ${errorMessage}. ` +
        `This PR is BLOCKED until review completes. ` +
        `Review ID: ${review.id}`
      );
    }
  }

  /**
   * Analyze code with AI
   */
  private async analyzeWithAI(
    filePath: string,
    content: string,
    organizationId: string
  ): Promise<Issue[]> {
    const prompt = `Analyze the following code for security vulnerabilities, quality issues, and potential bugs.

File: ${filePath}

\`\`\`
${content}
\`\`\`

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
   * Determine if PR should be blocked
   */
  private shouldBlock(issues: Issue[], config: ReviewConfig): boolean {
    // Critical issues ALWAYS block (cannot disable)
    if (issues.some((i) => i.severity === 'critical')) {
      return true;
    }

    // High issues block by default
    if (config.failOnHigh && issues.some((i) => i.severity === 'high')) {
      return true;
    }

    // Medium/Low issues only block if configured
    if (config.failOnMedium && issues.some((i) => i.severity === 'medium')) {
      return true;
    }

    if (config.failOnLow && issues.some((i) => i.severity === 'low')) {
      return true;
    }

    return false;
  }

  /**
   * Get blocked reason
   */
  private getBlockedReason(issues: Issue[], config: ReviewConfig): string {
    const critical = issues.filter((i) => i.severity === 'critical');
    const high = issues.filter((i) => i.severity === 'high');

    if (critical.length > 0) {
      return `${critical.length} critical issue(s) found. Critical issues always block PR merge.`;
    }

    if (high.length > 0 && config.failOnHigh) {
      return `${high.length} high issue(s) found. High issues block PR merge by default.`;
    }

    return 'Issues found that require resolution before merge.';
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
}

export const reviewGuardService = new ReviewGuardService();
