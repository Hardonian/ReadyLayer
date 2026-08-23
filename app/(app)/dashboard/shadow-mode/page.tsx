'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShieldAlert, CheckCircle2, Play, AlertTriangle, Code2, Sparkles } from 'lucide-react';

interface SimulatedResult {
  wouldHaveBlocked: boolean;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  report: string;
}

export default function ShadowModeDashboard(): React.JSX.Element {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SimulatedResult | null>({
    wouldHaveBlocked: true,
    totalIssues: 3,
    criticalIssues: 1,
    highIssues: 2,
    report: `### Shadow Mode Analysis Report\n- **app/api/auth/route.ts**: Hardcoded secret detected in token validation.\n- **lib/db.ts**: Missing statement timeout in raw SQL query.\n- **components/checkout.tsx**: Unbounded client state re-render.\n\n*Note: In shadow mode, this pull request was allowed to merge for observation.*`,
  });

  const runSimulation = async (): Promise<void> => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/v1/shadow-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: 'demo-repo',
          prNumber: 108,
          prTitle: 'feat: add user telemetry and caching',
          files: [
            {
              path: 'lib/cache.ts',
              content: 'export const cache = new Map();',
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json() as { data?: { summary?: { wouldHaveBlocked: boolean; totalIssues: number; criticalIssues: number; highIssues: number }; report?: string } };
        if (json.data?.summary) {
          setResult({
            wouldHaveBlocked: json.data.summary.wouldHaveBlocked,
            totalIssues: json.data.summary.totalIssues,
            criticalIssues: json.data.summary.criticalIssues,
            highIssues: json.data.summary.highIssues,
            report: json.data.report || 'Simulation completed without errors.',
          });
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Container className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Shadow Mode Observation
            </h1>
            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
              Non-Blocking
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Observe policy and test failures on AI-touched pull requests before turning on active blocking enforcement.
          </p>
        </div>
        <Button onClick={runSimulation} disabled={analyzing} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Play className="w-4 h-4" />
          {analyzing ? 'Simulating...' : 'Run Shadow Simulation'}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Observation State</span>
              <Eye className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">100% of pull requests observed</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Would-Have-Blocked</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">18.4%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">23 PRs avoided false blocks</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>AI-Touched Detection</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">64.2%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Code modified via Copilot / Claude</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Policy Readiness</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">92.0%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Safe for high-confidence rollout</CardContent>
        </Card>
      </div>

      {/* Main Analysis Card */}
      {result && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-500" />
                  Latest Shadow Analysis
                </CardTitle>
                <CardDescription>
                  Preview of rules that fired without impacting developer velocity.
                </CardDescription>
              </div>
              {result.wouldHaveBlocked ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Would Block Under Enforcement
                </Badge>
              ) : (
                <Badge variant="default" className="bg-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Would Pass Cleanly
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-sm whitespace-pre-wrap border border-slate-800 leading-relaxed">
              {result.report}
            </div>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
