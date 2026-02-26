'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateGallery } from '@/components/template-gallery';
import type { AppTemplate } from '@/lib/templates';

export function RunContainerCard() {
  const [containerName, setContainerName] = useState('');
  const [image, setImage] = useState('');
  const [hostPort, setHostPort] = useState('');
  const [containerPort, setContainerPort] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTemplateSelect = (template: AppTemplate) => {
    setContainerName(template.id);
    setImage(template.image);
    const firstPort = Object.entries(template.ports)[0];
    if (firstPort) {
      setContainerPort(firstPort[0].replace('/tcp', ''));
      setHostPort(firstPort[1][0].HostPort);
    }
    setEnvVars(template.env.map(e => `${e.key}=${e.value}`).join('\n'));
  };

  const runContainer = async () => {
    if (!image.trim()) return;
    setRunning(true);
    setResult(null);

    try {
      const env = envVars.split('\n').filter(l => l.includes('='));
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      if (hostPort && containerPort) {
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort }];
      }

      const res = await fetch('/api/docker/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          name: containerName || undefined,
          env,
          portBindings,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Container started: ${data.name ?? data.id}`);
        setContainerName('');
        setImage('');
        setHostPort('');
        setContainerPort('');
        setEnvVars('');
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult('Failed to create container');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Run Container
        </CardTitle>
        <CardDescription>Create and start a new container</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="custom">
          <TabsList className="mb-4">
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="run-image">Image</Label>
              <Input
                id="run-image"
                placeholder="e.g. nginx:latest"
                value={image}
                onChange={e => setImage(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="run-name">Container Name (optional)</Label>
              <Input
                id="run-name"
                placeholder="my-container"
                value={containerName}
                onChange={e => setContainerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="host-port">Host Port</Label>
                <Input
                  id="host-port"
                  placeholder="8080"
                  value={hostPort}
                  onChange={e => setHostPort(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="container-port">Container Port</Label>
                <Input
                  id="container-port"
                  placeholder="80"
                  value={containerPort}
                  onChange={e => setContainerPort(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="env">Env Vars (one per line: KEY=value)</Label>
              <textarea
                id="env"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                placeholder="NODE_ENV=production"
                value={envVars}
                onChange={e => setEnvVars(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={runContainer} disabled={running || !image.trim()}>
              {running ? 'Starting...' : 'Run Container'}
            </Button>
            {result && (
              <p className={`text-sm ${result.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                {result}
              </p>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateGallery onSelect={handleTemplateSelect} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
