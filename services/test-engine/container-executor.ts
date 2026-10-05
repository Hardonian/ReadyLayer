import path from 'node:path';

import { sandboxManager } from './sandbox-manager';

export interface ContainerExecutionRequest {
  filePath: string;
  testContent: string;
  framework: string;
  sourceCode: string;
  coverageThreshold: number;
  timeoutMs: number;
}

export interface ContainerExecutionResult {
  filePath: string;
  status: 'passed' | 'failed' | 'timeout';
  framework: string;
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  coverage: {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
  };
  meetsThreshold: boolean;
  durationMs: number;
  output?: string;
  error?: string;
}

interface ContainerTestPlan {
  command: string[];
  testFilePath: string;
}

const MAX_REPORTED_OUTPUT_BYTES = 20_000;
const MOCHA_CLI_PATH = '/usr/local/lib/node_modules/mocha/bin/mocha.js';

export async function executeContainerTests(
  request: ContainerExecutionRequest
): Promise<ContainerExecutionResult> {
  const startTime = Date.now();
  const image = process.env.READYLAYER_TEST_RUNNER_IMAGE;
  if (!image) {
    return failedResult(
      request,
      startTime,
      'READYLAYER_TEST_RUNNER_IMAGE is required for container test execution.'
    );
  }

  let plan: ContainerTestPlan;
  try {
    plan = createTestPlan(request.filePath, request.framework);
  } catch (error) {
    return failedResult(
      request,
      startTime,
      error instanceof Error ? error.message : 'Invalid test execution request.'
    );
  }

  try {
    const sandboxResult = await sandboxManager.runInSandbox(
      plan.command,
      [
        { path: normalizeWorkspacePath(request.filePath), content: request.sourceCode },
        { path: plan.testFilePath, content: request.testContent },
      ],
      {
        image,
        memoryLimitMb: numberFromEnv('READY_LAYER_TEST_RUNNER_MEMORY_MB', 512),
        cpuLimit: numberFromEnv('READY_LAYER_TEST_RUNNER_CPU_LIMIT', 1),
        timeoutMs: request.timeoutMs,
        networkEnabled: false,
        allowProcessFallback: false,
        maxOutputBytes: numberFromEnv('READY_LAYER_TEST_RUNNER_MAX_OUTPUT_BYTES', 1_000_000),
      }
    );

    const output = truncateOutput(`${sandboxResult.stdout}\n${sandboxResult.stderr}`);
    if (sandboxResult.timedOut) {
      return failedResult(request, startTime, `Container test execution timed out after ${request.timeoutMs}ms.`, 'timeout', output);
    }
    if (sandboxResult.exitCode !== 0) {
      return failedResult(
        request,
        startTime,
        output || `Container test runner exited with code ${sandboxResult.exitCode}.`,
        'failed',
        output
      );
    }

    const counts = parseTestCounts(request.framework, output);
    const coverage = parseCoverage(output);
    return {
      filePath: request.filePath,
      status: 'passed',
      framework: request.framework,
      testsPassed: counts.passed,
      testsFailed: counts.failed,
      totalTests: counts.passed + counts.failed,
      coverage,
      meetsThreshold: coverage.lines.percentage >= request.coverageThreshold,
      durationMs: sandboxResult.durationMs,
      output: output || undefined,
    };
  } catch (error) {
    return failedResult(
      request,
      startTime,
      error instanceof Error ? error.message : 'Container test execution failed.'
    );
  }
}

function createTestPlan(filePath: string, framework: string): ContainerTestPlan {
  const normalizedFramework = framework.toLowerCase();
  const sourcePath = normalizeWorkspacePath(filePath);
  const extension = path.posix.extname(sourcePath);
  const stem = extension ? sourcePath.slice(0, -extension.length) : sourcePath;
  const testFilePath = normalizedFramework === 'pytest'
    ? `${path.posix.dirname(sourcePath)}/test_${path.posix.basename(stem)}.py`
    : `${stem}.readylayer.test${extension || '.js'}`;

  switch (normalizedFramework) {
    case 'vitest':
      return {
        command: ['vitest', 'run', testFilePath, '--reporter=verbose', '--coverage.enabled', '--coverage.reporter=text'],
        testFilePath,
      };
    case 'jest':
      return { command: ['jest', testFilePath, '--runInBand', '--coverage'], testFilePath };
    case 'mocha':
      return {
        command: ['c8', '--reporter=text', 'tsx', MOCHA_CLI_PATH, testFilePath, '--reporter', 'spec'],
        testFilePath,
      };
    case 'pytest':
      return { command: ['pytest', '-q', testFilePath, '--cov=.', '--cov-report=term'], testFilePath };
    case 'other':
      return { command: ['c8', '--reporter=text', 'node', '--test', testFilePath], testFilePath };
    default:
      throw new Error(`Unsupported container test framework: ${framework}`);
  }
}

function normalizeWorkspacePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`Invalid test file path: ${filePath}`);
  }
  return normalized;
}

function parseTestCounts(framework: string, output: string): { passed: number; failed: number } {
  const ansiEscapeExpression = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');
  const normalizedOutput = output.replace(ansiEscapeExpression, '');
  if (framework.toLowerCase() === 'mocha') {
    return { passed: lastMatch(/([0-9]+) passing/g, normalizedOutput), failed: lastMatch(/([0-9]+) failing/g, normalizedOutput) };
  }
  if (framework.toLowerCase() === 'pytest') {
    return { passed: lastMatch(/([0-9]+) passed/g, normalizedOutput), failed: lastMatch(/([0-9]+) failed/g, normalizedOutput) };
  }

  const summary = normalizedOutput
    .split(/\r?\n/)
    .filter((line) => /\bTests\b/.test(line))
    .join(' ');
  return {
    passed: lastMatch(/([0-9]+) passed/g, summary),
    failed: lastMatch(/([0-9]+) failed/g, summary),
  };
}

function lastMatch(pattern: RegExp, value: string): number {
  const matches = [...value.matchAll(pattern)];
  return matches.length > 0 ? Number(matches[matches.length - 1][1]) : 0;
}

function numberFromEnv(name: string, fallback: number): number {
  const rawValue = Number(process.env[name]);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : fallback;
}

function truncateOutput(output: string): string {
  const outputBuffer = Buffer.from(output, 'utf8');
  return outputBuffer.byteLength > MAX_REPORTED_OUTPUT_BYTES
    ? `${outputBuffer.subarray(0, MAX_REPORTED_OUTPUT_BYTES).toString('utf8')}\n[output truncated]`
    : output;
}

function emptyCoverage(): ContainerExecutionResult['coverage'] {
  return {
    lines: { total: 0, covered: 0, percentage: 0 },
    branches: { total: 0, covered: 0, percentage: 0 },
    functions: { total: 0, covered: 0, percentage: 0 },
    statements: { total: 0, covered: 0, percentage: 0 },
  };
}

function parseCoverage(output: string): ContainerExecutionResult['coverage'] {
  const coverage = emptyCoverage();
  const coverageLine = output.split(/\r?\n/).find((line) => /^All files\s*\|/.test(line.trim()));
  if (coverageLine) {
    const values = coverageLine
      .split('|')
      .slice(1, 5)
      .map((value) => Number(value.trim().replace('%', '')));
    if (values.every((value) => Number.isFinite(value))) {
      coverage.statements.percentage = values[0];
      coverage.branches.percentage = values[1];
      coverage.functions.percentage = values[2];
      coverage.lines.percentage = values[3];
      return coverage;
    }
  }

  const pytestCoverage = output.match(/^TOTAL\s+\d+\s+\d+\s+(\d+(?:\.\d+)?)%/m);
  if (pytestCoverage) {
    const percentage = Number(pytestCoverage[1]);
    coverage.lines.percentage = percentage;
    coverage.statements.percentage = percentage;
  }
  return coverage;
}

function failedResult(
  request: ContainerExecutionRequest,
  startTime: number,
  error: string,
  status: 'failed' | 'timeout' = 'failed',
  output?: string
): ContainerExecutionResult {
  return {
    filePath: request.filePath,
    status,
    framework: request.framework,
    testsPassed: 0,
    testsFailed: 0,
    totalTests: 0,
    coverage: emptyCoverage(),
    meetsThreshold: false,
    durationMs: Math.max(1, Date.now() - startTime),
    output,
    error,
  };
}
