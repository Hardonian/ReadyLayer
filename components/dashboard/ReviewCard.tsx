/**
 * ReviewCard Component
 *
 * P3-FIX: Memoized review card to prevent unnecessary re-renders
 * Each card only re-renders when its own review data changes
 */

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Clock,
} from 'lucide-react';
import { staggerItem } from '@/lib/design/motion';

export interface ReviewCardProps {
  review: {
    id: string;
    repositoryId: string;
    prNumber: number;
    status: string;
    isBlocked: boolean;
    summary?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    createdAt: string;
  };
}

const ReviewCard = memo(({ review }: ReviewCardProps) => {
  return (
    <motion.div key={review.id} variants={staggerItem} role="listitem">
      <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <Link
            href={`/dashboard/reviews/${review.id}`}
            className="block"
            aria-label={`View review for PR #${review.prNumber}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">
                    PR #{review.prNumber}
                  </h3>
                  {review.isBlocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-destructive/10 text-destructive rounded border border-destructive/20">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-success-muted text-success rounded border border-success/20">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      ReadyLayer Verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded border border-primary/20">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    Certificate Available
                  </span>
                </div>
                {review.summary && (
                  <div className="flex items-center gap-4 text-sm text-text-muted mb-2">
                    {review.summary.critical > 0 && (
                      <span className="text-destructive">
                        {review.summary.critical} critical
                      </span>
                    )}
                    {review.summary.high > 0 && (
                      <span className="text-orange-600">
                        {review.summary.high} high
                      </span>
                    )}
                    {review.summary.medium > 0 && (
                      <span className="text-warning">
                        {review.summary.medium} medium
                      </span>
                    )}
                    {review.summary.low > 0 && (
                      <span className="text-info">
                        {review.summary.low} low
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <time dateTime={review.createdAt}>
                    {new Date(review.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
