/**
 * Readiness Command Center Dashboard
 * 
 * Makes ReadyLayer operationally indispensable with comprehensive metrics
 */

'use client';

import { ReadinessCommandCenter } from '@/components/dashboard/readiness-command-center';
import { Container } from '@/components/ui/container';
import { ErrorState, Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useOrganizationId } from '@/lib/hooks';

export default function ReadinessPage(): React.JSX.Element {
  const {
    organizationId,
    organizationName,
    hasRepositories,
    loading,
    error,
    refetch,
  } = useOrganizationId();
  const router = useRouter();

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <ErrorState
          title="The workspace could not be loaded"
          message={error}
          action={{ label: 'Try again', onClick: refetch }}
          secondaryAction={{
            label: 'Sign in again',
            onClick: () => router.replace('/auth/signin'),
          }}
        />
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-8">
      {!hasRepositories && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-text-primary">
              Start with an observed baseline
            </div>
            <div className="text-xs text-text-muted">
              Connect a repository to replace setup mode with live governance metrics from your own runs.
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/repos/connect')}
            className="whitespace-nowrap text-xs font-mono shadow-glow"
          >
            Connect Repository
          </Button>
        </div>
      )}

      <ReadinessCommandCenter
        organizationId={organizationId ?? undefined}
        organizationName={organizationName ?? 'Your workspace'}
        hasConnectedRepository={hasRepositories}
      />
    </Container>
  );
}
