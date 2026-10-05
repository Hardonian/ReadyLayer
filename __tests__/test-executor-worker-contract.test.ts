import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeTests: vi.fn(),
  increment: vi.fn(),
  timing: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@/services/test-engine/executor', () => ({
  executeTests: mocks.executeTests,
}));

vi.mock('@/observability/metrics', () => ({
  metrics: {
    increment: mocks.increment,
    timing: mocks.timing,
  },
}));

vi.mock('@/observability/logging', () => ({
  logger: {
    info: mocks.info,
    warn: mocks.warn,
    error: mocks.error,
    debug: mocks.debug,
  },
}));

vi.mock('@/queue', () => ({
  queueService: {
    enqueue: vi.fn(),
    processQueue: vi.fn(),
  },
}));

import { executeTestJob, validateTestJob } from '@/workers/test-executor-worker';

function result(filePath: string, status: 'passed' | 'failed' | 'timeout', coverage: number): object {
  return {
    filePath,
    framework: 'vitest',
    status,
    testsPassed: status === 'passed' ? 1 : 0,
    testsFailed: status === 'failed' ? 1 : 0,
    totalTests: 1,
    meetsThreshold: coverage >= 80,
    durationMs: 4,
    coverage: {
      lines: { total: 10, covered: Math.round(coverage / 10), percentage: coverage },
    },
  };
}

describe('test executor worker contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes every generated test with its source code and reports failures', async () => {
    mocks.executeTests
      .mockResolvedValueOnce(result('src/one.ts', 'passed', 90))
      .mockResolvedValueOnce(result('src/two.ts', 'failed', 70));

    const execution = await executeTestJob({
      id: 'job-1',
      testRunId: 'run-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      generatedTests: [
        { id: 'test-1', framework: 'vitest', code: 'it("one", () => {})', targetFile: 'src/one.ts', sourceCode: 'export const one = 1;' },
        { id: 'test-2', framework: 'vitest', code: 'it("two", () => {})', targetFile: 'src/two.ts', sourceCode: 'export const two = 2;' },
      ],
    });

    expect(mocks.executeTests).toHaveBeenCalledTimes(2);
    expect(mocks.executeTests).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: 'src/one.ts', sourceCode: 'export const one = 1;',
    }), 300000);
    expect(mocks.executeTests).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: 'src/two.ts', sourceCode: 'export const two = 2;',
    }), 300000);
    expect(execution.status).toBe('failure');
    expect(execution.results).toHaveLength(2);
    expect(mocks.info).toHaveBeenCalledWith(expect.objectContaining({ avgCoverage: 80 }), 'Test execution completed');
    expect(mocks.increment).toHaveBeenCalledWith('test_execution_job_completed', expect.objectContaining({ status: 'failure' }));
  });

  it('reports a timeout when any generated test times out', async () => {
    mocks.executeTests.mockResolvedValue(result('src/slow.ts', 'timeout', 0));

    const execution = await executeTestJob({
      id: 'job-2',
      testRunId: 'run-2',
      organizationId: 'org-1',
      projectId: 'project-1',
      generatedTests: [
        { id: 'test-1', framework: 'vitest', code: 'it("slow", () => {})', targetFile: 'src/slow.ts' },
      ],
    });

    expect(execution.status).toBe('timeout');
  });

  it('fails a job when executed tests do not meet the coverage threshold', async () => {
    mocks.executeTests.mockResolvedValue(result('src/low-coverage.ts', 'passed', 70));

    const execution = await executeTestJob({
      id: 'job-coverage',
      testRunId: 'run-coverage',
      organizationId: 'org-1',
      projectId: 'project-1',
      generatedTests: [
        { id: 'test-1', framework: 'vitest', code: 'it("low coverage", () => {})', targetFile: 'src/low-coverage.ts' },
      ],
    });

    expect(execution.status).toBe('failure');
  });

  it('clears the aggregate timeout after a completed job', async () => {
    vi.useFakeTimers();
    mocks.executeTests.mockResolvedValue(result('src/fast.ts', 'passed', 90));

    try {
      const execution = await executeTestJob({
        id: 'job-3',
        testRunId: 'run-3',
        organizationId: 'org-1',
        projectId: 'project-1',
        generatedTests: [
          { id: 'test-1', framework: 'vitest', code: 'it("fast", () => {})', targetFile: 'src/fast.ts' },
        ],
      });

      expect(execution.status).toBe('success');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects malformed optional source code in queued jobs', () => {
    expect(validateTestJob({
      id: 'job-4',
      testRunId: 'run-4',
      organizationId: 'org-1',
      projectId: 'project-1',
      generatedTests: [{ id: 'test-1', framework: 'vitest', code: 'test()', targetFile: 'src/a.ts', sourceCode: 42 }],
    })).toBe(false);
  });
});
