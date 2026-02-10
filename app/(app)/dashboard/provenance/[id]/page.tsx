'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Button, ErrorState, Skeleton } from '@/components/ui';
import { Container } from '@/components/ui/container';

interface PackDetail {
  id: string;
  sourceSystem: string;
  source: string;
  payloadHash: string;
  redactionLevel: string;
  promptHashes?: string[];
  toolCallSummary?: { total?: number; byTool?: Record<string, number>; totalDurationMs?: number };
  safeSummary?: { promptCount?: number; transcriptChars?: number; toolCalls?: number };
  payloadAccess: 'redacted' | 'raw';
  payload: Record<string, unknown>;
  artifacts: Array<{ id: string; kind: string; mimeType: string; contentHash: string; content?: string | null; json?: unknown }>;
  createdAt: string;
}

export default function ProvenancePackPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    async function loadPack(): Promise<void> {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`/api/provenance/v1/packs/${id}?raw=${raw}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) throw new Error('Failed to load provenance pack');
        const data = (await response.json()) as { data: PackDetail };
        setPack(data.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    if (id) loadPack();
  }, [id, raw]);

  if (loading) return <Container className="py-8"><Skeleton className="h-96 w-full" /></Container>;
  if (error || !pack) return <Container className="py-8"><ErrorState message={error || 'Not found'} /></Container>;

  return (
    <Container className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Provenance Pack</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setRaw((v) => !v)}>{raw ? 'View redacted' : 'Attempt raw view'}</Button>
          <a href={`/api/provenance/v1/packs/${pack.id}/export?raw=${raw}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Download Evidence ZIP</a>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Source: {pack.sourceSystem} ({pack.source})</div>
          <div>Hash: <code>{pack.payloadHash}</code></div>
          <div>Redaction level: {pack.redactionLevel} • Access: {pack.payloadAccess}</div>
          <div>Tool calls: {pack.toolCallSummary?.total || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payload</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-muted p-3 rounded">{JSON.stringify(pack.payload, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pack.artifacts.length === 0 ? <div className="text-sm text-muted-foreground">No attachments.</div> : pack.artifacts.map((artifact) => (
            <div key={artifact.id} className="border rounded p-3">
              <div className="text-sm font-medium">{artifact.kind} ({artifact.mimeType})</div>
              <div className="text-xs text-muted-foreground">{artifact.contentHash}</div>
              {artifact.json != null ? <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(artifact.json, null, 2) || ""}</pre> : null}
              {artifact.content && <pre className="text-xs mt-2 overflow-auto">{artifact.content}</pre>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Link href="/dashboard/runs" className="text-sm text-primary hover:underline">Back to runs</Link>
    </Container>
  );
}
