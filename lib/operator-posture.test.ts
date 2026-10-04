import { describe, expect, it } from 'vitest';
import { deriveOperatorPosture } from './operator-posture';
import type { ReadinessMetrics } from './readiness-metrics';

const baseMetrics: ReadinessMetrics = {
  windowDays: 30,
  totalRuns: 10,
  evaluatedRuns: 10,
  aiTouchedCount: 4,
  aiTouchedPercentage: 0.4,
  gatePassRate: 0.9,
  blockedRuns: 1,
  policyBlockRateDelta: -0.1,
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

  it('prioritizes policy calibration when pass rates are low', () => {
    const posture = deriveOperatorPosture(
      { ...baseMetrics, gatePassRate: 0.62 },
      true,
      false
    );

    expect(posture.label).toBe('CALIBRATE');
    expect(posture.href).toBe('/dashboard/runs');
  });

  it('detects a rising policy block rate only after higher-priority checks pass', () => {
    const posture = deriveOperatorPosture(
      { ...baseMetrics, policyBlockRateDelta: 0.2 },
      true,
      false
    );

    expect(posture.label).toBe('WATCH');
    expect(posture.headline).toContain('Block rate');
  });

  it('requests provenance when evaluated runs have no persisted evidence packs', () => {
    const posture = deriveOperatorPosture(
      { ...baseMetrics, provenancePacks: 0 },
      true,
      false
    );

    expect(posture.label).toBe('EVIDENCE SETUP');
    expect(posture.href).toBe('/dashboard/provenance');
  });

  it('keeps setup and first-run states explicit', () => {
    expect(deriveOperatorPosture(null, false, false).label).toBe('SETUP');
    expect(
      deriveOperatorPosture({ ...baseMetrics, totalRuns: 0, evaluatedRuns: 0 }, true, false)
        .label
    ).toBe('BASELINE');
  });
});
