'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ENTERPRISE_90_DAYS_PHASES,
  EnterprisePhase,
  calculatePhaseProgress,
  calculateOverallAdoption,
  generateExecutiveBriefingMarkdown,
} from '@/lib/enterprise/90-days-plan';
import {
  CheckCircle2,
  Circle,
  Shield,
  Lock,
  FileCheck2,
  Download,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Sparkles,
  X,
} from 'lucide-react';

export interface First90DaysPlaybookProps {
  organizationId: string;
  organizationName?: string;
  metrics?: {
    aiTouchedPercentage: number;
    gatePassRate: number | null;
    totalRuns: number;
    supplyChainViolations: number;
    provenancePacks: number;
  };
}

const MILESTONE_IDS = new Set(
  ENTERPRISE_90_DAYS_PHASES.flatMap((phase) =>
    phase.milestones.map((milestone) => milestone.id)
  )
);

export function First90DaysPlaybook({
  organizationId,
  organizationName = 'Enterprise Organization',
  metrics,
}: First90DaysPlaybookProps): React.JSX.Element {
  const [selectedPhaseId, setSelectedPhaseId] = useState<EnterprisePhase['id']>('days_1_30');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showExecutiveModal, setShowExecutiveModal] = useState(false);

  const storageKey = `readylayer:90-days:v1:${organizationId}`;

  // Load persisted progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCompletedIds(
            parsed.filter(
              (value): value is string => typeof value === 'string' && MILESTONE_IDS.has(value)
            )
          );
          return;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    setCompletedIds([]);
  }, [storageKey]);

  // Persist progress changes
  const toggleMilestone = (id: string) => {
    setCompletedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  };

  const activePhase =
    ENTERPRISE_90_DAYS_PHASES.find((p) => p.id === selectedPhaseId) ||
    ENTERPRISE_90_DAYS_PHASES[0];

  const overall = calculateOverallAdoption(completedIds);
  const phaseProgress = calculatePhaseProgress(activePhase, completedIds);

  const executiveBriefing = generateExecutiveBriefingMarkdown({
    organizationName,
    completedMilestoneIds: completedIds,
    metrics,
  });

  const handleCopyBriefing = async () => {
    try {
      await navigator.clipboard.writeText(executiveBriefing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadBriefing = () => {
    const blob = new Blob([executiveBriefing], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `readylayer-enterprise-90-days-briefing-${organizationId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header and Overall Maturity Banner */}
      <Card className="border-primary/30 bg-surface/50 backdrop-blur-md relative overflow-hidden shadow-surface-raised">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Shield className="w-64 h-64 text-primary" />
        </div>

        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ENTERPRISE ADOPTION PLAYBOOK</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-mono text-xs"
                onClick={() => setShowExecutiveModal(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Export Executive Briefing
              </Button>
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
              The First 90 Days: Enterprise AI Governance Roadmap
            </CardTitle>
            <CardDescription className="text-sm text-text-muted mt-1 max-w-3xl leading-relaxed">
              An operator-confirmed blueprint for scaling autonomous coding-agent delivery
              while keeping high-impact changes inside explicit human and policy boundaries.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar & High-Level KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border/30 bg-surface-dark/50">
            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-muted">Total 90-Day Implementation Progress</span>
                <span className="text-primary font-bold">{overall.percentage}%</span>
              </div>
              <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary via-accent to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${overall.percentage}%` }}
                />
              </div>
              <div className="text-[11px] text-text-subtle font-mono flex items-center gap-1.5 pt-1">
                <span>
                  {overall.completedMilestones} of {overall.totalMilestones} enterprise milestones completed
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{overall.currentPhase.title}</span>
              </div>
            </div>

            <div className="border-l border-border/20 pl-4 space-y-1">
              <div className="text-[11px] font-mono text-text-subtle uppercase">Target Risk Tiers</div>
              <div className="text-lg font-bold font-display text-text-primary">Tier 0 – 3</div>
              <div className="text-[11px] text-text-subtle font-mono">Configuration target</div>
            </div>

            <div className="border-l border-border/20 pl-4 space-y-1">
              <div className="text-[11px] font-mono text-text-subtle uppercase">Provenance Standard</div>
              <div className="text-lg font-bold font-display text-text-primary">in-toto v1.0</div>
              <div className="text-[11px] text-text-subtle font-mono">Evidence target</div>
            </div>
          </div>

          {/* Phase Navigation Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENTERPRISE_90_DAYS_PHASES.map((phase) => {
              const progress = calculatePhaseProgress(phase, completedIds);
              const isSelected = phase.id === selectedPhaseId;
              const isCompleted = progress === 100;

              return (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhaseId(phase.id)}
                  className={`p-4 rounded-xl text-left border transition-all duration-200 relative ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-glow ring-1 ring-primary/40'
                      : 'border-border/30 bg-surface/40 hover:border-border/70 hover:bg-surface/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border/30 text-text-muted">
                      {phase.timeframe}
                    </span>
                    {isCompleted ? (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                        100% DONE
                      </Badge>
                    ) : (
                      <span className="text-xs font-mono text-text-subtle">{progress}%</span>
                    )}
                  </div>
                  <div className="font-semibold text-sm text-text-primary">{phase.title}</div>
                  <p className="text-xs text-text-muted mt-1 line-clamp-1">{phase.subtitle}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Phase Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Interactive Milestones Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/30 bg-surface/40 backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="font-mono text-xs mb-2">
                    {activePhase.timeframe} ACTION PLAN
                  </Badge>
                  <CardTitle className="text-xl font-display font-bold text-text-primary">
                    {activePhase.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-text-muted mt-1 leading-relaxed">
                    {activePhase.summary}
                  </CardDescription>
                </div>
                <div className="text-right pl-4">
                  <div className="text-2xl font-bold font-display text-primary">{phaseProgress}%</div>
                  <div className="text-[11px] font-mono text-text-subtle">Phase Progress</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="text-xs font-mono text-text-subtle uppercase tracking-wider pb-1">
                Core Phase Milestones (Click to toggle completion)
              </div>

              <div className="space-y-3">
                {activePhase.milestones.map((milestone) => {
                  const isDone = completedIds.includes(milestone.id);

                  return (
                    <button
                      type="button"
                      key={milestone.id}
                      onClick={() => toggleMilestone(milestone.id)}
                      aria-pressed={isDone}
                      className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer select-none ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-border/30 bg-surface/50 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-text-subtle" />
                          )}
                        </div>

                        <div className="space-y-1.5 flex-grow">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4
                              className={`text-sm font-semibold ${
                                isDone ? 'text-text-primary line-through opacity-80' : 'text-text-primary'
                              }`}
                            >
                              {milestone.title}
                            </h4>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${
                                milestone.category === 'security'
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                  : milestone.category === 'governance'
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : milestone.category === 'compliance'
                                  ? 'border-accent/30 bg-accent/10 text-accent'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {milestone.category}
                            </span>
                          </div>

                          <p className="text-xs text-text-muted leading-relaxed">
                            {milestone.description}
                          </p>

                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-text-subtle border-t border-border/20 mt-2">
                            <div>
                              <span className="text-text-muted">Verification:</span>{' '}
                              <span>{milestone.verificationMethod}</span>
                            </div>
                            <div>
                              <span className="text-text-muted">Blast Radius:</span>{' '}
                              <span className="text-primary">{milestone.blastRadiusImpact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Phase Deliverables Checklist */}
              <div className="pt-6 border-t border-border/20 space-y-3">
                <div className="text-xs font-mono text-text-subtle uppercase tracking-wider">
                  Target Governance Deliverables
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {activePhase.deliverables.map((deliverable, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/20 bg-surface/30 flex items-center gap-2.5 text-xs text-text-muted"
                    >
                      <Circle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: KPIs, Governance Gates & Frameworks */}
        <div className="space-y-6">
          {/* Phase Key Success Indicators */}
          <Card className="border-border/30 bg-surface/40 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Phase Success Metrics (KPIs)</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activePhase.kpis.map((kpi, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/20 bg-surface/50 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">{kpi.label}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{kpi.target}</span>
                  </div>
                  <div className="text-[11px] text-text-subtle">{kpi.measurement}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Active Governance Gates in this Phase */}
          <Card className="border-border/30 bg-surface/40 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Lock className="h-4 w-4 text-amber-500" />
                <span>Target Governance Gates</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {activePhase.governanceGates.map((gate, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                  <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{gate}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Compliance Crosswalk Reference */}
          <Card className="border-border/30 bg-surface/40 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                <span>Evidence Mapping Reference</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/20">
                <span className="text-text-muted">OWASP LLM Top 10</span>
                <span className="font-mono text-emerald-400 font-medium">LLM01 / 02 / 06</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/20">
                <span className="text-text-muted">NIST AI RMF</span>
                <span className="font-mono text-primary font-medium">Govern / Map / Measure</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/20">
                <span className="text-text-muted">EU AI Act</span>
                <span className="font-mono text-primary font-medium">Human Oversight</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/20">
                <span className="text-text-muted">SOC 2 Type II</span>
                <span className="font-mono text-primary font-medium">Evidence Inputs</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Executive Briefing Modal */}
      {showExecutiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <Card
            className="max-w-3xl w-full max-h-[85vh] flex flex-col border-primary/40 bg-surface shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="executive-briefing-title"
          >
            <CardHeader className="border-b border-border/30 flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle id="executive-briefing-title" className="text-xl font-display font-bold">
                  Executive 90-Day Governance Briefing
                </CardTitle>
                <CardDescription className="text-xs font-mono text-text-subtle">
                  Formatted for CISO, VP Engineering, and Board Audit Committee review
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-mono"
                  onClick={handleCopyBriefing}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy Markdown'}
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs font-mono"
                  onClick={handleDownloadBriefing}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .md
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExecutiveModal(false)}
                  aria-label="Close executive briefing"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="overflow-y-auto p-6 font-mono text-xs text-text-muted space-y-4 bg-surface-dark/40">
              <pre className="whitespace-pre-wrap font-mono leading-relaxed text-text-primary">
                {executiveBriefing}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
