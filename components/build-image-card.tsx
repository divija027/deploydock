'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BuildImageCard() {
  const [imageName, setImageName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const pullImage = async () => {
    if (!imageName.trim()) return;
    setPulling(true);
    setLogs([]);

    try {
      const res = await fetch('/api/docker/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: imageName }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                setLogs(prev => [...prev, 'Pull complete!']);
              } else if (data.error) {
                setLogs(prev => [...prev, `Error: ${data.error}`]);
              } else if (data.status) {
                const msg = data.id
                  ? `${data.id}: ${data.status}`
                  : data.status;
                setLogs(prev => [...prev.slice(-49), msg]);
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      }
    } catch {
      setLogs(prev => [...prev, 'Failed to pull image']);
    } finally {
      setPulling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pull Image
        </CardTitle>
        <CardDescription>Pull Docker images from Docker Hub</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="image-name">Image Name</Label>
          <Input
            id="image-name"
            placeholder="e.g. nginx:latest, postgres:16-alpine"
            value={imageName}
            onChange={e => setImageName(e.target.value)}
          />
        </div>
        <Button className="w-full" onClick={pullImage} disabled={pulling || !imageName.trim()}>
          {pulling ? 'Pulling...' : 'Pull Image'}
        </Button>
        {logs.length > 0 && (
          <ScrollArea className="h-32 rounded-md border bg-black p-2">
            <div className="text-xs font-mono text-green-400">
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
