import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runInSandbox: vi.fn(),
}));

vi.mock('@/services/test-engine/sandbox-manager', () => ({
  sandboxManager: {
    runInSandbox: mocks.runInSandbox,
  },
}));

import { executeContainerTests } from '@/services/test-engine/container-executor';

const request = {
  filePath: 'src/math.ts',
  framework: 'mocha',
  sourceCode: 'export const add = (a: number, b: number) => a + b;',
  testContent: 'describe("math", () => it("adds", () => {}));',
  coverageThreshold: 80,
  timeoutMs: 15_000,
};

describe('container test executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails clearly when a production runner image is not configured', async () => {
    const result = await executeContainerTests(request);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('READYLAYER_TEST_RUNNER_IMAGE is required');
    expect(mocks.runInSandbox).not.toHaveBeenCalled();
  });

  it('executes generated source and tests in the configured isolated container', async () => {
    vi.stubEnv('READYLAYER_TEST_RUNNER_IMAGE', 'readylayer-test-runner:local');
    mocks.runInSandbox.mockResolvedValue({
      exitCode: 0,
      stdout: '  2 passing\nAll files | 100 | 100 | 100 | 100 |\n',
      stderr: '',
      durationMs: 123,
      timedOut: false,
      sandboxType: 'docker',
    });

    const result = await executeContainerTests(request);

    expect(mocks.runInSandbox).toHaveBeenCalledWith(
      [
        'c8',
        '--reporter=text',
        'tsx',
        '/usr/local/lib/node_modules/mocha/bin/mocha.js',
        'src/math.readylayer.test.ts',
        '--reporter',
        'spec',
      ],
      [
        { path: 'src/math.ts', content: request.sourceCode },
        { path: 'src/math.readylayer.test.ts', content: request.testContent },
      ],
      expect.objectContaining({
        image: 'readylayer-test-runner:local',
        networkEnabled: false,
        allowProcessFallback: false,
        timeoutMs: 15_000,
      })
    );
    expect(result).toMatchObject({
      status: 'passed',
      testsPassed: 2,
      testsFailed: 0,
      totalTests: 2,
      durationMs: 123,
      meetsThreshold: true,
    });
  });

  it('preserves container timeout status for queue retry policy', async () => {
    vi.stubEnv('READYLAYER_TEST_RUNNER_IMAGE', 'readylayer-test-runner:local');
    mocks.runInSandbox.mockResolvedValue({
      exitCode: 124,
      stdout: '',
      stderr: '',
      durationMs: 15_000,
      timedOut: true,
      sandboxType: 'docker',
    });

    const result = await executeContainerTests(request);

    expect(result.status).toBe('timeout');
    expect(result.error).toContain('timed out');
  });

  it('parses Vitest test and coverage summaries', async () => {
    vi.stubEnv('READYLAYER_TEST_RUNNER_IMAGE', 'readylayer-test-runner:local');
    mocks.runInSandbox.mockResolvedValue({
      exitCode: 0,
      stdout: ' Test Files  1 passed\n      Tests  3 passed\nAll files | 80 | 75 | 100 | 82 |\n',
      stderr: '',
      durationMs: 123,
      timedOut: false,
      sandboxType: 'docker',
    });

    const result = await executeContainerTests({ ...request, framework: 'vitest' });

    expect(mocks.runInSandbox).toHaveBeenCalledWith(
      ['vitest', 'run', 'src/math.readylayer.test.ts', '--reporter=verbose', '--coverage.enabled', '--coverage.reporter=text'],
      expect.any(Array),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      status: 'passed',
      testsPassed: 3,
      coverage: expect.objectContaining({
        lines: expect.objectContaining({ percentage: 82 }),
        branches: expect.objectContaining({ percentage: 75 }),
      }),
      meetsThreshold: true,
    });
  });

  it('rejects source paths that could escape the mounted workspace', async () => {
    vi.stubEnv('READYLAYER_TEST_RUNNER_IMAGE', 'readylayer-test-runner:local');

    const result = await executeContainerTests({ ...request, filePath: '../secrets.ts' });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Invalid test file path');
    expect(mocks.runInSandbox).not.toHaveBeenCalled();
  });

  it('rejects Windows absolute source paths', async () => {
    vi.stubEnv('READYLAYER_TEST_RUNNER_IMAGE', 'readylayer-test-runner:local');

    const result = await executeContainerTests({ ...request, filePath: 'C:\\outside.ts' });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Invalid test file path');
    expect(mocks.runInSandbox).not.toHaveBeenCalled();
  });
});
