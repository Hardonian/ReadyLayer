/**
 * Readiness Command Center Dashboard
 * 
 * Makes ReadyLayer operationally indispensable with comprehensive metrics
 */

'use client';

import { ReadinessCommandCenter } from '@/components/dashboard/readiness-command-center';
import { Container } from '@/components/ui/container';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Database } from 'lucide-react';

export default function ReadinessPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchOrganizationId() {
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
          const data = await response.json();
          if (data.repositories && data.repositories.length > 0) {
            // Get org ID from first repo
            const repoResponse = await fetch(`/api/v1/repos/${data.repositories[0].id}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            
            if (repoResponse.ok) {
              const repoData = await repoResponse.json();
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

    fetchOrganizationId();
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
      <Container className="py-8">
        <EmptyState
          icon={Database}
          title="No repositories connected"
          description="Connect a repository to view readiness metrics and command center."
          action={{
            label: 'Connect Repository',
            onClick: () => router.push('/dashboard/repos/connect'),
          }}
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
