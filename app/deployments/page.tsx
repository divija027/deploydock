'use client';
import { useEffect, useRef, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface Deployment {
  id: string;
  appName: string;
  imageTag: string;
  status: string;
  triggeredBy: string;
  logs: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

const statusVariant: Record<string, 'default' | 'destructive' | 'secondary'> = {
  success: 'default',
  failed: 'destructive',
  building: 'secondary',
};

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const streamsRef = useRef<Map<string, EventSource>>(new Map());

  useEffect(() => {
    fetch('/api/deployments')
      .then(r => r.json())
      .then(d => { setDeployments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const buildingIds = new Set(deployments.filter(d => d.status === 'building').map(d => d.id));

    // Start new streams
    for (const id of buildingIds) {
      if (streamsRef.current.has(id)) continue;
      const es = new EventSource(`/api/deployments/${id}/stream`);
      streamsRef.current.set(id, es);

      es.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg?.error) return;

        setDeployments(prev =>
          prev.map(p => p.id !== id ? p : ({
            ...p,
            status: msg.status ?? p.status,
            logs: typeof msg.logs === 'string' ? msg.logs : p.logs,
          }))
        );

        if (msg?.done) {
          es.close();
          streamsRef.current.delete(id);
        }
      };

      es.onerror = () => {
        es.close();
        streamsRef.current.delete(id);
      };
    }

    // Stop streams that are no longer building
    for (const [id, es] of streamsRef.current) {
      if (buildingIds.has(id)) continue;
      es.close();
      streamsRef.current.delete(id);
    }
  }, [deployments]);

  useEffect(() => {
    return () => {
      for (const es of streamsRef.current.values()) es.close();
      streamsRef.current.clear();
    };
  }, []);

  const triggerManualDeploy = async (appName: string) => {
    setDeploying(appName);
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Failed to trigger deploy');

      const list = await fetch('/api/deployments').then(r => r.json());
      setDeployments(list);
    } catch {
      // Ignore UI errors for now; backend returns details
    } finally {
      setDeploying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Deploy History</h1>
          <Button
            variant="secondary"
            onClick={() => {
              setLoading(true);
              fetch('/api/deployments')
                .then(r => r.json())
                .then(d => { setDeployments(d); setLoading(false); })
                .catch(() => setLoading(false));
            }}
          >
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading deployments...</p>
        ) : deployments.length === 0 ? (
          <p className="text-muted-foreground">No deployments yet. Push to a connected repo to trigger a deploy.</p>
        ) : (
          <div className="space-y-2">
            {deployments.map(d => (
              <details key={d.id} className="border rounded-lg p-4">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[d.status] ?? 'secondary'}>{d.status}</Badge>
                    <span className="font-mono text-sm">{d.appName}</span>
                    <span className="text-muted-foreground text-xs">{d.imageTag}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{d.triggeredBy === 'webhook' ? 'webhook' : 'manual'}</span>
                    <span>{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</span>
                    {d.user && <span>by {d.user.name}</span>}
                  </div>
                </summary>
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deploying === d.appName}
                    onClick={(e) => { e.preventDefault(); triggerManualDeploy(d.appName); }}
                  >
                    {deploying === d.appName ? 'Deploying…' : 'Deploy again'}
                  </Button>
                </div>
                {d.logs && (
                  <pre className="mt-3 bg-black text-green-400 text-xs p-3 rounded overflow-auto max-h-48 font-mono">
                    {d.logs}
                  </pre>
                )}
              </details>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
