/**
 * Shadow Mode Service
 * 
 * Runs ReadyLayer analysis on AI-touched diffs without blocking merges
 * Produces "what would have been caught" reports for validation
 * 
 * Purpose: Validate ReadyLayer usefulness before enforcement
 */

import { prisma } from '../../lib/prisma';
import { reviewGuardService, ReviewRequest, ReviewResult } from '../review-guard';
import { testEngineService } from '../test-engine';
import { codeParserService } from '../code-parser';

export interface ShadowModeRequest {
  repositoryId: string;
  prNumber: number;
  prSha: string;
  prTitle?: string;
  diff?: string;
  files: Array<{ path: string; content: string; beforeContent?: string | null }>;
  aiTouchedFiles?: string[]; // Files detected as AI-touched
}

export interface ShadowModeResult {
  reviewResult?: ReviewResult;
  testResults?: Array<{
    filePath: string;
    wouldHaveBlocked: boolean;
    issues: string[];
  }>;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    wouldHaveBlocked: boolean;
    blockedReason?: string;
  };
  report: string; // Human-readable report
}

export class ShadowModeService {
  /**
   * Run shadow mode analysis (non-blocking)
   */
  async analyze(request: ShadowModeRequest): Promise<ShadowModeResult> {
    // Detect AI-touched files if not provided
    const aiTouchedFiles = request.aiTouchedFiles || await this.detectAITouchedFiles(request.files);

    if (aiTouchedFiles.length === 0) {
      return {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          wouldHaveBlocked: false,
        },
        report: 'No AI-touched files detected. Shadow mode skipped.',
      };
    }

    // Filter files to only AI-touched ones
    const aiTouchedFileData = request.files.filter(f => aiTouchedFiles.includes(f.path));

    // Run review guard analysis (non-blocking mode)
    const reviewRequest: ReviewRequest = {
      repositoryId: request.repositoryId,
      prNumber: request.prNumber,
      prSha: request.prSha,
      prTitle: request.prTitle,
      diff: request.diff,
      files: aiTouchedFileData,
      config: {
        failOnCritical: true, // Still check, but don't block in shadow mode
        failOnHigh: false, // Don't block on high in shadow mode
        failOnMedium: false,
        failOnLow: false,
      },
    };

    let reviewResult: ReviewResult | undefined;
    try {
      reviewResult = await reviewGuardService.review(reviewRequest);
    } catch (error) {
      // In shadow mode, errors don't block - just report
      reviewResult = {
        id: 'shadow-error',
        status: 'failed',
        issues: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        isBlocked: false,
        startedAt: new Date(),
        completedAt: new Date(),
      };
    }

    // Generate test analysis for AI-touched files
    const testResults = await this.analyzeTestCoverage(aiTouchedFileData);

    // Generate summary
    const summary = {
      totalIssues: reviewResult.issues.length,
      criticalIssues: reviewResult.summary.critical,
      highIssues: reviewResult.summary.high,
      wouldHaveBlocked: reviewResult.isBlocked || reviewResult.summary.critical > 0,
      blockedReason: reviewResult.isBlocked ? reviewResult.blockedReason : undefined,
    };

    // Generate human-readable report
    const report = this.generateReport(reviewResult, testResults, summary, aiTouchedFiles);

