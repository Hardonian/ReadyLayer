'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface ModelComparison {
  modelA: string;
  modelB: string;
  agreementRate: number; // e.g., 0.94 -> 94%
  findingsDivergence: number; // percentage difference in issue counts
  severityCorrelation: number; // 0.0 to 1.0
  sampleDivergencePrompt: string;
}

const MODELS = ['Claude 3.5 Sonnet', 'GPT-4o', 'Gemini 2.0 Flash', 'DeepSeek R1'];

const PAIRWISE_DATA: Record<string, ModelComparison> = {
  'Claude 3.5 Sonnet:GPT-4o': {
    modelA: 'Claude 3.5 Sonnet',
    modelB: 'GPT-4o',
    agreementRate: 0.942,
    findingsDivergence: 0.058,
    severityCorrelation: 0.96,
    sampleDivergencePrompt: 'GPT-4o flagged subtle SQL parameter re-assignment as medium risk; Claude categorized as low.',
  },
  'Claude 3.5 Sonnet:Gemini 2.0 Flash': {
    modelA: 'Claude 3.5 Sonnet',
    modelB: 'Gemini 2.0 Flash',
    agreementRate: 0.915,
    findingsDivergence: 0.085,
    severityCorrelation: 0.93,
    sampleDivergencePrompt: 'Gemini flagged missing TypeScript return types as critical violation; Claude marked as warning.',
  },
  'Claude 3.5 Sonnet:DeepSeek R1': {
    modelA: 'Claude 3.5 Sonnet',
    modelB: 'DeepSeek R1',
    agreementRate: 0.887,
    findingsDivergence: 0.113,
    severityCorrelation: 0.89,
    sampleDivergencePrompt: 'DeepSeek detected algorithmic complexity degradation (O(n²) loop) not flagged by Claude.',
  },
  'GPT-4o:Gemini 2.0 Flash': {
    modelA: 'GPT-4o',
    modelB: 'Gemini 2.0 Flash',
    agreementRate: 0.928,
    findingsDivergence: 0.072,
    severityCorrelation: 0.94,
    sampleDivergencePrompt: 'Both models agreed on all 24 OWASP Top 10 vulnerabilities; disagreed on naming conventions.',
  },
  'GPT-4o:DeepSeek R1': {
    modelA: 'GPT-4o',
    modelB: 'DeepSeek R1',
    agreementRate: 0.894,
    findingsDivergence: 0.106,
    severityCorrelation: 0.91,
    sampleDivergencePrompt: 'DeepSeek reasoning trace caught race condition in async lock; GPT-4o marked safe.',
  },
  'Gemini 2.0 Flash:DeepSeek R1': {
    modelA: 'Gemini 2.0 Flash',
    modelB: 'DeepSeek R1',
    agreementRate: 0.879,
    findingsDivergence: 0.121,
    severityCorrelation: 0.88,
    sampleDivergencePrompt: 'DeepSeek R1 surfaced memory leak in worker thread; Gemini flagged error handling format.',
  },
};

export function VarianceHeatmap(): React.JSX.Element {
  const [selectedPair, setSelectedPair] = useState<ModelComparison | null>(
    PAIRWISE_DATA['Claude 3.5 Sonnet:GPT-4o']
  );

  const getCellData = (m1: string, m2: string): ModelComparison | null => {
    if (m1 === m2) return null;
    const key1 = `${m1}:${m2}`;
    const key2 = `${m2}:${m1}`;
    return PAIRWISE_DATA[key1] || PAIRWISE_DATA[key2] || null;
  };

  const getColorClass = (agreement: number): string => {
    if (agreement >= 0.93) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
    if (agreement >= 0.90) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30';
    if (agreement >= 0.85) return 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30';
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Multi-Model Variance &amp; Agreement Matrix
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs">
                Ensemble Observability
              </Badge>
            </div>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Pairwise severity consensus, false-positive variance, and reasoning divergence across 4 leading foundation models.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> &gt;93% Consensus
            </span>
            <span className="flex items-center gap-1 text-cyan-400 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> 90-93%
            </span>
            <span className="flex items-center gap-1 text-amber-400 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> &lt;90%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Model Pair
                </th>
                {MODELS.map((model) => (
                  <th key={model} className="p-3 text-xs font-semibold text-slate-300 font-mono">
                    {model}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODELS.map((rowModel) => (
                <tr key={rowModel} className="border-t border-slate-800/80">
                  <td className="p-3 text-left font-mono text-xs font-semibold text-slate-300 whitespace-nowrap">
                    {rowModel}
                  </td>
                  {MODELS.map((colModel) => {
                    const comparison = getCellData(rowModel, colModel);
                    if (!comparison) {
                      return (
                        <td key={colModel} className="p-3 text-center">
                          <span className="text-slate-600 text-xs font-mono">—</span>
                        </td>
                      );
                    }

                    const isSelected =
                      selectedPair &&
                      ((selectedPair.modelA === rowModel && selectedPair.modelB === colModel) ||
                        (selectedPair.modelA === colModel && selectedPair.modelB === rowModel));

                    return (
                      <td key={colModel} className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPair(comparison)}
                          className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${getColorClass(
                            comparison.agreementRate
                          )} ${isSelected ? 'ring-2 ring-indigo-500 scale-[1.03] shadow-lg' : ''}`}
                        >
                          {(comparison.agreementRate * 100).toFixed(1)}%
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Pair Breakdown */}
        {selectedPair && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">Comparison Deep-Dive:</span>
                <Badge variant="secondary" className="font-mono text-xs bg-slate-800 text-indigo-300">
                  {selectedPair.modelA} <span className="text-slate-500 mx-1">vs</span> {selectedPair.modelB}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">
                  Consensus Agreement: <strong className="text-emerald-400">{(selectedPair.agreementRate * 100).toFixed(1)}%</strong>
                </span>
                <span className="text-slate-400">
                  Findings Divergence: <strong className="text-amber-400">{(selectedPair.findingsDivergence * 100).toFixed(1)}%</strong>
                </span>
                <span className="text-slate-400">
                  Severity Correlation: <strong className="text-cyan-400">{(selectedPair.severityCorrelation * 100).toFixed(0)}%</strong>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-indigo-400" /> Recent Divergence Case Study:
              </div>
              <p className="text-slate-400 pl-5 text-xs font-mono">{selectedPair.sampleDivergencePrompt}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Deterministic policy runner normalizes findings across models before gate evaluation.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
                onClick={() => setSelectedPair(PAIRWISE_DATA['Claude 3.5 Sonnet:GPT-4o'])}
              >
                Reset Selection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
