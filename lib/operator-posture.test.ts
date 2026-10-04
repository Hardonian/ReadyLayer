import { describe, expect, it } from 'vitest';
import { deriveOperatorPosture } from './operator-posture';
import type { ReadinessMetrics } from './readiness-metrics';

const baseMetrics: ReadinessMetrics = {
  windowDays: 30,
  totalRuns: 10,
  completedRuns: 10,
  aiTouchedCount: 4,
  aiTouchedPercentage: 0.4,
  gatePassRate: 0.9,
  blockedRuns: 1,
  riskScoreTrend: -0.1,
  averageLineCoverage: 82,
  coverageDelta: 2,
  docDriftIncidents: 0,
  meanRunDurationMinutes: 4.2,
  supplyChainViolations: 0,
  provenancePacks: 8,
};

describe('deriveOperatorPosture', () => {
  it('does not infer a posture when telemetry fails', () => {
    expect(deriveOperatorPosture(baseMetrics, true, true).label).toBe('VISIBILITY GAP');
  });

  it('prioritizes supply-chain findings over healthy aggregate rates', () => {
    const posture = deriveOperatorPosture(
      { ...baseMetrics, supplyChainViolations: 2 },
      true,
      false
    );

    expect(posture.label).toBe('ACTION RECOMMENDED');
    expect(posture.href).toBe('/dashboard/findings');
  });

  it('identifies steady telemetry without claiming compliance', () => {
    const posture = deriveOperatorPosture(baseMetrics, true, false);

    expect(posture.label).toBe('CONTROLLED ROLLOUT');
    expect(posture.summary).toContain('No priority condition');
  });
});