    return {
      reviewResult,
      testResults,
      summary,
      report,
    };
  }

  /**
   * Detect AI-touched files
   */
  private async detectAITouchedFiles(
    files: Array<{ path: string; content: string; commitMessage?: string }>
  ): Promise<string[]> {
    // Use test engine's AI detection
    const detectionResult = await testEngineService.detectAITouchedFiles('', files.map(f => ({
      path: f.path,
      content: f.content,
      commitMessage: f.commitMessage,
    })));

    return detectionResult.map(d => d.path);
  }

  /**
   * Analyze test coverage for AI-touched files
   */
  private async analyzeTestCoverage(
    files: Array<{ path: string; content: string }>
  ): Promise<Array<{ filePath: string; wouldHaveBlocked: boolean; issues: string[] }>> {
    const results: Array<{ filePath: string; wouldHaveBlocked: boolean; issues: string[] }> = [];

    for (const file of files) {
      // Skip non-code files
      if (!file.path.match(/\.(ts|tsx|js|jsx|py|java|go)$/)) {
        continue;
      }

      const issues: string[] = [];

      // Check if test file exists
      // TODO: Implement actual test file existence check
      const hasTestFile = false; // Would check if test file exists in repo

      if (!hasTestFile) {
        issues.push(`No test file found for ${file.path}`);
      }

      // Check function count (more functions = more test coverage needed)
      try {
        const parseResult = await codeParserService.parse(file.path, file.content);
        if (parseResult.functions.length > 5 && !hasTestFile) {
          issues.push(`File has ${parseResult.functions.length} functions but no tests`);
        }
      } catch (error) {
        // Skip if can't parse
      }

      results.push({
        filePath: file.path,
        wouldHaveBlocked: issues.length > 0,
        issues,
      });
    }

    return results;
  }

  /**
   * Generate human-readable shadow mode report
   */
  private generateReport(
    reviewResult: ReviewResult,
    testResults: Array<{ filePath: string; wouldHaveBlocked: boolean; issues: string[] }>,
    summary: ShadowModeResult['summary'],
    aiTouchedFiles: string[]
  ): string {
    const lines: string[] = [];

    lines.push('# ReadyLayer Shadow Mode Report');
    lines.push('');
    lines.push(`**AI-Touched Files:** ${aiTouchedFiles.length}`);
    lines.push(`**Total Issues Found:** ${summary.totalIssues}`);
    lines.push('');

    if (summary.wouldHaveBlocked) {
      lines.push('## ⛔ This PR Would Have Been BLOCKED');
      lines.push('');
      lines.push(`**Reason:** ${summary.blockedReason || 'Critical issues found'}`);
      lines.push('');
    } else {
      lines.push('## ✅ This PR Would Have PASSED (with warnings)');
      lines.push('');
    }

    if (summary.criticalIssues > 0) {
      lines.push(`### Critical Issues: ${summary.criticalIssues}`);
      const criticalIssues = reviewResult.issues.filter(i => i.severity === 'critical');
      criticalIssues.slice(0, 5).forEach(issue => {
        lines.push(`- **${issue.file}:${issue.line}** - ${issue.message}`);
        if (issue.fix) {
          lines.push(`  → Fix: ${issue.fix}`);
        }
      });
      if (criticalIssues.length > 5) {
        lines.push(`- ... and ${criticalIssues.length - 5} more critical issues`);
      }
      lines.push('');
    }

    if (summary.highIssues > 0) {
      lines.push(`### High Issues: ${summary.highIssues}`);
      const highIssues = reviewResult.issues.filter(i => i.severity === 'high');
      highIssues.slice(0, 5).forEach(issue => {
        lines.push(`- **${issue.file}:${issue.line}** - ${issue.message}`);
      });
      if (highIssues.length > 5) {
        lines.push(`- ... and ${highIssues.length - 5} more high issues`);
      }
      lines.push('');
    }

    // Test coverage analysis
    const filesNeedingTests = testResults.filter(r => r.wouldHaveBlocked);
    if (filesNeedingTests.length > 0) {
      lines.push('### Test Coverage Issues:');
      filesNeedingTests.forEach(result => {
        lines.push(`- **${result.filePath}**`);
        result.issues.forEach(issue => {
          lines.push(`  - ${issue}`);
        });
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('**Note:** This is shadow mode - no merges were blocked.');
    lines.push('ReadyLayer is running in observation mode to validate usefulness.');

    return lines.join('\n');
  }

  /**
   * Save shadow mode result for later analysis
   */
  async saveResult(
    repositoryId: string,
    prNumber: number,
    result: ShadowModeResult
  ): Promise<void> {
    // Save to database for analysis
    await prisma.job.create({
      data: {
        type: 'shadow_mode',
        status: 'completed',
        payload: {
          repositoryId,
          prNumber,
          result,
        } as any,
        result: result as any,
      },
    });
  }
}

export const shadowModeService = new ShadowModeService();
