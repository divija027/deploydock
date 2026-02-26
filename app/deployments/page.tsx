'use client';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetch('/api/deployments')
      .then(r => r.json())
      .then(d => { setDeployments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Deploy History</h1>
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
