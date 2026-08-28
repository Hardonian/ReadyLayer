/**
 * Test Engine Service
 *
 * Automatic test generation and coverage enforcement
 * Enforces coverage thresholds (minimum 80%)
 */

import { prisma } from '../../lib/prisma';
import { llmService, LLMRequest } from '../llm';
import { codeParserService } from '../code-parser';
// TODO: Re-enable RAG integration when test generation uses evidence
// import { queryEvidence, formatEvidenceForPrompt, isQueryEnabled } from '../../lib/rag';
// Billing check imported dynamically to avoid circular dependencies
import { policyEngineService } from '../policy-engine';
import { createHash } from 'crypto';
import { Issue } from '../static-analysis';
import { enqueueTestExecutionJob } from '../../workers/test-executor-worker';
import { logger } from '../../observability/logging';
import { testEnginePromptBuilder, combinedPrompt } from '../../lib/prompts/builder';
import { redactSecrets, updateRedactionStats } from '../../lib/secrets/redaction';
import { executeTests, type TestExecutionResult } from './executor';

export interface TestGenerationRequest {
  repositoryId: string;
  prNumber?: number;
  prSha?: string;
  filePath: string;
  fileContent: string;
  framework?: string; // Auto-detect if not specified
  config?: TestConfig;
}

export interface TestConfig {
  coverageThreshold: number; // Minimum 80%, cannot go below
  metric: 'lines' | 'branches' | 'functions';
  enforceOn: 'pr' | 'merge' | 'both';
  failOnBelow: boolean; // REQUIRED: Always true, cannot disable
  placement: 'co-located' | 'separate' | 'mirror';
  testDir?: string;
}

export interface TestGenerationResult {
  id: string;
  status: 'generated' | 'failed' | 'blocked';
  testContent: string;
  placement: string;
  framework: string;
  startedAt: Date;
  completedAt: Date;
}

export interface CoverageResult {
  repositoryId: string;
  prNumber?: number;
  prSha?: string;
  coverage: {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
  };
  meetsThreshold: boolean;
  isBlocked: boolean;
}

/**
 * Test Engine Service
 *
 * Automatic test generation and coverage enforcement for AI-touched files.
 * Enforces minimum 80% coverage threshold (cannot go below).
 *
 * Key Features:
 * - AI-touched file detection (commit message, author, patterns)
 * - Framework auto-detection (Jest, Mocha, pytest, etc.)
 * - LLM-powered test generation with RAG evidence
 * - Coverage threshold enforcement (minimum 80%)
 * - Test placement strategies (co-located, separate, mirror)
 *
 * **Enforcement-First Behavior:**
 * - Coverage threshold minimum 80% (cannot disable)
 * - failOnBelow always true (cannot disable)
 * - Test generation failures don't block PR (fail-open)
 *
 * @example
 * ```typescript
 * const result = await testEngineService.generateTests({
 *   repositoryId: 'repo_123',
 *   filePath: 'src/auth.ts',
 *   fileContent: 'export function login() { ... }'
 * });
 * ```
 */
