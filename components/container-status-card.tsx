'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, RefreshCw, Play, Square, RotateCw, Trash2, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContainerLogs } from '@/components/container-logs';
import { MetricsChart } from '@/components/metrics-chart';
import { EnvVarsEditor } from '@/components/env-vars-editor';
import { AppConfigEditor } from '@/components/app-config-editor';

interface Container {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: string }>;
  Created: number;
}

const stateColors: Record<string, string> = {
  running: 'bg-green-500',
  exited: 'bg-red-500',
  paused: 'bg-yellow-500',
  created: 'bg-gray-500',
  restarting: 'bg-blue-500',
  dead: 'bg-red-800',
};

export function ContainerStatusCard() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/docker/containers');
      if (res.ok) {
        const data = await res.json();
        setContainers(data);
      }
    } catch {
      // Docker may be unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const es = new EventSource('/api/docker/events');

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        fetchContainers();
      }, 350);
    };

    es.onmessage = (event) => {
      const evt = JSON.parse(event.data);
      const type = evt?.Type;
      if (type === 'container' || type === 'image' || type === 'network') scheduleRefresh();
    };
    es.onerror = () => {
      // Fall back to periodic refresh if events are unavailable
      if (!refreshTimerRef.current) refreshTimerRef.current = window.setTimeout(fetchContainers, 2000);
      es.close();
    };

    return () => {
      es.close();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [fetchContainers]);

  const containerAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      await fetch(`/api/docker/containers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchContainers();
    } catch {
      // Handle error
    } finally {
      setActionLoading(null);
    }
  };

  const deleteContainer = async (id: string) => {
    setActionLoading(`${id}-delete`);
    try {
      await fetch(`/api/docker/containers/${id}`, { method: 'DELETE' });
      await fetchContainers();
    } catch {
      // Handle error
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Container Status
            </CardTitle>
            <CardDescription>
              {containers.length} container{containers.length !== 1 ? 's' : ''} total
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchContainers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading containers...</div>
          ) : containers.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No containers found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Run a container to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {containers.map(c => {
                const name = c.Names[0]?.replace('/', '') ?? c.Id.slice(0, 12);
                const ports = c.Ports.filter(p => p.PublicPort)
                  .map(p => `${p.PublicPort}:${p.PrivatePort}`)
                  .join(', ');

                return (
                  <div
                    key={c.Id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${stateColors[c.State] ?? 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{name}</span>
                        <Badge variant="outline" className="text-xs">{c.State}</Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="truncate">{c.Image}</span>
                        {ports && <span>| {ports}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setSelectedContainer(c)}
                        title="Details"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {c.State === 'running' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={actionLoading === `${c.Id}-stop`}
                          onClick={() => containerAction(c.Id, 'stop')}
                          title="Stop"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={actionLoading === `${c.Id}-start`}
                          onClick={() => containerAction(c.Id, 'start')}
                          title="Start"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={actionLoading === `${c.Id}-restart`}
                        onClick={() => containerAction(c.Id, 'restart')}
                        title="Restart"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={actionLoading === `${c.Id}-delete`}
                        onClick={() => deleteContainer(c.Id)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedContainer && (
        <Dialog open onOpenChange={() => setSelectedContainer(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedContainer.Names[0]?.replace('/', '') ?? selectedContainer.Id.slice(0, 12)}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="logs">
              <TabsList>
                <TabsTrigger value="logs">
                  <FileText className="h-4 w-4 mr-1" /> Logs
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <BarChart3 className="h-4 w-4 mr-1" /> Metrics
                </TabsTrigger>
                <TabsTrigger value="env">
                  Environment
                </TabsTrigger>
              </TabsList>
              <TabsContent value="logs">
                <ContainerLogs containerId={selectedContainer.Id} />
              </TabsContent>
              <TabsContent value="metrics">
                {selectedContainer.State === 'running' ? (
                  <MetricsChart containerId={selectedContainer.Id} />
                ) : (
                  <p className="text-muted-foreground py-8 text-center">
                    Container must be running to view metrics
                  </p>
                )}
              </TabsContent>
              <TabsContent value="env">
                <div className="space-y-4">
                  <AppConfigEditor
                    appName={selectedContainer.Names[0]?.replace('/', '') ?? selectedContainer.Id.slice(0, 12)}
                  />
                  <EnvVarsEditor
                    appName={selectedContainer.Names[0]?.replace('/', '') ?? selectedContainer.Id.slice(0, 12)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
