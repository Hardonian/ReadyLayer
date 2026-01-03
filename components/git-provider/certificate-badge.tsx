/**
 * Merge Confidence Certificate Badge
 * 
 * Displays ReadyLayer certificate status in PR context.
 * Makes absence of ReadyLayer review visible.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export interface CertificateBadgeProps {
  certificateId?: string;
  readinessLevel: 'ready' | 'needs_review' | 'blocked';
  confidenceScore: number;
  showDetails?: boolean;
}

export function CertificateBadge({
  certificateId,
  readinessLevel,
  confidenceScore,
  showDetails = false,
}: CertificateBadgeProps) {
  if (!certificateId) {
    // No certificate = unreviewed
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
        <AlertCircle className="mr-1 h-3 w-3" />
        Not Reviewed by ReadyLayer
      </Badge>
    );
  }

  const variants = {
    ready: {
      variant: 'default' as const,
      icon: CheckCircle2,
      label: 'AI-Reviewed',
      className: 'bg-green-500 hover:bg-green-600',
    },
    needs_review: {
      variant: 'secondary' as const,
      icon: AlertCircle,
      label: 'Needs Review',
      className: 'bg-yellow-500 hover:bg-yellow-600',
    },
    blocked: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Blocked',
      className: 'bg-red-500 hover:bg-red-600',
    },
  };

  const config = variants[readinessLevel];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
      {showDetails && (
        <span className="ml-2 text-xs opacity-90">
          {confidenceScore}% confidence
        </span>
      )}
    </Badge>
  );
}
