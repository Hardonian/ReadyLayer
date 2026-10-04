import { describe, expect, it } from 'vitest';
import {
  calculateReadinessMetrics,
  type ReadinessRunTelemetry,
} from './readiness-metrics';

function run(
  overrides: Partial<ReadinessRunTelemetry> = {}
): ReadinessRunTelemetry {
  return {
    aiTouchedDetected: false,
    gatesPassed: true,
    status: 'completed',
    testEngineResult: null,
    docSyncResult: null,
    startedAt: new Date('2026-10-01T10:00:00.000Z'),
    completedAt: new Date('2026-10-01T10:10:00.000Z'),
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('calculateReadinessMetrics', () => {
  it('calculates observed metrics and compares the two 15-day windows', () => {
    const metrics = calculateReadinessMetrics(
      [
        run({
          createdAt: new Date('2026-10-05T10:00:00.000Z'),
          testEngineResult: { coverage: { lines: 70 } },
        }),
        run({
          aiTouchedDetected: true,
          gatesPassed: false,
          status: 'failed',
          createdAt: new Date('2026-10-20T10:00:00.000Z'),
          startedAt: new Date('2026-10-20T10:00:00.000Z'),
          completedAt: new Date('2026-10-20T10:30:00.000Z'),
          testEngineResult: { coverage: { lines: 80 } },
          docSyncResult: { driftDetected: true },
        }),
      ],
      { supplyChainViolations: 3, provenancePacks: 1 },
      new Date('2026-10-31T12:00:00.000Z')
    );

    expect(metrics).toMatchObject({
      windowDays: 30,
      totalRuns: 2,
      evaluatedRuns: 2,
      aiTouchedCount: 1,
      aiTouchedPercentage: 0.5,
      gatePassRate: 0.5,
      blockedRuns: 1,
      policyBlockRateDelta: 1,
      averageLineCoverage: 75,
      coverageDelta: 10,
      docDriftIncidents: 1,
      meanRunDurationMinutes: 20,
      supplyChainViolations: 3,
      provenancePacks: 1,
    });
  });

  it('does not count pending runs as policy failures', () => {
    const metrics = calculateReadinessMetrics(
      [run({ status: 'pending', gatesPassed: false, completedAt: null })],
      { supplyChainViolations: 0, provenancePacks: 0 },
      new Date('2026-10-31T12:00:00.000Z')
    );

    expect(metrics.evaluatedRuns).toBe(0);
    expect(metrics.gatePassRate).toBeNull();
    expect(metrics.blockedRuns).toBe(0);
    expect(metrics.meanRunDurationMinutes).toBeNull();
  });

  it('returns honest no-data values and ignores malformed coverage', () => {
    const metrics = calculateReadinessMetrics(
      [run({ testEngineResult: { coverage: { lines: '82' } } })],
      { supplyChainViolations: 0, provenancePacks: 0 },
      new Date('2026-10-31T12:00:00.000Z')
    );

    expect(metrics.averageLineCoverage).toBeNull();
    expect(metrics.coverageDelta).toBeNull();
    expect(metrics.policyBlockRateDelta).toBeNull();
  });
});
