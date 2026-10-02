import { TestRunnerAdapter, RunnerResult } from './types';

export class GoTestRunner implements TestRunnerAdapter {
  readonly name = 'go-test';
  readonly language = 'go' as const;

  getTestCommand(targetFile?: string): string[] {
    if (targetFile) {
      return ['go', 'test', '-v', '-cover', targetFile];
    }
    return ['go', 'test', '-v', '-cover', './...'];
  }

  parseOutput(stdout: string, stderr: string): RunnerResult {
    const combined = `${stdout}\n${stderr}`;
    const passMatches = combined.match(/--- PASS:/g) || [];
    const failMatches = combined.match(/--- FAIL:/g) || [];

    const testsPassed = passMatches.length;
    const testsFailed = failMatches.length;
    const totalTests = testsPassed + testsFailed;

    // e.g. "coverage: 88.4% of statements"
    const covMatch = combined.match(/coverage:\s*([\d.]+)%\s*of\s*statements/i);
    const coveragePercent = covMatch ? parseFloat(covMatch[1]) : 0;

    const isSuccess = combined.includes('PASS') && !combined.includes('FAIL') && testsFailed === 0;

    return {
      passed: isSuccess,
      testsPassed,
      testsFailed,
      totalTests,
      coverage: {
        lines: coveragePercent,
      },
      rawOutput: combined,
    };
  }
}
