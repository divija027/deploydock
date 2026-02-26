'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Terminal, CheckCircle, Loader2 } from 'lucide-react';

const quickPulls = [
  { label: 'Pull nginx', image: 'nginx:alpine' },
  { label: 'Pull Redis', image: 'redis:7-alpine' },
  { label: 'Pull Node.js', image: 'node:20-alpine' },
  { label: 'Pull PostgreSQL', image: 'postgres:16-alpine' },
];

export function QuickStartCard() {
  const [pulling, setPulling] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const pullImage = async (image: string) => {
    setPulling(image);
    try {
      const res = await fetch('/api/docker/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: image }),
      });

      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const { done: readerDone } = await reader.read();
          if (readerDone) break;
        }
      }
      setDone(prev => new Set(prev).add(image));
    } catch {
      // Handle error
    } finally {
      setPulling(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Quick Start
        </CardTitle>
        <CardDescription>Pull popular images with one click</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickPulls.map(({ label, image }) => (
            <Button
              key={image}
              className="flex items-center gap-2"
              variant={done.has(image) ? 'secondary' : 'default'}
              disabled={pulling !== null}
              onClick={() => pullImage(image)}
            >
              {pulling === image ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done.has(image) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