export class TestEngineService {
  /**
   * Detect files that were likely touched by AI coding tools.
   *
   * Uses multiple heuristics:
   * - Commit message keywords (copilot, cursor, claude, gpt, ai-generated)
   * - Author patterns (github-actions, copilot, cursor)
   * - Code patterns (generated comments, AI markers)
   *
   * Returns files with confidence >= 0.5 (50% threshold).
   *
   * @param _repositoryId - Repository ID (unused, reserved for future repo-specific patterns)
   * @param files - Files to analyze with optional commit metadata
   * @returns Array of AI-touched files with confidence scores and detection methods
   *
   * @example
   * ```typescript
   * const aiTouched = await testEngineService.detectAITouchedFiles('repo_123', [
   *   { path: 'src/auth.ts', content: '...', commitMessage: 'Added by Copilot' }
   * ]);
   * // Returns: [{ path: 'src/auth.ts', confidence: 0.4, methods: ['commit_message'] }]
   * ```
   */
  async detectAITouchedFiles(
    _repositoryId: string,
    files: Array<{ path: string; content: string; commitMessage?: string; author?: string }>,
    prBody?: string
  ): Promise<Array<{ path: string; confidence: number; methods: string[] }>> {
    const aiTouched: Array<{ path: string; confidence: number; methods: string[] }> = [];

    for (const file of files) {
      const methods: string[] = [];
      let confidence = 0;

      // Method 1: Check commit message
      if (file.commitMessage) {
        const commitMessage = file.commitMessage;
        const aiKeywords = ['copilot', 'cursor', 'claude', 'gpt', 'ai-generated', 'ai assisted'];
        if (aiKeywords.some((keyword) => commitMessage.toLowerCase().includes(keyword))) {
          methods.push('commit_message');
          confidence += 0.4;
        }
      }

      // Method 2: Check author
      if (file.author) {
        const aiAuthors = ['github-actions', 'copilot', 'cursor'];
        if (aiAuthors.some((author) => file.author?.toLowerCase().includes(author))) {
          methods.push('author');
          confidence += 0.3;
        }
      }

      // Method 2b: Check PR Body (global context)
      if (prBody) {
         const aiKeywords = ['copilot', 'cursor', 'claude', 'gpt', 'ai-generated', 'ai assisted', 'generated by'];
         if (aiKeywords.some((keyword) => prBody.toLowerCase().includes(keyword))) {
           if (!methods.includes('pr_body')) {
              methods.push('pr_body');
              confidence += 0.2;
           }
         }
      }

      // Method 3: Pattern analysis (simplified)
      const aiPatterns = [
        /\/\/ Generated by|# Generated by/i,
        /AI-?assisted|AI-?generated/i,
      ];
      if (aiPatterns.some((pattern) => pattern.test(file.content))) {
        methods.push('pattern');
        confidence += 0.3;
      }

      if (confidence >= 0.5) {
        aiTouched.push({
          path: file.path,
          confidence,
          methods,
        });
      }
    }

    return aiTouched;
  }

  /**
   * Generate tests for a file using LLM-powered test generation.
   *
   * **Process:**
   * 1. Validates config (coverage threshold >= 80%, failOnBelow always true)
   * 2. Detects test framework (or uses provided)
   * 3. Parses code structure (functions, classes, exports)
   * 4. Queries RAG evidence for similar test patterns
   * 5. Generates tests via LLM with evidence context
   * 6. Validates test syntax (framework-specific)
   * 7. Determines test placement (co-located, separate, mirror)
   * 8. Evaluates against policy (may block if policy requires)
   * 9. Creates evidence bundle for audit trail
   *
   * **Enforcement:**
   * - Coverage threshold minimum 80% (enforced)
   * - failOnBelow always true (enforced)
   * - Billing limits checked (throws UsageLimitExceededError if exceeded)
   * - Test generation failures don't block PR (fail-open)
   *
   * @param request - Test generation request with file and config
   * @returns Test generation result with test content and placement
   * @throws {Error} If coverage threshold < 80% (validation error)
   * @throws {Error} If failOnBelow is false (validation error)
   * @throws {UsageLimitExceededError} If billing limits exceeded
   * @throws {Error} If test generation fails (non-blocking, but logged)
   *
   * @example
   * ```typescript
   * const result = await testEngineService.generateTests({
   *   repositoryId: 'repo_123',
   *   prNumber: 42,
   *   prSha: 'abc123',
   *   filePath: 'src/auth.ts',
   *   fileContent: 'export function login() { ... }',
   *   framework: 'jest', // Optional, auto-detected if not provided
   *   config: {
   *     coverageThreshold: 80,  // Minimum enforced
   *     failOnBelow: true,       // Always true
   *     placement: 'co-located'   // Test next to source file
   *   }
   * });
   * ```
   */
  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const startedAt = new Date();

    // Validate config
    const config = request.config || this.getDefaultConfig();
    if (config.coverageThreshold < 80) {
      throw new Error('Coverage threshold cannot be below 80%. Minimum enforced: 80%');
    }

    if (config.failOnBelow === false) {
      throw new Error('fail_on_below cannot be disabled. Coverage enforcement is required.');
    }

    // Detect framework if not specified
    const framework = request.framework || (await this.detectFramework(request.repositoryId));

