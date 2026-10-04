/**
 * Operator-facing readiness dashboard built entirely from persisted telemetry.
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileKey2,
  GitBranch,
  Lock,
  Minus,
  Radar,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { OperatorPulse } from '@/components/dashboard/operator-pulse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MetricsCard } from '@/components/ui/metrics-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReadinessMetrics } from '@/lib/readiness-metrics';

const First90DaysPlaybook = dynamic(
  () =>
    import('@/components/enterprise/First90DaysPlaybook').then(
      (module) => module.First90DaysPlaybook
    ),
  {
    loading: () => (
      <Card className="flex min-h-48 items-center justify-center border-border/30 bg-surface/40">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Loading operator playbook…
        </div>
      </Card>
    ),
  }
);

export interface ReadinessCommandCenterProps {
  organizationId?: string;
  repositoryId?: string;
  organizationName?: string;
}

interface MetricsApiResponse {
  data?: {
    metrics?: ReadinessMetrics;
  };
  error?: {
    message?: string;
  };
}

interface OperatorAction {
  title: string;
  detail: string;
  href: string;
  label: string;
  tone: 'primary' | 'warning' | 'success';
}

const RISK_TIERS = [
  {
    tier: 'Tier 0',
    title: 'Critical perimeter',
    paths: '.github/workflows, IAM, Terraform, Kubernetes',
    control: 'Dual-custody approval',
    tone: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
  },
  {
    tier: 'Tier 1',
    title: 'Core domain logic',
    paths: 'Authentication, billing, migrations, services',
    control: 'Human review + test gate',
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  },
  {
    tier: 'Tier 2',
    title: 'Standard feature surface',
    paths: 'Application routes, components, shared libraries',
    control: 'Deterministic policy pass',
    tone: 'border-primary/30 bg-primary/5 text-primary',
  },
  {
    tier: 'Tier 3',
    title: 'Low-risk change surface',
    paths: 'Documentation, tests, examples, content',
    control: 'Fast-path review',
    tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  },
] as const;

const CONTROL_RECIPES = [
  ['Dependency integrity', 'Inspect new packages for suspicious or hallucinated names before install.'],
  ['Agent loop circuit breaker', 'Bound recursive edit attempts and require a human handoff at the limit.'],
  ['Time-bound waiver', 'Record an owner, reason, and expiration for every policy exception.'],
  ['Documentation invariant', 'Detect contract changes that do not include the required documentation.'],
] as const;

const FRAMEWORK_MAPPINGS = [
  ['OWASP LLM Top 10', 'Evidence inputs for prompt, output, and supply-chain controls'],
  ['NIST AI RMF', 'Govern, Map, Measure, and Manage evidence'],
  ['EU AI Act', 'Human-oversight and transparency evidence inputs'],
  ['SOC 2 / ISO 42001', 'Change-control and AI-management evidence inputs'],
] as const;

function formatPercentage(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, suffix = ''): string {
  return value === null ? '—' : `${value.toLocaleString()}${suffix}`;
}

function buildOperatorActions(
  metrics: ReadinessMetrics | null,
  connected: boolean,
  failed: boolean
): OperatorAction[] {
  if (!connected) {
    return [
      {
        title: 'Connect the first repository',
        detail: 'Start a truthful 30-day baseline with run, policy, and provenance telemetry.',
        href: '/dashboard/repos/connect',
        label: 'Connect repository',
        tone: 'primary',
      },
    ];
  }

  if (failed) {
    return [
      {
        title: 'Restore the telemetry feed',
        detail: 'The control plane is reachable, but this snapshot could not be loaded.',
        href: '/dashboard/runs',
        label: 'Inspect runs',
        tone: 'warning',
      },
    ];
  }

  if (!metrics || metrics.totalRuns === 0) {
    return [
      {
        title: 'Generate the first governed run',
        detail: 'Exercise the runner once to replace setup mode with observed evidence.',
        href: '/dashboard/runs',
        label: 'Open runs',
        tone: 'primary',
      },
    ];
  }

  const actions: OperatorAction[] = [];

  if (metrics.supplyChainViolations > 0) {
    actions.push({
      title: `Triage ${metrics.supplyChainViolations} supply-chain finding${metrics.supplyChainViolations === 1 ? '' : 's'}`,
      detail: 'Resolve dependency findings before expanding autonomous agent permissions.',
      href: '/dashboard/findings',
      label: 'Review findings',
      tone: 'warning',
    });
  }

  if (metrics.gatePassRate !== null && metrics.gatePassRate < 0.9) {
    actions.push({
      title: 'Tune the policy baseline',
      detail: `${formatPercentage(metrics.gatePassRate)} of evaluated runs passed in this window. Review the most common blocks.`,
      href: '/dashboard/runs',
      label: 'Inspect blocked runs',
      tone: 'warning',
    });
  }

  if (metrics.completedRuns > 0 && metrics.provenancePacks === 0) {
    actions.push({
      title: 'Start the provenance trail',
      detail: 'Evaluated runs exist, but no provenance packs were persisted in this window.',
      href: '/dashboard/provenance',
      label: 'Open provenance',
      tone: 'primary',
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Expand the governed rollout',
      detail: 'The current window has no obvious telemetry gaps. Move the next repository through the playbook.',
      href: '/dashboard/repos/connect',
      label: 'Add repository',
      tone: 'success',
    });
  }

  return actions.slice(0, 3);
}

export function ReadinessCommandCenter({
  organizationId,
  repositoryId,
  organizationName = 'Your workspace',
}: ReadinessCommandCenterProps): React.JSX.Element {
  const [metrics, setMetrics] = useState<ReadinessMetrics | null>(null);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const retry = (): void => {
    setRefreshKey((value) => value + 1);
  };

  useEffect(() => {
    if (!organizationId) {
      setMetrics(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestedOrganizationId = organizationId;

    async function fetchMetrics(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ organizationId: requestedOrganizationId });
        if (repositoryId) params.set('repositoryId', repositoryId);

        const response = await fetch(`/api/v1/metrics?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as MetricsApiResponse;

        if (!response.ok) {
          throw new Error(payload.error?.message || 'Readiness telemetry is temporarily unavailable.');
        }

        if (!payload.data?.metrics) {
          throw new Error('The readiness snapshot returned no metrics.');
        }

        setMetrics(payload.data.metrics);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setMetrics(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Readiness telemetry is temporarily unavailable.'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchMetrics();
    return () => controller.abort();
  }, [organizationId, repositoryId, refreshKey]);

  const operatorActions = buildOperatorActions(
    metrics,
    Boolean(organizationId),
    Boolean(error)
  );

  const status = !organizationId
    ? { label: 'SETUP MODE', tone: 'text-primary border-primary/30' }
    : loading
      ? { label: 'SYNCING TELEMETRY', tone: 'text-primary border-primary/30' }
      : error
        ? { label: 'TELEMETRY DEGRADED', tone: 'text-amber-400 border-amber-500/30' }
        : metrics?.totalRuns === 0
          ? { label: 'AWAITING FIRST RUN', tone: 'text-text-muted border-border/40' }
          : { label: '30-DAY SNAPSHOT LIVE', tone: 'text-emerald-400 border-emerald-500/30' };

  const riskTrend = metrics?.riskScoreTrend ?? null;
  const riskLabel = riskTrend === null
    ? 'Needs both 15-day windows'
    : riskTrend < 0
      ? 'Block rate improving'
      : riskTrend > 0
        ? 'Block rate increasing'
        : 'Block rate stable';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border/30 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono">OPERATOR CONTROL PLANE</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Readiness &amp; trust command center</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">
            A decision-ready view of policy outcomes, evidence coverage, and the next best governance action for {organizationName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={`font-mono text-xs ${status.tone}`}>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current" />
            {status.label}
          </Badge>
          <Button asChild variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
            <Link href="/enterprise">
              Capability map
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="flex items-center gap-3 border-primary/20 bg-primary/5 p-4" role="status">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm text-text-muted">Building the latest operator snapshot…</span>
        </Card>
      )}

      {error && !loading && (
        <Card className="flex flex-col gap-4 border-amber-500/30 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Telemetry could not be refreshed</p>
              <p className="mt-1 text-xs text-text-muted">{error} No sample data has been substituted.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={retry} className="gap-2 self-start">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </Card>
      )}

      <OperatorPulse
        metrics={metrics}
        connected={Boolean(organizationId)}
        loading={loading}
        failed={Boolean(error)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max rounded-xl border border-border/30 bg-surface/60 p-1">
            <TabsTrigger value="overview" className="font-mono text-xs">Operator brief</TabsTrigger>
            <TabsTrigger value="playbook" className="font-mono text-xs">First 90 days</TabsTrigger>
            <TabsTrigger value="gates" className="font-mono text-xs">Blast radius</TabsTrigger>
            <TabsTrigger value="compliance" className="font-mono text-xs">Evidence map</TabsTrigger>
            <TabsTrigger value="trends" className="font-mono text-xs">Risk telemetry</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              title="AI-touched runs"
              value={metrics ? formatPercentage(metrics.aiTouchedPercentage) : '—'}
              description={metrics ? `${metrics.aiTouchedCount} of ${metrics.totalRuns} observed runs` : 'Available after the first observed run'}
              icon={GitBranch}
            />
            <MetricsCard
              title="Policy pass rate"
              value={metrics ? formatPercentage(metrics.gatePassRate) : '—'}
              description={metrics ? `${metrics.completedRuns} evaluated runs in the window` : 'Pending evaluated run data'}
              icon={Shield}
            />
            <MetricsCard
              title="Supply-chain findings"
              value={metrics ? metrics.supplyChainViolations : '—'}
              description="Dependency-related violations recorded in 30 days"
              icon={CircleAlert}
            />
            <MetricsCard
              title="Provenance packs"
              value={metrics ? metrics.provenancePacks : '—'}
              description="Persisted evidence packs in the 30-day window"
              icon={FileKey2}
            />
          </div>

          <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-surface/60 to-surface/40">
            <div className="border-b border-border/20 p-5 sm:flex sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-primary">
                  <Radar className="h-4 w-4" aria-hidden="true" />
                  PRIORITIZED FROM LIVE SIGNALS
                </div>
                <h2 className="mt-2 text-xl font-bold text-text-primary">Operator queue</h2>
                <p className="mt-1 text-sm text-text-muted">ReadyLayer turns the snapshot into a short, explainable action list.</p>
              </div>
              <Badge variant="outline" className="mt-3 font-mono text-xs sm:mt-0">
                {operatorActions.length} NEXT {operatorActions.length === 1 ? 'MOVE' : 'MOVES'}
              </Badge>
            </div>
            <div className="grid gap-px bg-border/20 md:grid-cols-3">
              {operatorActions.map((action, index) => (
                <div key={action.title} className="flex min-h-48 flex-col bg-surface/80 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text-subtle">0{index + 1}</span>
                    {action.tone === 'warning' ? (
                      <CircleAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : action.tone === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="mt-6 text-base font-semibold text-text-primary">{action.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-text-muted">{action.detail}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-4 w-fit gap-1.5 px-0 text-primary hover:bg-transparent">
                    <Link href={action.href}>
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-border/30 bg-surface/40 p-5">
              <span className="text-xs font-mono uppercase text-text-subtle">Mean pipeline run</span>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {metrics ? formatNumber(metrics.meanRunDurationMinutes, ' min') : '—'}
              </div>
              <p className="mt-2 text-xs text-text-muted">Started-to-completed ReadyLayer processing time.</p>
            </Card>
            <Card className="border-border/30 bg-surface/40 p-5">
              <span className="text-xs font-mono uppercase text-text-subtle">Average line coverage</span>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {metrics ? formatNumber(metrics.averageLineCoverage, '%') : '—'}
              </div>
              <p className="mt-2 text-xs text-text-muted">Reported only by runs that supplied line coverage.</p>
            </Card>
            <Card className="border-border/30 bg-surface/40 p-5">
              <span className="text-xs font-mono uppercase text-text-subtle">Documentation drift</span>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {metrics ? metrics.docDriftIncidents : '—'}
              </div>
              <p className="mt-2 text-xs text-text-muted">Runs that explicitly reported drift in this window.</p>
            </Card>
          </div>

          <Card className="border-primary/30 bg-primary/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">OPERATOR PLAYBOOK</Badge>
                <h3 className="mt-2 text-lg font-bold text-text-primary">Turn the control plane into a 90-day operating habit</h3>
                <p className="mt-1 max-w-2xl text-xs text-text-muted">A local, operator-confirmed checklist moves from baseline discovery to bounded automation and evidence operations.</p>
              </div>
              <Button onClick={() => setActiveTab('playbook')} className="whitespace-nowrap font-mono text-xs">
                Open playbook
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="playbook" className="space-y-6">
          <First90DaysPlaybook
            organizationId={organizationId || 'local-setup'}
            organizationName={organizationName}
            metrics={metrics ? {
              aiTouchedPercentage: metrics.aiTouchedPercentage,
              gatePassRate: metrics.gatePassRate,
              totalRuns: metrics.totalRuns,
              supplyChainViolations: metrics.supplyChainViolations,
              provenancePacks: metrics.provenancePacks,
            } : undefined}
          />
        </TabsContent>

        <TabsContent value="gates" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/30 bg-surface/40 p-6">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <h2 className="text-lg font-bold text-text-primary">Blast-radius policy blueprint</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">A starting model for matching agent autonomy to the consequence of a change. Confirm these paths in your own policy configuration.</p>
              <div className="mt-5 space-y-3">
                {RISK_TIERS.map((item) => (
                  <div key={item.tier} className={`rounded-lg border p-3 ${item.tone}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{item.tier}: {item.title}</span>
                      <span className="rounded border border-current/30 px-2 py-0.5 font-mono text-[10px]">{item.control}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-subtle">{item.paths}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-border/30 bg-surface/40 p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <h2 className="text-lg font-bold text-text-primary">Automation recipes</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">Composable controls available to policy authors. “Available” does not imply they are enabled for this workspace.</p>
              <div className="mt-5 space-y-3">
                {CONTROL_RECIPES.map(([title, detail]) => (
                  <div key={title} className="flex items-start justify-between gap-4 rounded-lg border border-border/20 bg-surface/50 p-3">
                    <div>
                      <div className="text-xs font-medium text-text-primary">{title}</div>
                      <div className="mt-1 text-[11px] text-text-subtle">{detail}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px] text-primary">AVAILABLE</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card className="border-border/30 bg-surface/40 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Evidence pipeline</h2>
                <p className="mt-1 text-xs text-text-muted">Persist hashes, policy outcomes, and safe summaries so reviewers can inspect what actually happened.</p>
              </div>
              <Badge variant="outline" className="w-fit font-mono text-xs text-primary">{metrics?.provenancePacks ?? 0} PACKS / 30 DAYS</Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ['01', 'Capture', 'Record source, agent context, prompt hashes, and the subject revision.'],
                ['02', 'Evaluate', 'Bind deterministic policy outcomes and redacted evidence to the run.'],
                ['03', 'Verify', 'Export the persisted pack for independent review and downstream attestation.'],
              ].map(([number, title, detail]) => (
                <div key={number} className="rounded-xl border border-border/30 bg-surface/50 p-4">
                  <div className="font-mono text-xs font-bold text-primary">{number}</div>
                  <h3 className="mt-2 text-sm font-semibold text-text-primary">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-border/20 pt-5">
              <h3 className="text-sm font-semibold text-text-primary">Framework evidence mappings</h3>
              <p className="mt-1 text-xs text-text-muted">Mappings accelerate evidence collection; they are not certifications or legal conclusions.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FRAMEWORK_MAPPINGS.map(([name, detail]) => (
                  <div key={name} className="rounded-lg border border-border/20 bg-surface/50 p-3">
                    <div className="text-xs font-semibold text-text-primary">{name}</div>
                    <div className="mt-1 text-[11px] text-text-subtle">{detail}</div>
                    <Badge variant="outline" className="mt-3 font-mono text-[10px] text-primary">MAPPING AVAILABLE</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/30 bg-surface/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-text-subtle">POLICY BLOCK-RATE CHANGE</div>
                  <div className="mt-3 flex items-center gap-2 text-2xl font-bold text-text-primary">
                    {riskTrend === null ? <Minus className="h-5 w-5" /> : riskTrend <= 0 ? <TrendingDown className="h-5 w-5 text-emerald-400" /> : <TrendingUp className="h-5 w-5 text-amber-400" />}
                    {riskTrend === null ? '—' : `${riskTrend > 0 ? '+' : ''}${(riskTrend * 100).toFixed(1)} pts`}
                  </div>
                </div>
                <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">{riskLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">Compares evaluated-run failure rates in the latest 15 days with the prior 15 days. It is not a synthetic risk score.</p>
            </Card>

            <Card className="border-border/30 bg-surface/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-text-subtle">LINE-COVERAGE CHANGE</div>
                  <div className="mt-3 text-2xl font-bold text-text-primary">{metrics ? formatNumber(metrics.coverageDelta, ' pts') : '—'}</div>
                </div>
                <GitBranch className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">Recent window versus prior window</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">Only runs that report <code className="font-mono text-primary">coverage.lines</code> participate in this comparison.</p>
            </Card>
          </div>

          <Card className="border-border/30 bg-surface/40 p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="text-xs font-mono text-text-subtle">RUNS OBSERVED</div>
                <div className="mt-2 text-2xl font-bold text-text-primary">{metrics?.totalRuns ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-text-subtle">RUNS BLOCKED</div>
                <div className="mt-2 text-2xl font-bold text-text-primary">{metrics?.blockedRuns ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-text-subtle">WINDOW</div>
                <div className="mt-2 text-2xl font-bold text-text-primary">{metrics ? `${metrics.windowDays} days` : '—'}</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
