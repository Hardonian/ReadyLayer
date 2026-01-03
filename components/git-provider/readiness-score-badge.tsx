/**
 * Readiness Score Badge
 * 
 * Displays repository readiness score in PR context.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface ReadinessScoreBadgeProps {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
}

export function ReadinessScoreBadge({
  score,
  level,
  trend,
}: ReadinessScoreBadgeProps) {
  const levelColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  const trendIcons = {
    improving: TrendingUp,
    stable: Minus,
    declining: TrendingDown,
  };

  const TrendIcon = trendIcons[trend];

  return (
    <Badge className={`${levelColors[level]} text-white`}>
      <TrendIcon className="mr-1 h-3 w-3" />
      Readiness: {score}/100 ({level})
    </Badge>
  );
}
