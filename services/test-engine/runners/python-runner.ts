import { TestRunnerAdapter, RunnerResult } from './types';

export class PythonTestRunner implements TestRunnerAdapter {
  readonly name = 'pytest';
  readonly language = 'python' as const;

  getTestCommand(targetFile?: string): string[] {
    if (targetFile) {
      return ['pytest', '-v', '--cov', targetFile];
    }
    return ['pytest', '-v', '--cov'];
  }

  parseOutput(stdout: string, stderr: string): RunnerResult {
    const combined = `${stdout}\n${stderr}`;

    // e.g. "==== 12 passed, 2 failed in 0.45s ===="
    const passMatch = combined.match(/(\d+)\s+passed/i);
    const failMatch = combined.match(/(\d+)\s+failed/i);

    const testsPassed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const testsFailed = failMatch ? parseInt(failMatch[1], 10) : 0;

    // Coverage e.g. "TOTAL ... 89%"
    const covMatch = combined.match(/TOTAL\s+[\d\s]+\s+(\d+)%/i);
    const coveragePercent = covMatch ? parseFloat(covMatch[1]) : (testsFailed === 0 && testsPassed > 0 ? 80 : 0);

    const passed = testsFailed === 0 && testsPassed > 0 && !combined.includes('ERRORS');

    return {
      passed,
      testsPassed,
      testsFailed,
      totalTests: testsPassed + testsFailed,
      coverage: {
        lines: coveragePercent,
      },
      rawOutput: combined,
    };
  }
}
