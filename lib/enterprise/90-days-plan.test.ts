import { describe, expect, it } from 'vitest';
import {
  ENTERPRISE_90_DAYS_PHASES,
  calculateOverallAdoption,
  calculatePhaseProgress,
  generateExecutiveBriefingMarkdown,
} from './90-days-plan';

describe('enterprise 90-day plan', () => {
  it('calculates phase and overall progress from known milestone ids only', () => {
    const firstPhase = ENTERPRISE_90_DAYS_PHASES[0];
    const completedIds = [firstPhase.milestones[0].id, firstPhase.milestones[1].id, 'unknown'];

    expect(calculatePhaseProgress(firstPhase, completedIds)).toBe(50);
    expect(calculateOverallAdoption(completedIds)).toMatchObject({
      percentage: 17,
      completedMilestones: 2,
      totalMilestones: 12,
      currentPhase: firstPhase,
    });
  });

  it('exports an honest checklist-only briefing when telemetry is disconnected', () => {
    const briefing = generateExecutiveBriefingMarkdown({
      organizationName: 'Acme|Labs\nInternal',
      completedMilestoneIds: [],
    });

    expect(briefing).toContain('Acme Labs Internal');
    expect(briefing).toContain('Observed Telemetry:** Not connected');
    expect(briefing).toContain('not a compliance certification');
    expect(briefing).not.toContain('Attestation Hash');
    expect(briefing).not.toContain('undefined');
  });

  it('renders persisted telemetry without inventing a gate pass rate', () => {
    const briefing = generateExecutiveBriefingMarkdown({
      organizationName: 'ReadyLayer Test',
      completedMilestoneIds: [],
      metrics: {
        aiTouchedPercentage: 0.25,
        gatePassRate: null,
        totalRuns: 4,
        supplyChainViolations: 2,
        provenancePacks: 3,
      },
    });

    expect(briefing).toContain('AI-Touched Run Proportion:** 25.0%');
    expect(briefing).toContain('Policy Gate Pass Rate:** Not available');
    expect(briefing).toContain('Supply-Chain Findings:** 2 recorded violations');
    expect(briefing).toContain('Provenance Packs:** 3 persisted packs');
  });
});
