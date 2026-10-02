/**
 * Flaky Test Detection & Quarantine Engine
 *
 * Runs suspicious or newly generated tests across multiple iterations to evaluate
 * deterministic execution. Tests with non-deterministic pass/fail outcomes are flagged
 * as flaky and can be quarantined to prevent blocking PRs while alerting engineers.
 */

import { logger } from '../../observability/logging';

export interface TestExecutionFnResult {
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface FlakyDetectionOptions {
  iterations?: number; // default: 5
  concurrency?: number;
  quarantineThresholdPercentage?: number; // default: 10%
}

export interface FlakyDetectionResult {
  testIdentifier: string;
  isFlaky: boolean;
  flakinessScore: number; // 0 - 100
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  durationsMs: number[];
  quarantined: boolean;
  recommendation: 'quarantine' | 'pass' | 'stable_failure';
}

export interface QuarantineManifest {
  version: string;
  updatedAt: string;
  quarantinedTests: Array<{
    testIdentifier: string;
    filePath?: string;
    flakinessScore: number;
    quarantinedAt: string;
    reason: string;
  }>;
}

export class FlakyTestDetector {
  /**
   * Run a test execution function across multiple iterations to detect flakiness.
   */
  async evaluateTestStability(
    testIdentifier: string,
    runFn: () => Promise<TestExecutionFnResult>,
    options: FlakyDetectionOptions = {}
  ): Promise<FlakyDetectionResult> {
    const iterations = Math.max(2, options.iterations || 5);
    const quarantineThreshold = options.quarantineThresholdPercentage ?? 10;

    let passedRuns = 0;
    let failedRuns = 0;
    const durationsMs: number[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const result = await runFn();
        durationsMs.push(result.durationMs);
        if (result.passed) {
          passedRuns++;
        } else {
          failedRuns++;
        }
      } catch (err) {
        failedRuns++;
        durationsMs.push(0);
        logger.debug({ err, iteration: i }, 'Error during stability iteration run');
      }
    }

    // A test is flaky if it both passed at least once and failed at least once
    const isFlaky = passedRuns > 0 && failedRuns > 0;
    const flakinessScore = isFlaky ? Math.round((failedRuns / iterations) * 100) : 0;
    const shouldQuarantine = isFlaky && flakinessScore >= quarantineThreshold;

    let recommendation: 'quarantine' | 'pass' | 'stable_failure';
    if (isFlaky) {
      recommendation = 'quarantine';
    } else if (failedRuns === iterations) {
      recommendation = 'stable_failure';
    } else {
      recommendation = 'pass';
    }

    return {
      testIdentifier,
      isFlaky,
      flakinessScore,
      totalRuns: iterations,
      passedRuns,
      failedRuns,
      durationsMs,
      quarantined: shouldQuarantine,
      recommendation,
    };
  }

  /**
   * Generate an updated quarantine manifest given newly detected flaky tests.
   */
  buildQuarantineManifest(
    results: FlakyDetectionResult[],
    existingManifest?: QuarantineManifest
  ): QuarantineManifest {
    const quarantinedMap = new Map<string, QuarantineManifest['quarantinedTests'][0]>();

    if (existingManifest?.quarantinedTests) {
      for (const entry of existingManifest.quarantinedTests) {
        quarantinedMap.set(entry.testIdentifier, entry);
      }
    }

    const now = new Date().toISOString();
    for (const r of results) {
      if (r.quarantined) {
        quarantinedMap.set(r.testIdentifier, {
          testIdentifier: r.testIdentifier,
          flakinessScore: r.flakinessScore,
          quarantinedAt: now,
          reason: `Detected non-deterministic execution: ${r.failedRuns}/${r.totalRuns} failures (${r.flakinessScore}% flakiness score)`,
        });
      }
    }

    return {
      version: '1.0.0',
      updatedAt: now,
      quarantinedTests: Array.from(quarantinedMap.values()),
    };
  }
}

export const flakyTestDetector = new FlakyTestDetector();
