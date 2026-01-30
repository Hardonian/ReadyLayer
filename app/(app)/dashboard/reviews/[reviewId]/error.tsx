'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to observability service
    console.error('Review page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Failed to Load Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an error while loading this review. The review may not exist, or you may not have permission to view it.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="rounded-lg bg-muted p-4">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto">{error.message}</pre>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground">Error ID: {error.digest}</p>
              )}
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={() => reset()} variant="default">
              Try Again
            </Button>
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => (window.location.href = '/dashboard/reviews')} variant="ghost">
              View All Reviews
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
