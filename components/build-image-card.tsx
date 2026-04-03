'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { ImageCombobox } from '@/components/image-combobox';
import { PullProgress } from '@/components/pull-progress';

interface PullEvent {
  status?: string;
  id?: string;
  progressDetail?: { current?: number; total?: number };
  progress?: string;
  error?: string;
  done?: boolean;
}

export function BuildImageCard() {
  const [imageName, setImageName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [events, setEvents] = useState<PullEvent[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const pulledNameRef = useRef('');

  const pullImage = async () => {
    if (!imageName.trim()) return;
    setPulling(true);
    setEvents([]);
    setShowProgress(true);
    pulledNameRef.current = imageName;

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
              setEvents(prev => [...prev, data]);
            } catch {
              // Skip malformed lines
            }
          }
        }
      }
    } catch {
      setEvents(prev => [...prev, { error: 'Failed to pull image' }]);
    } finally {
      setPulling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Pull Image
        </CardTitle>
        <CardDescription>Pull Docker images from Docker Hub</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>Image Name</Label>
          <ImageCombobox
            mode="registry"
            value={imageName}
            onValueChange={setImageName}
            placeholder="Browse popular images or type any name..."
            disabled={pulling}
          />
        </div>
        <Button className="w-full" onClick={pullImage} disabled={pulling || !imageName.trim()}>
          {pulling ? 'Pulling...' : 'Pull Image'}
        </Button>
        {showProgress && (
          <PullProgress imageName={pulledNameRef.current} events={events} />
        )}
      </CardContent>
    </Card>
  );
}
