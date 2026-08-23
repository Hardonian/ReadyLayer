'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Layers, Trophy, Split, Plus, ChevronRight } from 'lucide-react';

interface Experiment {
  id: string;
  name: string;
  modelA: string;
  modelB: string;
  trafficSplit: number;
  status: 'running' | 'paused' | 'completed';
  sampleSize: number;
  confidence: number;
  winner?: string;
  primaryMetric: string;
}

export default function ModelExperimentsDashboard(): React.JSX.Element {
  const [experiments] = useState<Experiment[]>([
    {
      id: 'exp-1',
      name: 'Claude 3.7 vs Claude 3.5 Sonnet Policy Reasoning',
      modelA: 'claude-3-5-sonnet-20241022',
      modelB: 'claude-3-7-sonnet-20250219',
      trafficSplit: 0.5,
      status: 'running',
      sampleSize: 1420,
      confidence: 0.98,
      winner: 'Variant B (Claude 3.7)',
      primaryMetric: 'Policy Precision (F1 Score)',
    },
    {
      id: 'exp-2',
      name: 'DeepSeek-R1 vs GPT-4o Static Analysis Verification',
      modelA: 'gpt-4o-2024-11-20',
      modelB: 'deepseek-r1-distill-qwen-32b',
      trafficSplit: 0.3,
      status: 'running',
      sampleSize: 840,
      confidence: 0.91,
      primaryMetric: 'False Positive Reduction Rate',
    },
    {
      id: 'exp-3',
      name: 'Local OSS vLLM vs Cloud API DocSync',
      modelA: 'cloud-llm-standard',
      modelB: 'local-mistral-large-2407',
      trafficSplit: 0.5,
      status: 'completed',
      sampleSize: 3200,
      confidence: 0.99,
      winner: 'Variant A (Cloud API)',
      primaryMetric: 'Doc Drift Prevention Accuracy',
    },
  ]);

  return (
    <Container className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Model Registry &amp; A/B Experiments
            </h1>
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
              Multi-Provider Routing
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Split traffic across model versions, test statistical significance, and promote winning models without downtime.
          </p>
        </div>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4" />
          Create Experiment
        </Button>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Active Experiments</span>
              <Split className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">2 Running</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">1 completed this month</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Registered Versions</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">12 Models</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Claude, GPT-4o, DeepSeek, Local</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Significance Threshold</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">p &lt; 0.05</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">95% statistical confidence</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Dynamic Routing</span>
              <GitBranch className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Zero-Downtime</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Hot traffic re-balancing</CardContent>
        </Card>
      </div>

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.map((exp) => (
          <Card key={exp.id} className="border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{exp.name}</h3>
                    {exp.status === 'running' ? (
                      <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-xs">Active Experiment</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Completed</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">A: {exp.modelA}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">B: {exp.modelB}</span>
                    <span>Traffic Split: {(1 - exp.trafficSplit) * 100}% / {exp.trafficSplit * 100}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                  <div>
                    <span className="text-xs text-slate-500 block">Sample Size</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">{exp.sampleSize} PRs</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Confidence</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{(exp.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {exp.winner && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Winner</span>
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
                        {exp.winner}
                      </Badge>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                    Details
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
