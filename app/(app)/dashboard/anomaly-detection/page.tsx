'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, BrainCircuit, Lightbulb, Zap, TrendingDown, RefreshCw } from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  type: string;
  description: string;
  impact: string;
  savings: string;
}

export default function AnomalyDetectionDashboard(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [suggestions] = useState<Suggestion[]>([
    {
      id: 'sug-1',
      title: 'Compress System Context for Review Guard',
      type: 'Prompt Optimization',
      description: 'Trim repetitive API schema definitions in system instructions and leverage dynamic schema diffing.',
      impact: 'High',
      savings: '$340 / mo (420k tokens/day)',
    },
    {
      id: 'sug-2',
      title: 'Deduplicate Repeated AST Parsing Mistakes',
      type: 'AST Cache',
      description: 'Repeated JSX syntax parsing on unchanged dependency chunks detected across 14 PR runs.',
      impact: 'Medium',
      savings: '$110 / mo (180k tokens/day)',
    },
    {
      id: 'sug-3',
      title: 'Model Routing: Switch Low-Severity to Flash/Haiku',
      type: 'Model Selection',
      description: 'Route markdown formatting and docstring validations to lightweight models with 0% precision loss.',
      impact: 'High',
      savings: '$520 / mo (890k tokens/day)',
    },
  ]);

  const refreshScan = (): void => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <Container className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AI Anomaly & Token Waste Radar
            </h1>
            <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              Active Intelligence
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Detect context token waste, prompt drifts, and repeated model mistakes across AI-assisted code workflows.
          </p>
        </div>
        <Button onClick={refreshScan} disabled={loading} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Scan AI Workloads'}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Token Waste Rate</span>
              <Zap className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">14.2%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Reduced from 28.5% last month</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Monthly Cost Savings</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">$970 / mo</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Realized through prompt pruning</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Anomalies Detected</span>
              <BrainCircuit className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">4 Patterns</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">0 critical hallucination loops</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Token Efficiency Score</span>
              <TrendingDown className="w-4 h-4 text-cyan-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">88 / 100</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Top 10% benchmark rank</CardContent>
        </Card>
      </div>

      {/* Recommendations & Optimization Cards */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <div>
              <CardTitle>Autonomous Optimization Suggestions</CardTitle>
              <CardDescription>Actionable recommendations to minimize AI costs while maximizing review accuracy.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{sug.title}</h3>
                    <Badge variant="outline" className="text-xs">{sug.type}</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">{sug.impact} Impact</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{sug.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Est. Savings</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{sug.savings}</span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 border-slate-300 dark:border-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    Apply Fix
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
