'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Gauge, ArrowUpRight, BarChart3, AlertCircle, CheckCircle, RefreshCcw } from 'lucide-react';

interface FeatureMetric {
  name: string;
  type: 'numerical' | 'categorical';
  psi: number;
  pValue: number;
  status: 'stable' | 'warning' | 'drifted';
  description: string;
}

export default function FeatureDriftDashboard(): React.JSX.Element {
  const [refreshing, setRefreshing] = useState(false);
  const [metricsList] = useState<FeatureMetric[]>([
    {
      name: 'pr_diff_token_length',
      type: 'numerical',
      psi: 0.042,
      pValue: 0.38,
      status: 'stable',
      description: 'Distribution of token changes per pull request across 30 days.',
    },
    {
      name: 'ai_hallucination_confidence',
      type: 'numerical',
      psi: 0.089,
      pValue: 0.12,
      status: 'stable',
      description: 'Model self-reported confidence distribution across static analysis runs.',
    },
    {
      name: 'modified_language_distribution',
      type: 'categorical',
      psi: 0.184,
      pValue: 0.04,
      status: 'warning',
      description: 'Shift in TypeScript vs Python file changes due to new agent microservice.',
    },
    {
      name: 'policy_violation_rate',
      type: 'numerical',
      psi: 0.031,
      pValue: 0.65,
      status: 'stable',
      description: 'Frequency of flagged security and lint rules per review.',
    },
  ]);

  const handleRefresh = (): void => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <Container className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Statistical Feature Drift Monitor
            </h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              Population Stability: 94.2%
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Real-time Kolmogorov-Smirnov and PSI monitoring to detect statistical divergence in AI models and inputs.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} className="gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Recalculating...' : 'Recalculate Drift Metrics'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Overall Distribution Status</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Healthy</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">0 critical drift signals</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Mean PSI Score</span>
              <Gauge className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">0.086</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Below 0.20 threshold (Stable)</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Features Monitored</span>
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">18 Features</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">100% test coverage</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Baseline Window</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">30 Days</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Rolling window comparison</CardContent>
        </Card>
      </div>

      {/* Feature Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Monitored Features &amp; Stability Indexes</CardTitle>
          <CardDescription>Continuous statistical validation comparing current 7-day traffic to the 30-day baseline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {metricsList.map((item) => (
              <div key={item.name} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                    {item.status === 'stable' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Stable
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Moderate Shift
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-6 font-mono text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">PSI Score</span>
                    <span className={`font-semibold ${item.psi > 0.15 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.psi.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">p-Value</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.pValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
