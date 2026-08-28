/**
 * Test Executor Worker
 *
 * Background worker for executing generated tests in isolated environments
 * with timeout handling, coverage reporting, and results persistence.
 */

import { logger } from '@/observability/logging';
import { metrics } from '@/observability/metrics';
import { TestExecutionResult } from '@/lib/types/test-run';
import { executeTests } from '@/services/test-engine/executor';

export interface TestExecutionJob {
  id: string;
  testRunId: string;
  organizationId: string;
  projectId: string;
  generatedTests: Array<{
    id: string;
    framework: string;
    code: string;
    targetFile: string;
  }>;
  sandboxId?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
}

export interface TestExecutionJobResult {
  jobId: string;
  testRunId: string;
  status: 'success' | 'failure' | 'timeout' | 'error';
  results: TestExecutionResult[];
  startedAt: Date;
  completedAt: Date;
  duration: number;
  error?: string;
}

/**
 * Execute tests in a worker context
 */
export async function executeTestJob(
  job: TestExecutionJob
): Promise<TestExecutionJobResult> {
  const startTime = Date.now();

  try {
    logger.info(
      {
        jobId: job.id,
        testRunId: job.testRunId,
        testCount: job.generatedTests.length,
      },
      'Starting test execution job'
    );

    metrics.increment('test_execution_job_started', {
      organizationId: job.organizationId,
      testCount: job.generatedTests.length.toString(),
    });

    // Execute tests with timeout
    const timeout = job.timeout || 300000; // 5 minutes default
    const maxRetries = job.maxRetries || 2;

    let lastError: Error | null = null;
    let results: TestExecutionResult[] = [];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        results = await executeTestsWithTimeout(
          job.generatedTests,
          timeout,
          job.sandboxId
        );
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          logger.warn(
            {
              jobId: job.id,
              attempt: attempt + 1,
              maxRetries,
              error: lastError.message,
            },
            'Test execution failed, retrying...'
          );

          metrics.increment('test_execution_retry', {
            attempt: (attempt + 1).toString(),
          });

          // Wait before retry (exponential backoff)
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    if (lastError && results.length === 0) {
      throw lastError;
    }

    const duration = Date.now() - startTime;

    // Calculate coverage metrics
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = 0; // Results only have passed/failed/timeout status
    const erroredTests = 0; // Results only have passed/failed/timeout status

    const avgCoverage =
      results.length > 0
        ? results.reduce((sum, r) => {
            const coverage = (r as { coverage?: { percentage?: number } }).coverage;
            return sum + (coverage?.percentage ?? 0);
          }, 0) /
          results.length
        : 0;

    logger.info(
      {
        jobId: job.id,
        testRunId: job.testRunId,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        erroredTests,
        avgCoverage: Math.round(avgCoverage),
        duration,
      },
      'Test execution completed'
    );

    metrics.increment('test_execution_job_completed', {
      organizationId: job.organizationId,
      status: 'success',
    });

    const metricsWithTiming = metrics as {
      timing?: (name: string, value: number, tags?: Record<string, string>) => void;
    };
    metricsWithTiming.timing?.('test_execution_duration_ms', duration, {
      organizationId: job.organizationId,
    });

    return {
      jobId: job.id,
      testRunId: job.testRunId,
      status: 'success',
      results,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      {
        jobId: job.id,
        testRunId: job.testRunId,
        error: errorMessage,
        duration,
      },
      'Test execution job failed'
    );

    metrics.increment('test_execution_job_failed', {
      organizationId: job.organizationId,
      errorType: error instanceof Error ? error.name : 'unknown',
    });

    // Determine failure status
    let status: 'failure' | 'timeout' | 'error' = 'error';
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      status = 'timeout';
    }

    return {
      jobId: job.id,
      testRunId: job.testRunId,
      status,
      results: [],
      startedAt: new Date(startTime - duration),
      completedAt: new Date(),
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Execute tests with timeout enforcement
 */
async function executeTestsWithTimeout(
  tests: Array<{ id: string; framework: string; code: string; targetFile: string }>,
  timeoutMs: number,
  _sandboxId?: string
): Promise<TestExecutionResult[]> {
  // Convert test format to match executeTests expectations
  const testRequest = tests.length > 0 ? {
    filePath: tests[0].targetFile,
    testContent: tests[0].code,
    framework: tests[0].framework as 'jest' | 'mocha' | 'pytest' | 'vitest' | 'other',
    sourceCode: '',
  } : {
    filePath: '',
    testContent: '',
    framework: 'jest' as const,
    sourceCode: '',
  };

  const results = await Promise.race([
    executeTests(testRequest).then(result => [result]),
    new Promise<TestExecutionResult[]>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Test execution timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
  return results as TestExecutionResult[];
}

/**
 * Batch execute multiple test jobs
 */
export async function executeBatchTestJobs(
  jobs: TestExecutionJob[]
): Promise<TestExecutionJobResult[]> {
  logger.info(
    {
      jobCount: jobs.length,
    },
    'Starting batch test execution'
  );

  metrics.increment('test_execution_batch_started', {
    jobCount: jobs.length.toString(),
  });

  const results = await Promise.all(
    jobs.map(job =>
      executeTestJob(job).catch(error => ({
        jobId: job.id,
        testRunId: job.testRunId,
        status: 'error' as const,
        results: [],
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    )
  );

  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status !== 'success').length;

  logger.info(
    {
      totalJobs: jobs.length,
      successCount,
      failureCount,
    },
    'Batch test execution completed'
  );

  metrics.increment('test_execution_batch_completed', {
    totalJobs: jobs.length.toString(),
    successCount: successCount.toString(),
    failureCount: failureCount.toString(),
  });

  return results;
}

/**
 * Validate test job structure
 */
export function validateTestJob(job: unknown): job is TestExecutionJob {
  if (!job || typeof job !== 'object') {
    return false;
  }

  const record = job as {
    id?: unknown;
    testRunId?: unknown;
    organizationId?: unknown;
    projectId?: unknown;
    generatedTests?: unknown;
  };

  return (
    typeof record.id === 'string' &&
    typeof record.testRunId === 'string' &&
    typeof record.organizationId === 'string' &&
    typeof record.projectId === 'string' &&
    Array.isArray(record.generatedTests) &&
    record.generatedTests.every((test) => {
      if (!test || typeof test !== 'object') {
        return false;
      }
      const testRecord = test as { id?: unknown; framework?: unknown; code?: unknown; targetFile?: unknown };
      return (
        typeof testRecord.id === 'string' &&
        typeof testRecord.framework === 'string' &&
        typeof testRecord.code === 'string' &&
        typeof testRecord.targetFile === 'string'
      );
    })
  );
}

/**
 * Enqueue test execution job
 * TODO: Implement proper job queue (Redis/Bull)
 */
export async function enqueueTestExecutionJob(
  _job: TestExecutionJob
): Promise<{ id: string; status: string }> {
  // TODO: Queue job in Redis/Bull and return job info
  const jobId = `test_job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  logger.debug({ jobId }, 'Test execution job queued (stub)');
  return { id: jobId, status: 'queued' };
}
