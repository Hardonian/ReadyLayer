import { describe, it, expect } from 'vitest';
import {
  sandboxManager,
  getRunnerForLanguage,
  GoTestRunner,
  RustTestRunner,
  PythonTestRunner,
  JavaTestRunner,
  flakyTestDetector,
  benchmarkRunner,
} from '../../services/test-engine';

describe('Batch 9: Dynamic Sandbox & Test Execution', () => {
  describe('SandboxManager (Item #30)', () => {
    it('executes a safe command in an isolated temporary process sandbox', async () => {
      const result = await sandboxManager.runInSandbox(
        [process.execPath, '-e', 'console.log("hello sandbox")'],
        [{ path: 'sample.txt', content: 'test data' }],
        { timeoutMs: 5000 }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello sandbox');
      expect(result.timedOut).toBe(false);
      expect(result.sandboxType).toBeDefined();
    });

    it('handles process timeout safely without crashing', async () => {
      const result = await sandboxManager.runInSandbox(
        [process.execPath, '-e', 'setInterval(() => {}, 1000)'],
        [],
        { timeoutMs: 150 }
      );

      expect(result.timedOut).toBe(true);
      expect(result.exitCode).toBe(124);
    });
  });

  describe('Multi-Language Test Runners (Item #31)', () => {
    it('resolves correct runners by language name and alias', () => {
      expect(getRunnerForLanguage('go')).toBeInstanceOf(GoTestRunner);
      expect(getRunnerForLanguage('rust')).toBeInstanceOf(RustTestRunner);
      expect(getRunnerForLanguage('python')).toBeInstanceOf(PythonTestRunner);
      expect(getRunnerForLanguage('java')).toBeInstanceOf(JavaTestRunner);
      expect(getRunnerForLanguage('unknown')).toBeNull();
    });

    it('parses Go test output and coverage percentage', () => {
      const runner = new GoTestRunner();
      const stdout = `
=== RUN   TestAuth
--- PASS: TestAuth (0.01s)
=== RUN   TestValidation
--- PASS: TestValidation (0.02s)
PASS
coverage: 92.5% of statements
ok      readylayer/auth 0.05s
      `;

      const parsed = runner.parseOutput(stdout, '');
      expect(parsed.passed).toBe(true);
      expect(parsed.testsPassed).toBe(2);
      expect(parsed.testsFailed).toBe(0);
      expect(parsed.coverage.lines).toBe(92.5);
    });

    it('parses Rust cargo test output', () => {
      const runner = new RustTestRunner();
      const stdout = 'test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out';
      const parsed = runner.parseOutput(stdout, '');
      expect(parsed.passed).toBe(true);
      expect(parsed.testsPassed).toBe(14);
      expect(parsed.testsFailed).toBe(0);
    });

    it('parses Python pytest output with coverage', () => {
      const runner = new PythonTestRunner();
      const stdout = `
========================= 8 passed, 0 failed in 0.35s =========================
TOTAL                                                120     12    90%
      `;
      const parsed = runner.parseOutput(stdout, '');
      expect(parsed.passed).toBe(true);
      expect(parsed.testsPassed).toBe(8);
      expect(parsed.testsFailed).toBe(0);
      expect(parsed.coverage.lines).toBe(90);
    });

    it('parses Java maven test output', () => {
      const runner = new JavaTestRunner();
      const stdout = `
Tests run: 25, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
      `;
      const parsed = runner.parseOutput(stdout, '');
      expect(parsed.passed).toBe(true);
      expect(parsed.testsPassed).toBe(25);
      expect(parsed.testsFailed).toBe(0);
    });
  });

  describe('Flaky Test Detection & Quarantine Engine (Item #32)', () => {
    it('detects a non-deterministic flaky test and recommends quarantine', async () => {
      let callCount = 0;
      const intermittentRun = async (): Promise<{ passed: boolean; durationMs: number }> => {
        callCount++;
        // Passes on even runs, fails on odd runs
        return {
          passed: callCount % 2 === 0,
          durationMs: 10,
        };
      };

      const result = await flakyTestDetector.evaluateTestStability(
        'auth-race-condition-test',
        intermittentRun,
        { iterations: 4 }
      );

      expect(result.isFlaky).toBe(true);
      expect(result.passedRuns).toBe(2);
      expect(result.failedRuns).toBe(2);
      expect(result.flakinessScore).toBe(50);
      expect(result.quarantined).toBe(true);
      expect(result.recommendation).toBe('quarantine');

      const manifest = flakyTestDetector.buildQuarantineManifest([result]);
      expect(manifest.quarantinedTests.length).toBe(1);
      expect(manifest.quarantinedTests[0].testIdentifier).toBe('auth-race-condition-test');
    });

    it('validates a stable test as passed without quarantine', async () => {
      const stableRun = async (): Promise<{ passed: boolean; durationMs: number }> => {
        return { passed: true, durationMs: 5 };
      };

      const result = await flakyTestDetector.evaluateTestStability('stable-test', stableRun, {
        iterations: 3,
      });

      expect(result.isFlaky).toBe(false);
      expect(result.passedRuns).toBe(3);
      expect(result.failedRuns).toBe(0);
      expect(result.quarantined).toBe(false);
      expect(result.recommendation).toBe('pass');
    });
  });

  describe('Automated Benchmark Regression Runner (Item #33)', () => {
    it('calculates statistical metrics and detects performance regression', async () => {
      const baselineFn = (): void => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
      };

      const slowCandidateFn = (): void => {
        let sum = 0;
        for (let i = 0; i < 50000; i++) sum += i;
      };

      const comp = await benchmarkRunner.compare(
        'sum-loop-benchmark',
        baselineFn,
        slowCandidateFn,
        { warmupIterations: 1, measureIterations: 5, regressionThresholdPercent: 20 }
      );

      expect(comp.baseline.samples).toBe(5);
      expect(comp.candidate.samples).toBe(5);
      expect(comp.candidate.meanMs).toBeGreaterThan(comp.baseline.meanMs);
      expect(comp.isRegression).toBe(true);
      expect(comp.summary).toContain('REGRESSION');
    });
  });
});
