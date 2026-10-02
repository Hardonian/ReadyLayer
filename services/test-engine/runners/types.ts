/**
 * Test Runner Adapter Types
 */

export interface RunnerCoverageSummary {
  lines: number;
  branches?: number;
  functions?: number;
}

export interface RunnerResult {
  passed: boolean;
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  coverage: RunnerCoverageSummary;
  rawOutput: string;
}

export interface TestRunnerAdapter {
  readonly name: string;
  readonly language: 'go' | 'rust' | 'python' | 'java' | 'javascript' | 'typescript';
  getTestCommand(targetFile?: string): string[];
  parseOutput(stdout: string, stderr: string): RunnerResult;
}