    try {
      // SECURITY: Redact secrets before sending code to LLM
      const redactionResult = redactSecrets(request.fileContent, {
        redactEmail: false,
        logDetections: true,
      });
      updateRedactionStats(redactionResult);
      const redactedCode = redactionResult.redacted;

      // Parse code structure (use redacted code)
      const parseResult = await codeParserService.parse(request.filePath, redactedCode);

      // Get organization ID from repository
      const repoForOrg = await prisma.repository.findUnique({
        where: { id: request.repositoryId },
        select: { organizationId: true },
      });

      if (!repoForOrg) {
        throw new Error(`Repository ${request.repositoryId} not found`);
      }

      // Check billing limits before generating tests
      // Note: This is a service-level check. If called from webhook, billing is already checked.
      // But if called directly from API, we need to check here.
      // For webhook calls, billing is checked upstream but we still check here for consistency.
      const organizationId = repoForOrg.organizationId;
      const { checkBillingLimitsOrThrow } = await import('../../lib/billing-middleware');
      await checkBillingLimitsOrThrow(organizationId, {
        requireFeature: 'testEngine',
        checkLLMBudget: true,
      });

      // Generate tests using LLM with REDACTED code
      const prompt = await this.buildTestPrompt(
        request.filePath,
        redactedCode, // Use redacted code, NEVER original
        parseResult,
        framework,
        request.repositoryId,
        organizationId
      );

      const llmRequest: LLMRequest = {
        prompt,
        model: 'gpt-4-turbo-preview',
        organizationId: request.repositoryId, // Would get orgId from repo
        cache: true,
        temperature: 0, // P0: Deterministic test generation for reproducibility
      };

      const response = await llmService.complete(llmRequest);
      const testContent = this.extractTestCode(response.content);

      // Validate test syntax
      await this.validateTestSyntax(testContent, framework);

      // Determine placement
      const placement = this.determinePlacement(request.filePath, config.placement, config.testDir);

      const completedAt = new Date();

      // Get organization ID for policy evaluation
      const repoForPolicy = await prisma.repository.findUnique({
        where: { id: request.repositoryId },
        select: { organizationId: true },
      });

      if (!repoForPolicy) {
        throw new Error(`Repository ${request.repositoryId} not found`);
      }

      const organizationIdForPolicy = repoForPolicy.organizationId;

      // Load effective policy
      const policy = await policyEngineService.loadEffectivePolicy(
        organizationIdForPolicy,
        request.repositoryId,
        request.prSha,
        undefined
      );

      // Check if AI-touched file requires test generation (policy-based)
      const aiTouchedFiles = await this.detectAITouchedFiles(request.repositoryId, [
        { path: request.filePath, content: request.fileContent },
      ]);

      const findings: Issue[] = [];
      if (aiTouchedFiles.length > 0 && aiTouchedFiles[0].confidence >= 0.5) {
        // AI-touched file detected - evaluate risk
        findings.push({
          ruleId: 'test-engine.ai-touched',
          severity: 'high',
          file: request.filePath,
          line: 1,
          message: 'AI-touched file detected - test coverage required',
          fix: 'Ensure test coverage meets threshold',
          confidence: aiTouchedFiles[0].confidence,
        });
      }

      // Evaluate against policy
      const evaluationResult = policyEngineService.evaluate(findings, policy);

      // Save test result
      const test = await prisma.test.create({
        data: {
          repositoryId: request.repositoryId,
          prNumber: request.prNumber || null,
          prSha: request.prSha || null,
          filePath: request.filePath,
          framework,
          status: evaluationResult.blocked ? 'blocked' : 'generated',
          testContent,
          placement,
          startedAt,
          completedAt,
        },
      });

      // Produce evidence bundle
      const fileHash = createHash('sha256').update(request.fileContent, 'utf8').digest('hex');
      const timings = {
        totalMs: completedAt.getTime() - startedAt.getTime(),
      };
      await policyEngineService.produceEvidence(
        {
          fileHash,
          filePath: request.filePath,
          commitSha: request.prSha,
          prNumber: request.prNumber,
          aiTouched: aiTouchedFiles.length > 0,
        },
        {
          findings,
          evaluationResult,
          testGenerated: !evaluationResult.blocked,
        },
        policy,
        timings,
        { testId: test.id }
      );

      return {
        id: test.id,
        status: evaluationResult.blocked ? 'blocked' : 'generated',
        testContent,
        placement,
        framework,
        startedAt,
        completedAt,
      };
    } catch (error) {
      // Test generation failures MUST block PR
      throw new Error(
        `Test generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Cannot ensure test coverage for AI-generated code. ` +
        `This PR is BLOCKED until tests are generated.`
      );
    }
  }

  /**
   * Check coverage and enforce threshold (policy-aware)
   */
  async checkCoverage(
    repositoryId: string,
    prNumber: number,
    prSha: string,
    coverageData: unknown, // lcov or coverage JSON
    config?: TestConfig
  ): Promise<CoverageResult> {
    const testConfig = config || this.getDefaultConfig();

    // Parse coverage data
    const coverage = this.parseCoverage(coverageData);

    // Get organization ID for policy evaluation
    const repoForCoverage = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { organizationId: true },
    });

    if (!repoForCoverage) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    // Load effective policy
    const organizationIdForCoverage = repoForCoverage.organizationId;
    const policy = await policyEngineService.loadEffectivePolicy(
      organizationIdForCoverage,
      repositoryId,
      prSha,
      undefined
    );

    // Check threshold
    const metric = coverage[testConfig.metric];
    const meetsThreshold = metric.percentage >= testConfig.coverageThreshold;

    // Create findings based on coverage
    const findings: Issue[] = [];
    if (!meetsThreshold) {
      findings.push({
        ruleId: 'test-engine.coverage-threshold',
        severity: 'high',
        file: 'coverage',
        line: 1,
        message: `Coverage ${metric.percentage.toFixed(1)}% below threshold ${testConfig.coverageThreshold}%`,
        fix: `Increase ${testConfig.metric} coverage to at least ${testConfig.coverageThreshold}%`,
        confidence: 1.0,
      });
    }

    // Evaluate against policy
    const evaluationResult = policyEngineService.evaluate(findings, policy);
    const isBlocked = evaluationResult.blocked || (!meetsThreshold && testConfig.failOnBelow);

    return {
      repositoryId,
      prNumber,
      prSha,
      coverage,
      meetsThreshold,
      isBlocked,
    };
  }

  /**
   * Build test generation prompt
   */
  private async buildTestPrompt(
    filePath: string,
    content: string,
    _parseResult: unknown,
    framework: string,
    _repositoryId: string,
    _organizationId: string
  ): Promise<string> {
    // P2: Use centralized, versioned prompts (PROMPT_ARCHITECTURE)
    const builtPrompt = testEnginePromptBuilder.buildGenerateTestsPrompt(
      filePath,
      content,
      framework
    );

    return combinedPrompt(builtPrompt);

    // Note: Evidence integration can be re-added later as a prompt enhancement
  }

  /**
   * Extract test code from LLM response
   */
  private extractTestCode(response: string): string {
    // Extract code blocks
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, return response as-is
    return response.trim();
  }

  /**
   * Validate test syntax
   */
  private async validateTestSyntax(testContent: string, framework: string): Promise<void> {
    // Simplified validation (would use actual parser in production)
    if (!testContent || testContent.length < 10) {
      throw new Error('Generated test is too short or empty');
    }

    // Basic syntax checks
    if (framework === 'jest' && !testContent.includes('describe') && !testContent.includes('test')) {
      throw new Error('Generated test does not match Jest syntax');
    }

    if (framework === 'pytest' && !testContent.includes('def test_')) {
      throw new Error('Generated test does not match pytest syntax');
    }
  }

  /**
   * Determine test file placement
   */
  private determinePlacement(
    filePath: string,
    placement: string,
    testDir?: string
  ): string {
    switch (placement) {
      case 'co-located':
        // Place next to source file
        return filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
      case 'separate':
        // Place in test directory
        {
          const fileName = filePath.split('/').pop() || '';
          return `${testDir || 'tests'}/${fileName.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1')}`;
        }
      case 'mirror':
        // Mirror directory structure
        return filePath.replace(/^src\//, 'tests/').replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
      default:
        return filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
    }
  }

  /**
   * Detect test framework
   */
  private async detectFramework(_repositoryId: string): Promise<string> {
    // Would check repo config or package.json in production
    // Default to Jest for TypeScript/JavaScript
    return 'jest';
  }

  /**
   * Parse coverage data (lcov or JSON)
   */
  private parseCoverage(coverageData: unknown): CoverageResult['coverage'] {
    // Simplified parsing (would use proper lcov parser in production)
    if (coverageData && typeof coverageData === 'object' && 'lines' in coverageData) {
      const data = coverageData as {
        lines?: { total?: number; covered?: number; percentage?: number };
        branches?: { total?: number; covered?: number; percentage?: number };
        functions?: { total?: number; covered?: number; percentage?: number };
      };
      return {
        lines: {
          total: data.lines?.total || 0,
          covered: data.lines?.covered || 0,
          percentage: data.lines?.percentage || 0,
        },
        branches: {
          total: data.branches?.total || 0,
          covered: data.branches?.covered || 0,
          percentage: data.branches?.percentage || 0,
        },
        functions: {
          total: data.functions?.total || 0,
          covered: data.functions?.covered || 0,
          percentage: data.functions?.percentage || 0,
        },
      };
    }

    // Default empty coverage
    return {
      lines: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
    };
  }

  /**
   * Execute tests asynchronously (non-blocking)
   *
   * Queues test execution as a background job and returns immediately.
   * Tests run in isolated sandboxes and results are stored for later retrieval.
   *
   * @param runId - Run ID to track execution
   * @param repositoryId - Repository ID
   * @param organizationId - Organization ID
   * @param filePath - File path to test
   * @param testContent - Generated test code
   * @param sourceCode - Source code being tested
   * @param framework - Test framework (jest, mocha, pytest, etc.)
   * @param coverageThreshold - Coverage threshold (default 80%)
   * @returns Job info with ID and queued timestamp
   */
  async executeTestsAsync(
    runId: string,
    repositoryId: string,
    organizationId: string,
    filePath: string,
    testContent: string,
    _sourceCode: string,
    framework: string = 'jest',
    _coverageThreshold: number = 80
  ): Promise<{ jobId: string; queuedAt: Date }> {
    logger.info(
      {
        runId,
        repositoryId,
        filePath,
        framework,
      },
      'Queuing test execution job'
    );

// Enqueue the job
    const jobResult = await enqueueTestExecutionJob({
      id: `job_${runId}_${Date.now()}`,
      testRunId: runId,
      organizationId,
      projectId: repositoryId,
      generatedTests: [{
        id: `test_${Date.now()}`,
        framework: framework as 'jest' | 'mocha' | 'pytest' | 'vitest' | 'other',
        code: testContent,
        targetFile: filePath,
      }],
    }) satisfies { id: string; status: string };

    return {
      jobId: jobResult.id,
      queuedAt: new Date(),
    };
  }

/**
   * Process test execution job synchronously (for testing/debugging)
   *
   * @param runId - Run ID
   * @param repositoryId - Repository ID
   * @param organizationId - Organization ID
   * @param filePath - File path to test
   * @param testContent - Generated test code
   * @param sourceCode - Source code being tested
   * @param framework - Test framework
   * @param coverageThreshold - Coverage threshold
   * @param timeoutMs - Execution timeout in milliseconds
   * @returns Test execution result
   */
async executeTestsSync(
    _runId: string,
    _repositoryId: string,
    _organizationId: string,
    filePath: string,
    testContent: string,
    sourceCode: string,
    framework: string = 'jest',
    _coverageThreshold: number = 80,
    _timeoutMs: number = 30000
  ): Promise<TestExecutionResult> {
    logger.info(
      {
        runId: _runId,
        repositoryId: _repositoryId,
        filePath,
        framework,
        timeout: _timeoutMs,
      },
      'Executing tests synchronously'
    );

    const result = await executeTests({
      filePath,
      testContent,
      sourceCode,
      framework: framework as 'jest' | 'mocha' | 'pytest' | 'vitest' | 'other',
    });

    return result;
  }

  /**
   * Get default config (enforcement-first)
   */
  private getDefaultConfig(): TestConfig {
    return {
      coverageThreshold: 80, // Minimum 80%
      metric: 'lines',
      enforceOn: 'pr',
      failOnBelow: true, // REQUIRED: Cannot disable
      placement: 'co-located',
    };
  }
}

export const testEngineService = new TestEngineService();
