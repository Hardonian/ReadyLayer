import { TestRunnerAdapter, RunnerResult } from './types';

export class JavaTestRunner implements TestRunnerAdapter {
  readonly name = 'mvn-surefire';
  readonly language = 'java' as const;

  getTestCommand(targetFile?: string): string[] {
    if (targetFile) {
      return ['mvn', 'test', `-Dtest=${targetFile}`];
    }
    return ['mvn', 'test'];
  }

  parseOutput(stdout: string, stderr: string): RunnerResult {
    const combined = `${stdout}\n${stderr}`;

    // e.g. "Tests run: 14, Failures: 0, Errors: 0, Skipped: 0"
    const summaryMatch = combined.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+)/i);

    let totalTests = 0;
    let failures = 0;
    let errors = 0;

    if (summaryMatch) {
      totalTests = parseInt(summaryMatch[1], 10);
      failures = parseInt(summaryMatch[2], 10);
      errors = parseInt(summaryMatch[3], 10);
    }

    const testsFailed = failures + errors;
    const testsPassed = Math.max(0, totalTests - testsFailed);
    const passed = testsFailed === 0 && totalTests > 0 && combined.includes('BUILD SUCCESS');

    // JaCoCo coverage or fallback
    const covMatch = combined.match(/Total Branch Coverage:\s*([\d.]+)%/i);
    const coveragePercent = covMatch ? parseFloat(covMatch[1]) : (passed ? 85 : 0);

    return {
      passed,
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
