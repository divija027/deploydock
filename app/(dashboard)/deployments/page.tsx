'use client';
import { useEffect, useRef, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, RefreshCw, Webhook, User } from 'lucide-react';
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

const statusStyles: Record<string, string> = {
  success: 'bg-green-500/15 text-green-500 border-green-500/30',
  failed: 'bg-red-500/15 text-red-500 border-red-500/30',
  building: 'bg-blue-500/15 text-blue-500 border-blue-500/30 animate-pulse-dot',
};

const statusBorderColor: Record<string, string> = {
  success: 'before:bg-green-500',
  failed: 'before:bg-red-500',
  building: 'before:bg-blue-500',
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
      // Ignore UI errors for now
    } finally {
      setDeploying(null);
    }
  };

  const refreshDeployments = () => {
    setLoading(true);
    fetch('/api/deployments')
      .then(r => r.json())
      .then(d => { setDeployments(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto p-4 md:p-6">
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Deploy History</h1>
              <p className="text-muted-foreground text-sm mt-1">View and manage your deployment pipeline</p>
            </div>
            <Button variant="outline" size="sm" onClick={refreshDeployments}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Rocket className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No deployments yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Push to a connected repo to trigger a deploy.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {deployments.map(d => (
                <AccordionItem
                  key={d.id}
                  value={d.id}
                  className={`border rounded-lg px-4 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-lg ${statusBorderColor[d.status] ?? 'before:bg-gray-500'}`}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={statusStyles[d.status] ?? 'bg-muted text-muted-foreground'}>
                          {d.status}
                        </Badge>
                        <span className="font-mono text-sm">{d.appName}</span>
                        <span className="text-muted-foreground text-xs hidden sm:inline">{d.imageTag}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="hidden sm:flex items-center gap-1">
                          {d.triggeredBy === 'webhook' ? <Webhook className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {d.triggeredBy === 'webhook' ? 'webhook' : 'manual'}
                        </span>
                        <span>{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</span>
                        {d.user && <span className="hidden md:inline">by {d.user.name}</span>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-center justify-end mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deploying === d.appName}
                        onClick={(e) => { e.preventDefault(); triggerManualDeploy(d.appName); }}
                      >
                        {deploying === d.appName ? 'Deploying...' : 'Deploy again'}
                      </Button>
                    </div>
                    {d.logs && (
                      <ScrollArea className="h-48 rounded-md border bg-zinc-950 p-3">
                        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                          {d.logs}
                        </pre>
                      </ScrollArea>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </main>
    </div>
  );
}
