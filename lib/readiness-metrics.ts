export interface ReadinessRunTelemetry {
  aiTouchedDetected: boolean;
  gatesPassed: boolean;
  status: string;
  testEngineResult: unknown;
  docSyncResult: unknown;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ReadinessMetrics {
  windowDays: number;
  totalRuns: number;
  completedRuns: number;
  aiTouchedCount: number;
  aiTouchedPercentage: number;
  gatePassRate: number | null;
  blockedRuns: number;
  riskScoreTrend: number | null;
  averageLineCoverage: number | null;
  coverageDelta: number | null;
  docDriftIncidents: number;
  meanRunDurationMinutes: number | null;
  supplyChainViolations: number;
  provenancePacks: number;
}

interface ReadinessMetricCounts {
  supplyChainViolations: number;
  provenancePacks: number;
}

function average(values: number[]): number | null {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function readLineCoverage(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;

  const coverage = (value as { coverage?: unknown }).coverage;
  if (!coverage || typeof coverage !== 'object') return null;

  const lines = (coverage as { lines?: unknown }).lines;
  return typeof lines === 'number' && Number.isFinite(lines) ? lines : null;
}

function hasDocDrift(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { driftDetected?: unknown }).driftDetected === true
  );
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

/**
 * Builds the 30-day operator snapshot from persisted run telemetry.
 * Pending or cancelled runs do not affect policy pass/fail rates.
 */
export function calculateReadinessMetrics(
  runs: ReadinessRunTelemetry[],
  counts: ReadinessMetricCounts,
  now: Date = new Date()
): ReadinessMetrics {
  const midpoint = new Date(now);
  midpoint.setDate(midpoint.getDate() - 15);

  const evaluatedRuns = runs.filter(
    (run) => run.status === 'completed' || run.status === 'failed'
  );
  const recentEvaluatedRuns = evaluatedRuns.filter((run) => run.createdAt >= midpoint);
  const priorEvaluatedRuns = evaluatedRuns.filter((run) => run.createdAt < midpoint);

  const aiTouchedCount = runs.filter((run) => run.aiTouchedDetected).length;
  const gatePassCount = evaluatedRuns.filter((run) => run.gatesPassed).length;
  const blockedRuns = evaluatedRuns.length - gatePassCount;

  const coverageValues = (items: ReadinessRunTelemetry[]): number[] =>
    items
      .map((run) => readLineCoverage(run.testEngineResult))
      .filter((value): value is number => value !== null);

  const allCoverage = average(coverageValues(runs));
  const recentCoverage = average(coverageValues(recentEvaluatedRuns));
  const priorCoverage = average(coverageValues(priorEvaluatedRuns));

  const failureRate = (items: ReadinessRunTelemetry[]): number | null =>
    items.length > 0
      ? items.filter((run) => !run.gatesPassed).length / items.length
      : null;

  const recentFailureRate = failureRate(recentEvaluatedRuns);
  const priorFailureRate = failureRate(priorEvaluatedRuns);

  const runDurations = evaluatedRuns
    .filter((run) => run.completedAt !== null)
    .map((run) => (run.completedAt!.getTime() - run.startedAt.getTime()) / 60_000)
    .filter((minutes) => minutes >= 0);
  const meanRunDuration = average(runDurations);

  return {
    windowDays: 30,
    totalRuns: runs.length,
    completedRuns: evaluatedRuns.length,
    aiTouchedCount,
    aiTouchedPercentage: runs.length > 0 ? round(aiTouchedCount / runs.length, 3) : 0,
    gatePassRate:
      evaluatedRuns.length > 0 ? round(gatePassCount / evaluatedRuns.length, 3) : null,
    blockedRuns,
    riskScoreTrend:
      recentFailureRate !== null && priorFailureRate !== null
        ? round(recentFailureRate - priorFailureRate, 3)
        : null,
    averageLineCoverage: allCoverage !== null ? round(allCoverage, 2) : null,
    coverageDelta:
      recentCoverage !== null && priorCoverage !== null
        ? round(recentCoverage - priorCoverage, 2)
        : null,
    docDriftIncidents: runs.filter((run) => hasDocDrift(run.docSyncResult)).length,
    meanRunDurationMinutes:
      meanRunDuration !== null ? round(meanRunDuration, 1) : null,
    supplyChainViolations: counts.supplyChainViolations,
    provenancePacks: counts.provenancePacks,
  };
}
