/**
 * Readiness Command Center Dashboard
 * 
 * Makes ReadyLayer operationally indispensable with:
 * - AI-touched diff percentage
 * - Risk score trend
 * - Gate pass/fail rates
 * - Coverage deltas
 * - Doc drift incidents
 * - Mean time to safe merge
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsCard } from '@/components/ui/metrics-card';

export interface ReadinessMetrics {
  aiTouchedPercentage: number;
  riskScoreTrend: number; // -1 to 1 (negative = improving)
  gatePassRate: number;
  coverageDelta: number;
  docDriftIncidents: number;
  meanTimeToSafeMerge: number; // minutes
}

export interface ReadinessCommandCenterProps {
  organizationId: string;
  repositoryId?: string;
}

export function ReadinessCommandCenter({
  organizationId,
  repositoryId,
}: ReadinessCommandCenterProps) {
  const [metrics, setMetrics] = useState<ReadinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch metrics from API
        const url = repositoryId
          ? `/api/v1/metrics?organizationId=${organizationId}&repositoryId=${repositoryId}`
          : `/api/v1/metrics?organizationId=${organizationId}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch metrics');

        const data = await response.json();
        setMetrics(data.metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [organizationId, repositoryId]);

  if (loading) {
    return <div className="p-6">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="p-6">No metrics available</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Readiness Command Center</h1>
        <p className="text-muted-foreground mt-2">
          Operational intelligence for AI-safe code delivery
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gates">Gates</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricsCard
              title="AI-Touched Diff %"
              value={`${(metrics.aiTouchedPercentage * 100).toFixed(1)}%`}
              change={{
                value: metrics.aiTouchedPercentage * 100,
                label: 'of diffs',
                trend: metrics.aiTouchedPercentage > 0.5 ? 'up' : 'down',
              }}
              description="Percentage of diffs touched by AI"
            />
            <MetricsCard
              title="Gate Pass Rate"
              value={`${(metrics.gatePassRate * 100).toFixed(1)}%`}
              change={{
                value: metrics.gatePassRate * 100,
                label: 'pass rate',
                trend: metrics.gatePassRate > 0.8 ? 'up' : 'down',
              }}
              description="Percentage of PRs passing all gates"
            />
            <MetricsCard
              title="Mean Time to Safe Merge"
              value={`${metrics.meanTimeToSafeMerge.toFixed(0)} min`}
              change={{
                value: metrics.meanTimeToSafeMerge,
                label: 'minutes',
                trend: metrics.meanTimeToSafeMerge < 30 ? 'down' : 'up',
              }}
              description="Average time from PR open to safe merge"
            />
            <MetricsCard
              title="Coverage Delta"
              value={`${metrics.coverageDelta > 0 ? '+' : ''}${metrics.coverageDelta.toFixed(1)}%`}
              change={{
                value: metrics.coverageDelta,
                label: 'change',
                trend: metrics.coverageDelta > 0 ? 'up' : 'down',
              }}
              description="Change in test coverage"
            />
            <MetricsCard
              title="Doc Drift Incidents"
              value={metrics.docDriftIncidents.toString()}
              description="Documentation drift incidents"
            />
            <MetricsCard
              title="Risk Score Trend"
              value={metrics.riskScoreTrend > 0 ? 'Increasing' : 'Decreasing'}
              change={{
                value: Math.abs(metrics.riskScoreTrend * 100),
                label: 'trend',
                trend: metrics.riskScoreTrend < 0 ? 'down' : 'up',
              }}
              description="Risk score trend (negative = improving)"
            />
          </div>
        </TabsContent>

        <TabsContent value="gates">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Gate Performance</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Review Guard</span>
                  <span className="font-mono">
                    {metrics.gatePassRate > 0.9 ? '✓' : '⚠'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.gatePassRate * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Trends</h2>
            <p className="text-muted-foreground">
              Trend visualization would go here (charts, graphs)
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Risk Analysis</h2>
            <p className="text-muted-foreground">
              Risk analysis and recommendations would go here
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
