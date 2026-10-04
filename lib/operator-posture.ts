import type { ReadinessMetrics } from './readiness-metrics';

export type OperatorPostureTone = 'neutral' | 'primary' | 'warning' | 'success';

export interface OperatorPosture {
  label: string;
  headline: string;
  summary: string;
  action: string;
  href: string;
  tone: OperatorPostureTone;
}

/**
 * Produces an explainable operating posture from persisted telemetry.
 * This is prioritization logic, not a compliance or security score.
 */
export function deriveOperatorPosture(
  metrics: ReadinessMetrics | null,
  connected: boolean,
  failed: boolean
): OperatorPosture {
  if (!connected) {
    return {
      label: 'SETUP',
      headline: 'Launch pad ready',
      summary: 'Connect a repository to begin an observed governance baseline.',
      action: 'Connect repository',
      href: '/dashboard/repos/connect',
      tone: 'primary',
    };
  }

  if (failed) {
    return {
      label: 'VISIBILITY GAP',
      headline: 'Restore the signal',
      summary: 'Telemetry is unavailable, so ReadyLayer will not infer an operating state.',
      action: 'Inspect runs',
      href: '/dashboard/runs',
      tone: 'warning',
    };
  }

  if (!metrics || metrics.totalRuns === 0) {
    return {
      label: 'BASELINE',
      headline: 'Awaiting first run',
      summary: 'The control plane is connected and ready to observe its first governed change.',
      action: 'Open runs',
      href: '/dashboard/runs',
      tone: 'neutral',
    };
  }

  if (metrics.supplyChainViolations > 0) {
    return {
      label: 'ACTION RECOMMENDED',
      headline: 'Supply-chain review',
      summary: `${metrics.supplyChainViolations} dependency-related finding${metrics.supplyChainViolations === 1 ? '' : 's'} should be triaged before autonomy expands.`,
      action: 'Review findings',
      href: '/dashboard/findings',
      tone: 'warning',
    };
  }

  if (metrics.gatePassRate !== null && metrics.gatePassRate < 0.8) {
    return {
      label: 'CALIBRATE',
      headline: 'Policy tuning window',
      summary: `${(metrics.gatePassRate * 100).toFixed(1)}% of evaluated runs passed. Inspect recurring blocks before tightening gates.`,
      action: 'Inspect blocked runs',
      href: '/dashboard/runs',
      tone: 'warning',
    };
  }

  if (metrics.policyBlockRateDelta !== null && metrics.policyBlockRateDelta > 0.1) {
    return {
      label: 'WATCH',
      headline: 'Block rate is rising',
      summary: 'The latest 15-day policy failure rate is higher than the prior window.',
      action: 'Review run history',
      href: '/dashboard/runs',
      tone: 'warning',
    };
  }

  if (metrics.evaluatedRuns > 0 && metrics.provenancePacks === 0) {
    return {
      label: 'EVIDENCE SETUP',
      headline: 'Start the proof trail',
      summary: 'Evaluated runs exist, but no provenance packs were persisted in this window.',
      action: 'Open provenance',
      href: '/dashboard/provenance',
      tone: 'primary',
    };
  }

  return {
    label: 'CONTROLLED ROLLOUT',
    headline: 'Signals look steady',
    summary: 'No priority condition was detected in the current 30-day snapshot.',
    action: 'Expand rollout',
    href: '/dashboard/repos/connect',
    tone: 'success',
  };
}
