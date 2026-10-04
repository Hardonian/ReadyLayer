/**
 * Readiness Command Center Dashboard
 * 
 * Makes ReadyLayer operationally indispensable with comprehensive metrics
 */

'use client';

import { ReadinessCommandCenter } from '@/components/dashboard/readiness-command-center';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ReadinessPage(): React.JSX.Element {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchOrganizationId(): Promise<void> {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/signin');
          return;
        }

        // Get organization ID from user's memberships
        const response = await fetch('/api/v1/repos?limit=1', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json() as { repositories?: Array<{ id: string }> };
          if (data.repositories && data.repositories.length > 0) {
            // Get org ID from first repo
            const repoResponse = await fetch(`/api/v1/repos/${data.repositories[0].id}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            
            if (repoResponse.ok) {
              const repoData = await repoResponse.json() as { data?: { organizationId: string } };
              if (repoData.data?.organizationId) {
                setOrganizationId(repoData.data.organizationId);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization ID:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchOrganizationId();
  }, [router]);

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

  if (!organizationId) {
    return (
      <Container className="py-8 space-y-6">
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-semibold text-sm text-text-primary">
              Start with an observed baseline
            </div>
            <div className="text-xs text-text-muted">
              Connect a repository to replace setup mode with live governance metrics from your own runs.
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/repos/connect')}
            className="shadow-glow whitespace-nowrap text-xs font-mono"
          >
            Connect Repository
          </Button>
        </div>

        <ReadinessCommandCenter
          organizationName="Your workspace"
        />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <ReadinessCommandCenter organizationId={organizationId} />
    </Container>
  );
}
