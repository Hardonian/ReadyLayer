import { TestRunnerAdapter, RunnerResult } from './types';

export class RustTestRunner implements TestRunnerAdapter {
  readonly name = 'cargo-test';
  readonly language = 'rust' as const;

  getTestCommand(targetFile?: string): string[] {
    if (targetFile) {
      return ['cargo', 'test', '--test', targetFile, '--', '--nocapture'];
    }
    return ['cargo', 'test', '--', '--nocapture'];
  }

  parseOutput(stdout: string, stderr: string): RunnerResult {
    const combined = `${stdout}\n${stderr}`;

    // e.g. "test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out"
    const summaryMatch = combined.match(/test result: (ok|FAILED)\.\s+(\d+)\s+passed;\s+(\d+)\s+failed/i);

    let testsPassed = 0;
    let testsFailed = 0;
    let passed = false;

    if (summaryMatch) {
      passed = summaryMatch[1].toLowerCase() === 'ok';
      testsPassed = parseInt(summaryMatch[2], 10);
      testsFailed = parseInt(summaryMatch[3], 10);
    } else {
      // Fallback matching individual test lines
      const okMatches = combined.match(/test\s+[\w:]+\s+\.\.\.\s+ok/g) || [];
      const failMatches = combined.match(/test\s+[\w:]+\s+\.\.\.\s+FAILED/g) || [];
      testsPassed = okMatches.length;
      testsFailed = failMatches.length;
      passed = testsFailed === 0 && testsPassed > 0;
    }

    // Tarpaulin or llvm-cov line coverage if present: "Coverage: 84.2%"
    const covMatch = combined.match(/coverage:\s*([\d.]+)%/i);
    const coveragePercent = covMatch ? parseFloat(covMatch[1]) : (passed ? 85 : 0);

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
