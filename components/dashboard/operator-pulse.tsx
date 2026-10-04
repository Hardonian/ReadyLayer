import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileKey2,
  Gavel,
  Radar,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { deriveOperatorPosture } from '@/lib/operator-posture';
import type { ReadinessMetrics } from '@/lib/readiness-metrics';

interface OperatorPulseProps {
  metrics: ReadinessMetrics | null;
  connected: boolean;
  loading: boolean;
  failed: boolean;
}

const POSTURE_TONES = {
  neutral: 'border-border/40 bg-surface/70 text-text-muted',
  primary: 'border-primary/40 bg-primary/10 text-primary',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
} as const;

export function OperatorPulse({
  metrics,
  connected,
  loading,
  failed,
}: OperatorPulseProps): React.JSX.Element {
  const posture = deriveOperatorPosture(metrics, connected, failed);
  const runCount = metrics?.totalRuns ?? 0;
  const stages = [
    { label: 'Observe', value: runCount, detail: 'runs', icon: Eye },
    { label: 'Decide', value: metrics?.evaluatedRuns ?? 0, detail: 'evaluated', icon: Radar },
    { label: 'Enforce', value: metrics?.blockedRuns ?? 0, detail: 'blocked', icon: Gavel },
    { label: 'Prove', value: metrics?.provenancePacks ?? 0, detail: 'packs', icon: FileKey2 },
  ];

  return (
    <Card className="relative isolate overflow-hidden border-primary/30 bg-surface/70 shadow-surface-raised">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="grid gap-8 p-6 lg:grid-cols-[280px_1fr] lg:p-8">
        <div className="flex items-center justify-center">
          <div className="relative flex h-56 w-56 items-center justify-center" aria-label={`${runCount} runs observed in the current window`}>
            <div className="absolute inset-0 rounded-full border border-primary/15" />
            <div className="absolute inset-3 rounded-full border border-dashed border-primary/40 motion-safe:animate-[spin_18s_linear_infinite]" />
            <div className="absolute inset-7 rounded-full border border-accent/30 motion-safe:animate-[spin_12s_linear_infinite_reverse]" />
            <div className="absolute inset-10 rounded-full bg-gradient-to-br from-primary/25 via-surface to-accent/15 shadow-[0_0_60px_hsl(var(--primary)/0.22)]" />
            <div className="relative text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                {loading ? (
                  <Radar className="h-4 w-4 animate-pulse" aria-hidden="true" />
                ) : failed ? (
                  <CircleAlert className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="text-4xl font-bold tracking-tight text-text-primary">{connected ? runCount : '—'}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-text-subtle">runs observed</div>
              <div className="mt-2 text-[10px] text-text-subtle">rolling 30 days</div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`font-mono text-[10px] ${POSTURE_TONES[posture.tone]}`}>
              DERIVED POSTURE · {posture.label}
            </Badge>
            <span className="text-[10px] font-mono text-text-subtle">EXPLAINABLE · NO SYNTHETIC SCORE</span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{posture.headline}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">{posture.summary}</p>
          <div className="mt-5">
            <Button asChild size="sm" className="gap-2 font-mono text-xs">
              <Link href={posture.href}>
                {posture.action}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border/20 bg-surface-dark/30 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="relative rounded-lg border border-border/20 bg-surface/50 p-3">
                {index < stages.length - 1 ? (
                  <div className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-gradient-to-r from-primary to-accent sm:block" />
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-text-subtle">
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {stage.label}
                  </div>
                  {connected && !failed && !loading ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : null}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{connected ? stage.value : '—'}</div>
                <div className="text-[10px] text-text-subtle">{stage.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
