/**
 * Test Executor Worker
 * 
 * Background worker for executing generated tests
 * - Runs tests in isolated sandbox environments
 * - Measures code coverage
 * - Handles framework detection and execution
 * - Non-blocking: tests complete asynchronously
 */

import { prisma } from '../lib/prisma';
import { executeTests, TestExecutionRequest, TestExecutionResult } from '../services/test-engine/executor';
import { logger } from '../observability/logging';
import { metrics } from '../observability/metrics';

export interface TestExecutionJob {
  runId: string;
  repositoryId: string;
  organizationId: string;
  filePath: string;
  testContent: string;
  sourceCode: string;
  framework: 'jest' | 'mocha' | 'pytest' | 'vitest' | 'other';
  coverageThreshold?: number;
}

export interface TestExecutionJobResult {
  runId: string;
  filePath: string;
  status: 'passed' | 'failed' | 'timeout';
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  coverage: {
    linesCovered: number;
    linesTotal: number;
    percentCovered: number;
  };
  meetsThreshold: boolean;
  durationMs: number;
  error?: string;
  completedAt: Date;
}

/**
 * Process a test execution job
 */
export async function processTestExecutionJob(
  job: TestExecutionJob,
  timeoutMs: number = 30000
): Promise<TestExecutionJobResult> {
  const startTime = Date.now();
  const jobId = `test_${job.runId}_${Math.random().toString(36).slice(2, 9)}`;

  logger.info(
    {
      jobId,
      runId: job.runId,
      filePath: job.filePath,
      framework: job.framework,
    },
    'Starting test execution job'
  );

  try {
    // Check if test execution is enabled for this org
    const org = await prisma.organizations.findUnique({
      where: { id: job.organizationId },
      select: { settings: true },
    });

    if (!org?.settings?.['test_execution_enabled']) {
      metrics.increment('test_execution_skipped', { reason: 'disabled_for_org' });

      logger.debug(
        { runId: job.runId },
        'Test execution disabled for organization'
      );

      return {
        runId: job.runId,
        filePath: job.filePath,
        status: 'passed',
        testsPassed: 0,
        testsFailed: 0,
        totalTests: 0,
        coverage: {
          linesCovered: 0,
          linesTotal: 0,
          percentCovered: 0,
        },
        meetsThreshold: true,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      };
    }

    // Create timeout promise
    const timeoutPromise = new Promise<TestExecutionJobResult>((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Test execution timeout after ${timeoutMs}ms`);
        reject(error);
      }, timeoutMs);
    });

    // Create execution promise
    const executionPromise = executeTestsWithSandbox(job);

    // Race: execution vs timeout
    const executionResult = await Promise.race([executionPromise, timeoutPromise]);

    const durationMs = Date.now() - startTime;

    metrics.recordHistogram('test_execution_duration_ms', durationMs);
    metrics.increment('test_execution_success', {
      framework: job.framework,
      meetsThreshold: executionResult.meetsThreshold ? 'yes' : 'no',
    });

    logger.info(
      {
        jobId,
        runId: job.runId,
        filePath: job.filePath,
        durationMs,
        testsPassed: executionResult.testsPassed,
        testsFailed: executionResult.testsFailed,
        coverage: executionResult.coverage.percentCovered,
        meetsThreshold: executionResult.meetsThreshold,
      },
      'Test execution job completed'
    );

    return {
      ...executionResult,
      completedAt: new Date(),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const isTimeout = error instanceof Error && error.message.includes('timeout');

    logger.warn(
      {
        jobId,
        runId: job.runId,
        filePath: job.filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        isTimeout,
      },
      'Test execution job failed'
    );

    metrics.increment('test_execution_failed', {
      reason: isTimeout ? 'timeout' : 'error',
      framework: job.framework,
    });

    return {
      runId: job.runId,
      filePath: job.filePath,
      status: isTimeout ? 'timeout' : 'failed',
      testsPassed: 0,
      testsFailed: 0,
      totalTests: 0,
      coverage: {
        linesCovered: 0,
        linesTotal: 0,
        percentCovered: 0,
      },
      meetsThreshold: false,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    };
  }
}

/**
 * Execute tests with sandbox isolation
 */
async function executeTestsWithSandbox(
  job: TestExecutionJob,
  timeoutMs: number = 30000
): Promise<Omit<TestExecutionJobResult, 'completedAt' | 'durationMs'>> {
  const executionRequest: TestExecutionRequest = {
    filePath: job.filePath,
    testContent: job.testContent,
    sourceCode: job.sourceCode,
    framework: job.framework,
    coverageThreshold: job.coverageThreshold || 80,
  };

  // Execute tests
  const result = await executeTests(executionRequest, timeoutMs);

  // Convert coverage metrics
  return {
    runId: job.runId,
    filePath: job.filePath,
    status: result.status,
    testsPassed: result.testsPassed,
    testsFailed: result.testsFailed,
    totalTests: result.totalTests,
    coverage: {
      linesCovered: result.coverage.lines.covered,
      linesTotal: result.coverage.lines.total,
      percentCovered: result.coverage.lines.percentage,
    },
    meetsThreshold: result.meetsThreshold,
  };
}

/**
 * Enqueue a test execution job
 */
export async function enqueueTestExecutionJob(
  job: TestExecutionJob
): Promise<{ jobId: string; queuedAt: Date }> {
  const jobId = `test_${job.runId}_${Math.random().toString(36).slice(2, 9)}`;

  logger.info(
    {
      jobId,
      runId: job.runId,
      filePath: job.filePath,
      framework: job.framework,
    },
    'Enqueuing test execution job'
  );

  metrics.increment('test_execution_enqueued', {
    framework: job.framework,
  });

  // In a real implementation, this would push to a queue (Redis, Bull, etc.)
  // For now, we'll just log the intent
  // TODO: Integrate with job queue system (BullMQ, Celery, etc.)

  return {
    jobId,
    queuedAt: new Date(),
  };
}

/**
 * Get test execution job status
 */
export async function getTestExecutionJobStatus(
  jobId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: TestExecutionJobResult;
  error?: string;
}> {
  // TODO: Implement job status tracking from queue system
  return {
    status: 'pending',
  };
}

/**
 * Monitor test execution metrics
 */
export interface TestExecutionMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageCoverage: number;
  averageDuration: number;
  timeoutRate: number;
  successRate: number;
}

const testMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalCoverage: 0,
  totalDuration: 0,
  timeouts: 0,
  successes: 0,
};

/**
 * Get test execution metrics
 */
export function getTestExecutionMetrics(): TestExecutionMetrics {
  const total = testMetrics.totalTests;
  const avg = total > 0;

  return {
    totalTests: total,
    passedTests: testMetrics.passedTests,
    failedTests: testMetrics.failedTests,
    averageCoverage: avg ? testMetrics.totalCoverage / total : 0,
    averageDuration: avg ? testMetrics.totalDuration / total : 0,
    timeoutRate: total > 0 ? (testMetrics.timeouts / total) * 100 : 0,
    successRate: total > 0 ? (testMetrics.successes / total) * 100 : 0,
  };
}

/**
 * Update test execution metrics
 */
export function updateTestExecutionMetrics(result: TestExecutionJobResult): void {
  testMetrics.totalTests++;
  testMetrics.passedTests += result.testsPassed;
  testMetrics.failedTests += result.testsFailed;
  testMetrics.totalCoverage += result.coverage.percentCovered;
  testMetrics.totalDuration += result.durationMs;

  if (result.status === 'timeout') {
    testMetrics.timeouts++;
  }
  if (result.status === 'passed') {
    testMetrics.successes++;
  }
}
