/**
 * Automated Regression Benchmark Runner
 *
 * Runs benchmark iterations against baseline and candidate implementations, calculates
 * statistical distribution metrics (p50, p95, p99, mean, ops/sec), and flags performance regressions.
 */

export interface BenchmarkStats {
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  opsPerSecond: number;
  samples: number;
}

export interface BenchmarkComparisonResult {
  benchmarkName: string;
  baseline: BenchmarkStats;
  candidate: BenchmarkStats;
  latencyDeltaPercent: number; // Positive = candidate is slower
  isRegression: boolean;
  thresholdPercent: number;
  summary: string;
}

export interface BenchmarkOptions {
  warmupIterations?: number; // default: 2
  measureIterations?: number; // default: 10
  regressionThresholdPercent?: number; // default: 10%
}

export class BenchmarkRunner {
  /**
   * Run benchmark function and compute statistical distribution.
   */
  async runBenchmark(
    benchFn: () => Promise<void> | void,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkStats> {
    const warmup = options.warmupIterations ?? 2;
    const count = Math.max(3, options.measureIterations ?? 10);

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await benchFn();
    }

    const durations: number[] = [];

    // Measurement phase
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      await benchFn();
      const elapsed = performance.now() - start;
      durations.push(elapsed);
    }

    durations.sort((a, b) => a - b);

    const total = durations.reduce((acc, v) => acc + v, 0);
    const meanMs = total / durations.length;
    const medianMs = durations[Math.floor(durations.length * 0.5)];
    const p95Ms = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1];
    const p99Ms = durations[Math.floor(durations.length * 0.99)] ?? durations[durations.length - 1];
    const minMs = durations[0];
    const maxMs = durations[durations.length - 1];
    const opsPerSecond = meanMs > 0 ? 1000 / meanMs : 0;

    return {
      meanMs: parseFloat(meanMs.toFixed(3)),
      medianMs: parseFloat(medianMs.toFixed(3)),
      p95Ms: parseFloat(p95Ms.toFixed(3)),
      p99Ms: parseFloat(p99Ms.toFixed(3)),
      minMs: parseFloat(minMs.toFixed(3)),
      maxMs: parseFloat(maxMs.toFixed(3)),
      opsPerSecond: parseFloat(opsPerSecond.toFixed(1)),
      samples: count,
    };
  }

  /**
   * Compare baseline vs candidate benchmarks and detect regressions.
   */
  async compare(
    benchmarkName: string,
    baselineFn: () => Promise<void> | void,
    candidateFn: () => Promise<void> | void,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkComparisonResult> {
    const thresholdPercent = options.regressionThresholdPercent ?? 10;

    const baseline = await this.runBenchmark(baselineFn, options);
    const candidate = await this.runBenchmark(candidateFn, options);

    const latencyDeltaPercent = baseline.meanMs > 0
      ? parseFloat((((candidate.meanMs - baseline.meanMs) / baseline.meanMs) * 100).toFixed(2))
      : 0;

    const isRegression = latencyDeltaPercent > thresholdPercent;

    const summary = isRegression
      ? `Performance REGRESSION detected in ${benchmarkName}: +${latencyDeltaPercent}% latency increase exceeds threshold (${thresholdPercent}%).`
      : `Performance benchmark ${benchmarkName} PASSED: ${latencyDeltaPercent >= 0 ? '+' : ''}${latencyDeltaPercent}% delta vs baseline.`;

    return {
      benchmarkName,
      baseline,
      candidate,
      latencyDeltaPercent,
      isRegression,
      thresholdPercent,
      summary,
    };
  }
}

export const benchmarkRunner = new BenchmarkRunner();
